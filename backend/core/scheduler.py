"""
APScheduler-based job scheduler.
Supports:
- Watch folder for new dataset files
- Resume interrupted jobs on startup
- Scheduled recurring enrichment runs
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Callable, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config.logging_config import get_logger
from config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


class PlatformScheduler:
    """Platform scheduler wrapping APScheduler."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler(
            timezone=settings.scheduler_timezone,
        )
        self._started = False
        self._on_file_discovered: Optional[Callable] = None
        self._on_resume_jobs: Optional[Callable] = None

    def set_file_handler(self, handler: Callable) -> None:
        """Register callback for new files discovered in the watch folder."""
        self._on_file_discovered = handler

    def set_resume_handler(self, handler: Callable) -> None:
        """Register callback to resume interrupted jobs on startup."""
        self._on_resume_jobs = handler

    async def start(self) -> None:
        """Start the scheduler."""
        if self._started:
            return

        if not settings.scheduler_enabled:
            logger.info("Scheduler disabled via config")
            return

        # Watch folder scanner — every 30 seconds
        watch_folder = settings.uploads_dir
        watch_folder.mkdir(parents=True, exist_ok=True)

        self._scheduler.add_job(
            self._scan_watch_folder,
            trigger=IntervalTrigger(seconds=30),
            id="watch_folder_scanner",
            replace_existing=True,
            max_instances=1,
        )

        # Resume interrupted jobs — runs once on startup (30s delay)
        self._scheduler.add_job(
            self._resume_interrupted_jobs,
            trigger=IntervalTrigger(seconds=30, start_date=None),
            id="resume_interrupted",
            replace_existing=True,
            max_instances=1,
            next_run_time=None,  # run once after starting
        )

        self._scheduler.start()
        self._started = True
        logger.info("Scheduler started", timezone=settings.scheduler_timezone)

        # Run resume immediately on startup
        asyncio.create_task(self._resume_interrupted_jobs())

    async def stop(self) -> None:
        """Shut down the scheduler."""
        if self._started and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            self._started = False
            logger.info("Scheduler stopped")

    async def _scan_watch_folder(self) -> None:
        """Scan the watch folder for new uploadable files."""
        if self._on_file_discovered is None:
            return

        watch_path = settings.uploads_dir
        if not watch_path.exists():
            return

        supported_extensions = {".csv", ".xlsx", ".xls", ".json"}
        marker_suffix = ".imported"

        for file_path in watch_path.iterdir():
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() not in supported_extensions:
                continue
            # Skip already-imported files
            marker = file_path.with_suffix(marker_suffix)
            if marker.exists():
                continue

            logger.info("New file discovered in watch folder", path=str(file_path))
            try:
                await self._on_file_discovered(file_path)
                # Mark as imported
                marker.touch()
            except Exception as exc:
                logger.error(
                    "Failed to process discovered file",
                    path=str(file_path),
                    error=str(exc),
                )

    async def _resume_interrupted_jobs(self) -> None:
        """Resume any jobs that were running when the platform last stopped."""
        if self._on_resume_jobs is None:
            return
        try:
            await self._on_resume_jobs()
        except Exception as exc:
            logger.error("Failed to resume interrupted jobs", error=str(exc))

    def add_cron_job(
        self,
        func: Callable,
        cron_expression: str,
        job_id: str,
        **kwargs,
    ) -> None:
        """Add a custom cron-scheduled job."""
        parts = cron_expression.split()
        if len(parts) != 5:
            raise ValueError("Cron expression must have 5 fields: min hour dom month dow")
        minute, hour, day, month, day_of_week = parts
        trigger = CronTrigger(
            minute=minute,
            hour=hour,
            day=day,
            month=month,
            day_of_week=day_of_week,
            timezone=settings.scheduler_timezone,
        )
        self._scheduler.add_job(
            func,
            trigger=trigger,
            id=job_id,
            replace_existing=True,
            **kwargs,
        )
        logger.info("Cron job added", job_id=job_id, cron=cron_expression)

    def remove_job(self, job_id: str) -> None:
        try:
            self._scheduler.remove_job(job_id)
        except Exception:
            pass

    @property
    def is_running(self) -> bool:
        return self._started and self._scheduler.running


# Global singleton scheduler
platform_scheduler = PlatformScheduler()
