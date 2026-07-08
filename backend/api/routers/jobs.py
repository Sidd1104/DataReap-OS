"""
Jobs Router — manage enrichment jobs (start, pause, resume, stop, retry, download).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.logging_config import get_logger
from config.settings import get_settings
from db.database import get_db
from db.models.job import Job
from db.repositories.job_repository import JobRepository
from db.repositories.log_repository import LogRepository

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/")
async def list_jobs(
    limit: int = 20,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    repo = JobRepository(session)
    if status:
        jobs = await repo.get_by_status(status)
    else:
        jobs = await repo.get_recent(limit)
    return [_job_to_dict(j) for j in jobs]


@router.get("/stats")
async def job_stats(session: AsyncSession = Depends(get_db)):
    repo = JobRepository(session)
    return await repo.get_stats()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_and_start_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: str = Form(...),
    project_name: str = Form(""),
    config: str = Form("{}"),
    session: AsyncSession = Depends(get_db),
):
    """Upload a dataset file and start an enrichment job."""
    import json

    # Save uploaded file
    upload_dir = settings.uploads_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{file.filename}"
    file_path = upload_dir / safe_filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Parse config
    try:
        job_config = json.loads(config)
    except Exception:
        job_config = {}

    # Read row count from file
    from services.import_export_service import import_export_service
    try:
        rows = await import_export_service.read_file(str(file_path))
        total_rows = len(rows)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot read file: {exc}")

    # Create job record
    job_repo = JobRepository(session)
    job = await job_repo.create(
        project_id=project_id,
        project_name=project_name or project_id,
        filename=safe_filename,
        file_path=str(file_path),
        total_rows=total_rows,
        status="pending",
        config=job_config,
    )

    log_repo = LogRepository(session)
    await log_repo.log(
        "INFO",
        f"Job created: {job.id} | {total_rows} rows | file: {safe_filename}",
        job_id=job.id,
        source="jobs_router",
    )

    # Start enrichment in background
    background_tasks.add_task(_start_job_background, job.id, rows, job_config)

    return {
        "job_id": job.id,
        "filename": safe_filename,
        "total_rows": total_rows,
        "status": "pending",
        "message": f"Job created. Processing {total_rows} rows.",
    }


@router.get("/{job_id}")
async def get_job(job_id: str, session: AsyncSession = Depends(get_db)):
    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job)


@router.post("/{job_id}/pause")
async def pause_job(job_id: str, session: AsyncSession = Depends(get_db)):
    from core.queue_manager import queue_manager
    from core.worker_engine import worker_engine

    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    worker_engine.pause_all()
    await repo.update(job, status="paused")

    log_repo = LogRepository(session)
    await log_repo.log("INFO", "Job paused by user", job_id=job_id, source="jobs_router")

    return {"status": "paused", "job_id": job_id}


@router.post("/{job_id}/resume")
async def resume_job(job_id: str, session: AsyncSession = Depends(get_db)):
    from core.worker_engine import worker_engine

    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    worker_engine.resume_all()
    await repo.update(job, status="running")

    log_repo = LogRepository(session)
    await log_repo.log("INFO", "Job resumed by user", job_id=job_id, source="jobs_router")

    return {"status": "running", "job_id": job_id}


@router.post("/{job_id}/stop")
async def stop_job(job_id: str, session: AsyncSession = Depends(get_db)):
    from core.queue_manager import queue_manager

    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    queue_manager.cancel_job(job_id)
    await repo.update(job, status="cancelled", completed_at=datetime.utcnow())

    log_repo = LogRepository(session)
    await log_repo.log("INFO", "Job cancelled by user", job_id=job_id, source="jobs_router")

    return {"status": "cancelled", "job_id": job_id}


@router.post("/{job_id}/retry-failed")
async def retry_failed_rows(
    job_id: str,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
):
    """Re-enqueue all failed rows for a job."""
    from sqlalchemy import select
    from db.models.row_result import RowResult

    stmt = select(RowResult).where(
        RowResult.job_id == job_id, RowResult.status == "failed"
    )
    result = await session.execute(stmt)
    failed_rows = result.scalars().all()

    if not failed_rows:
        return {"message": "No failed rows found", "retried": 0}

    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    background_tasks.add_task(
        _retry_rows_background,
        job_id,
        [{"row_index": r.row_index, "input_data": r.input_data} for r in failed_rows],
        job.config,
    )

    return {"message": f"Retrying {len(failed_rows)} failed rows", "retried": len(failed_rows)}


@router.get("/{job_id}/download")
async def download_results(job_id: str, format: str = "excel", session: AsyncSession = Depends(get_db)):
    """Generate and download enriched results."""
    from sqlalchemy import select
    from db.models.row_result import RowResult
    from services.import_export_service import import_export_service

    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    stmt = select(RowResult).where(RowResult.job_id == job_id).order_by(RowResult.row_index)
    result = await session.execute(stmt)
    row_results = result.scalars().all()

    if not row_results:
        raise HTTPException(status_code=404, detail="No results to download")

    results_data = [
        {
            "input_data": r.input_data,
            "output_data": r.output_data,
            "confidence_score": r.confidence_score,
            "status": r.status,
            "sources_used": r.sources_used or [],
        }
        for r in row_results
    ]

    output_dir = Path("./outputs")
    output_dir.mkdir(exist_ok=True)
    output_path = str(output_dir / f"job_{job_id}_results")

    final_path = await import_export_service.export_results(
        results_data, output_path, format=format
    )

    return FileResponse(
        path=final_path,
        filename=Path(final_path).name,
        media_type="application/octet-stream",
    )


def _job_to_dict(j: Job) -> dict:
    return {
        "id": j.id,
        "project_id": j.project_id,
        "project_name": j.project_name,
        "filename": j.filename,
        "status": j.status,
        "total_rows": j.total_rows,
        "processed_rows": j.processed_rows,
        "success_rows": j.success_rows,
        "failed_rows": j.failed_rows,
        "progress_pct": j.progress_pct,
        "estimated_seconds_remaining": j.estimated_seconds_remaining,
        "created_at": j.created_at.isoformat(),
        "started_at": j.started_at.isoformat() if j.started_at else None,
        "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        "error_message": j.error_message,
        "output_path": j.output_path,
    }


async def _start_job_background(job_id: str, rows: list, config: dict) -> None:
    """Enqueue all rows into the queue."""
    from core.queue_manager import queue_manager, Priority
    from db.database import get_db_session
    from db.repositories.job_repository import JobRepository
    from db.repositories.log_repository import LogRepository

    async with get_db_session() as session:
        job_repo = JobRepository(session)
        log_repo = LogRepository(session)

        await job_repo.update_progress(job_id, 0, 0, 0, status="running")
        await log_repo.log(
            "INFO",
            f"Enqueuing {len(rows)} rows for job {job_id}",
            job_id=job_id,
            source="jobs_router",
        )

    for idx, row_data in enumerate(rows):
        await queue_manager.enqueue(
            job_id=job_id,
            row_index=idx,
            row_data=dict(row_data),
            config=config,
            priority=Priority.NORMAL,
        )

    logger.info("All rows enqueued", job_id=job_id, total=len(rows))


async def _retry_rows_background(job_id: str, rows: list, config: dict) -> None:
    from core.queue_manager import queue_manager, Priority

    for row in rows:
        await queue_manager.enqueue(
            job_id=job_id,
            row_index=row["row_index"],
            row_data=row["input_data"],
            config=config,
            priority=Priority.HIGH,
            retry_count=0,
        )
