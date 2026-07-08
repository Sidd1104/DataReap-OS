"""
Job Repository — domain-specific queries for Job entities.
"""
from __future__ import annotations

from datetime import datetime
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.job import Job
from db.repositories.base_repository import BaseRepository


class JobRepository(BaseRepository[Job]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Job, session)

    async def get_by_status(self, status: str) -> Sequence[Job]:
        stmt = (
            select(Job)
            .where(Job.status == status)
            .order_by(Job.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_project(self, project_id: str, limit: int = 50) -> Sequence[Job]:
        stmt = (
            select(Job)
            .where(Job.project_id == project_id)
            .order_by(Job.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_recent(self, limit: int = 20) -> Sequence[Job]:
        stmt = select(Job).order_by(Job.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_running_jobs(self) -> Sequence[Job]:
        stmt = select(Job).where(Job.status.in_(["running", "paused"]))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_progress(
        self,
        job_id: str,
        processed: int,
        success: int,
        failed: int,
        status: str | None = None,
        estimated_seconds: float | None = None,
    ) -> None:
        job = await self.get_by_id(job_id)
        if job:
            job.processed_rows = processed
            job.success_rows = success
            job.failed_rows = failed
            if status:
                job.status = status
                if status == "running" and not job.started_at:
                    job.started_at = datetime.utcnow()
                if status in ("completed", "failed", "cancelled"):
                    job.completed_at = datetime.utcnow()
            if estimated_seconds is not None:
                job.estimated_seconds_remaining = estimated_seconds
            await self.session.flush()

    async def get_stats(self) -> dict:
        """Aggregate stats for analytics dashboard."""
        total = await self.count()
        stmt = select(Job.status, func.count(Job.id)).group_by(Job.status)
        result = await self.session.execute(stmt)
        by_status = {row[0]: row[1] for row in result.all()}

        # Total rows enriched
        stmt2 = select(func.sum(Job.success_rows))
        result2 = await self.session.execute(stmt2)
        total_enriched = result2.scalar() or 0

        return {
            "total_jobs": total,
            "by_status": by_status,
            "total_enriched_rows": total_enriched,
        }
