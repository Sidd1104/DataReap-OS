"""
Log Repository — optimized queries for LogEntry entities with SSE streaming support.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.log_entry import LogEntry
from db.repositories.base_repository import BaseRepository


class LogRepository(BaseRepository[LogEntry]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(LogEntry, session)

    async def get_recent(self, limit: int = 100) -> Sequence[LogEntry]:
        stmt = (
            select(LogEntry)
            .order_by(LogEntry.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_job(self, job_id: str, limit: int = 500) -> Sequence[LogEntry]:
        stmt = (
            select(LogEntry)
            .where(LogEntry.job_id == job_id)
            .order_by(LogEntry.created_at.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_since(self, since: datetime, limit: int = 200) -> Sequence[LogEntry]:
        stmt = (
            select(LogEntry)
            .where(LogEntry.created_at > since)
            .order_by(LogEntry.created_at.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def log(
        self,
        level: str,
        message: str,
        *,
        job_id: str | None = None,
        worker_id: str | None = None,
        project_id: str | None = None,
        source: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> LogEntry:
        """Convenience method to create a log entry."""
        return await self.create(
            level=level,
            message=message,
            job_id=job_id,
            worker_id=worker_id,
            project_id=project_id,
            source=source,
            extra=extra,
        )
