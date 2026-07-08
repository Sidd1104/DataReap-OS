"""
Logs Router — query and filter enrichment logs.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.repositories.log_repository import LogRepository

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/")
async def get_logs(
    job_id: Optional[str] = None,
    level: Optional[str] = None,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
):
    repo = LogRepository(session)
    if job_id:
        logs = await repo.get_by_job(job_id, limit=limit)
    else:
        logs = await repo.get_recent(limit=limit)

    entries = [
        {
            "id": log.id,
            "level": log.level,
            "message": log.message,
            "source": log.source,
            "job_id": log.job_id,
            "worker_id": log.worker_id,
            "extra": log.extra,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

    if level:
        entries = [e for e in entries if e["level"] == level.upper()]

    return entries


@router.get("/since")
async def get_logs_since(
    since: str,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
):
    """Get logs since an ISO timestamp. Used for polling by the frontend."""
    try:
        since_dt = datetime.fromisoformat(since)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid ISO timestamp format")

    repo = LogRepository(session)
    logs = await repo.get_since(since_dt, limit=limit)
    return [
        {
            "id": log.id,
            "level": log.level,
            "message": log.message,
            "source": log.source,
            "job_id": log.job_id,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
