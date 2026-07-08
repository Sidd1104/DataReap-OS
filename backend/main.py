"""
AI Data Enrichment Platform — FastAPI Application Entry Point
Initializes all services, registers routers, and manages lifecycle.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from config.logging_config import configure_logging, get_logger
from config.settings import get_settings

settings = get_settings()
configure_logging(log_level=settings.log_level, log_file=settings.log_file)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    # ── Startup ──────────────────────────────────────────────
    logger.info(
        "Starting AI Data Enrichment Platform",
        env=settings.app_env,
        db=settings.database_url.split("://")[0],
    )

    # Initialize database
    from db.database import init_db
    await init_db()
    logger.info("Database initialized")

    # Load settings from database to override environment variables
    await _load_db_settings()

    # Load project configs from JSON files
    await _load_project_configs()

    # Initialize browser if enabled
    from browser.browser_manager import browser_manager
    if settings.browser_mode_enabled:
        await browser_manager.initialize()

    # Register enrichment task handler in worker engine
    from core.worker_engine import worker_engine
    from services.enrichment_service import enrichment_service
    worker_engine.set_task_handler(enrichment_service.process_task)

    # Start worker pool
    await worker_engine.start()
    logger.info("Worker engine started", concurrency=settings.default_concurrency)

    # Start scheduler
    from core.scheduler import platform_scheduler
    platform_scheduler.set_resume_handler(_resume_interrupted_jobs)
    platform_scheduler.set_file_handler(_handle_discovered_file)
    await platform_scheduler.start()

    logger.info(
        "=== AI Data Enrichment Platform Ready ===",
        port=settings.app_port,
        frontend_url=settings.frontend_url,
    )

    yield  # Application runs here

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("Shutting down AI Data Enrichment Platform")
    await worker_engine.stop()
    await platform_scheduler.stop()

    if settings.browser_mode_enabled:
        await browser_manager.close()

    from db.database import close_db
    await close_db()
    logger.info("Shutdown complete")


async def _load_db_settings() -> None:
    """Load settings from database and update the config Settings singleton."""
    from db.database import get_db_session
    from db.models.app_settings import AppSettingModel
    from config.settings import get_settings
    from utils.encryption import safe_decrypt
    from sqlalchemy import select

    settings_obj = get_settings()
    async with get_db_session() as session:
        stmt = select(AppSettingModel)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        for r in rows:
            val = safe_decrypt(r.value) if r.is_encrypted else r.value
            if hasattr(settings_obj, r.key):
                field_type = settings_obj.model_fields[r.key].annotation
                try:
                    if field_type == bool:
                        cast_val = str(val).lower() in ("true", "1", "yes")
                    elif field_type == int:
                        cast_val = int(val)
                    elif field_type == float:
                        cast_val = float(val)
                    else:
                        cast_val = val
                    setattr(settings_obj, r.key, cast_val)
                except Exception as exc:
                    logger.warning(
                        "Failed to cast database setting",
                        key=r.key,
                        value=val,
                        error=str(exc),
                    )
    logger.info("Settings loaded from database")


async def _handle_discovered_file(file_path: Path) -> None:
    """Process a new file discovered in the watch folder."""
    import asyncio
    from db.database import get_db_session
    from db.repositories.project_repository import ProjectRepository
    from db.repositories.job_repository import JobRepository
    from db.repositories.log_repository import LogRepository
    from services.import_export_service import import_export_service
    from api.routers.jobs import _start_job_background

    # 1. Read row count from file to make sure it's valid
    try:
        rows = await import_export_service.read_file(str(file_path))
        total_rows = len(rows)
    except Exception as exc:
        logger.error(
            "Watch folder file cannot be read",
            path=str(file_path),
            error=str(exc),
        )
        return

    async with get_db_session() as session:
        project_repo = ProjectRepository(session)
        job_repo = JobRepository(session)
        log_repo = LogRepository(session)

        # 2. Match file to a project based on filename prefix / slug
        active_projects = await project_repo.get_active()
        matched_project = None
        filename_lower = file_path.name.lower()

        # Try to find a project slug that is in the filename
        for proj in active_projects:
            if proj.slug.lower() in filename_lower:
                matched_project = proj
                break

        # Fallback: if only one active project exists, use it. Otherwise, use the first.
        if not matched_project and active_projects:
            matched_project = active_projects[0]

        if not matched_project:
            logger.warning(
                "No active projects found for discovered file, skipping",
                filename=file_path.name,
            )
            return

        # 3. Create job record
        job = await job_repo.create(
            project_id=matched_project.slug,
            project_name=matched_project.name,
            filename=file_path.name,
            file_path=str(file_path),
            total_rows=total_rows,
            status="pending",
            config=matched_project.config,
        )

        await log_repo.log(
            "INFO",
            f"Job created from watch folder: {job.id} | {total_rows} rows | file: {file_path.name}",
            job_id=job.id,
            source="scheduler",
        )

        # 4. Start enrichment in background
        asyncio.create_task(_start_job_background(job.id, rows, matched_project.config))



async def _load_project_configs() -> None:
    """Scan the projects/ directory and upsert project configs into the database."""
    import json
    from db.database import get_db_session
    from db.repositories.project_repository import ProjectRepository

    projects_dir = Path("./projects")
    if not projects_dir.exists():
        logger.info("No projects/ directory found, skipping project config load")
        return

    async with get_db_session() as session:
        repo = ProjectRepository(session)
        count = 0
        for json_file in projects_dir.glob("*.json"):
            try:
                config = json.loads(json_file.read_text())
                await repo.upsert_from_config(config)
                count += 1
            except Exception as exc:
                logger.error(
                    "Failed to load project config",
                    file=json_file.name,
                    error=str(exc),
                )
    logger.info("Project configs loaded", count=count)


async def _resume_interrupted_jobs() -> None:
    """Resume any jobs that were in 'running' state when the platform last stopped."""
    from db.database import get_db_session
    from db.repositories.job_repository import JobRepository
    from db.repositories.log_repository import LogRepository
    from services.import_export_service import import_export_service
    from core.queue_manager import queue_manager, Priority

    async with get_db_session() as session:
        job_repo = JobRepository(session)
        log_repo = LogRepository(session)

        running_jobs = await job_repo.get_running_jobs()
        if not running_jobs:
            return

        logger.info("Resuming interrupted jobs", count=len(running_jobs))
        for job in running_jobs:
            try:
                rows = await import_export_service.read_file(job.file_path)
                # Re-enqueue unprocessed rows
                from sqlalchemy import select
                from db.models.row_result import RowResult
                processed_stmt = select(RowResult.row_index).where(
                    RowResult.job_id == job.id
                )
                result = await session.execute(processed_stmt)
                processed_indices = {r[0] for r in result.all()}

                re_enqueued = 0
                for idx, row_data in enumerate(rows):
                    if idx not in processed_indices:
                        await queue_manager.enqueue(
                            job_id=job.id,
                            row_index=idx,
                            row_data=dict(row_data),
                            config=job.config,
                            priority=Priority.NORMAL,
                        )
                        re_enqueued += 1

                await log_repo.log(
                    "INFO",
                    f"Job resumed after restart: {re_enqueued} rows re-enqueued",
                    job_id=job.id,
                    source="startup",
                )
            except Exception as exc:
                logger.error(
                    "Failed to resume job",
                    job_id=job.id,
                    error=str(exc),
                )


# ── FastAPI Application ───────────────────────────────────────

app = FastAPI(
    title="AI Data Enrichment Platform",
    description=(
        "Production-grade AI-powered business data enrichment platform. "
        "Supports multiple datasets, AI providers, and data sources."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Middleware ────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────

from api.routers.projects import router as projects_router
from api.routers.jobs import router as jobs_router
from api.routers.workers import router as workers_router
from api.routers.settings_router import router as settings_router
from api.routers.logs import router as logs_router
from api.routers.analytics import router as analytics_router
from api.routers.stream import router as stream_router

app.include_router(projects_router)
app.include_router(jobs_router)
app.include_router(workers_router)
app.include_router(settings_router)
app.include_router(logs_router)
app.include_router(analytics_router)
app.include_router(stream_router)


# ── Health Check ──────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    from core.worker_engine import worker_engine
    from core.queue_manager import queue_manager
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
        "env": settings.app_env,
        "workers": worker_engine.stats.get("active_workers", 0),
        "queue_size": queue_manager.size,
    }


@app.get("/", tags=["root"])
async def root():
    return JSONResponse(
        content={
            "message": "AI Data Enrichment Platform API",
            "docs": "/api/docs",
            "health": "/health",
        }
    )


# ── Entry Point ───────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.app_port,
        reload=settings.app_env == "development",
        log_level=settings.log_level.lower(),
        access_log=True,
    )
