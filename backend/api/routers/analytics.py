"""
Analytics Router — aggregated metrics for the dashboard charts.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.job import Job
from db.models.row_result import RowResult
from db.repositories.job_repository import JobRepository

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(session: AsyncSession = Depends(get_db)):
    """Dashboard summary stats."""
    repo = JobRepository(session)
    stats = await repo.get_stats()

    # Active workers
    from core.worker_engine import worker_engine
    from core.queue_manager import queue_manager

    return {
        **stats,
        "queue_size": queue_manager.size,
        "active_workers": len(
            [w for w in worker_engine.stats.get("workers", []) if w["state"] == "running"]
        ),
        "is_paused": queue_manager.is_paused,
    }


@router.get("/throughput")
async def get_throughput(days: int = 7, session: AsyncSession = Depends(get_db)):
    """Daily enrichment throughput for the past N days."""
    since = datetime.utcnow() - timedelta(days=days)

    stmt = (
        select(
            func.date(Job.created_at).label("date"),
            func.sum(Job.success_rows).label("success"),
            func.sum(Job.failed_rows).label("failed"),
            func.count(Job.id).label("jobs"),
        )
        .where(Job.created_at >= since)
        .group_by(func.date(Job.created_at))
        .order_by(func.date(Job.created_at))
    )
    result = await session.execute(stmt)
    rows = result.all()

    return [
        {
            "date": str(row.date),
            "success": int(row.success or 0),
            "failed": int(row.failed or 0),
            "jobs": int(row.jobs or 0),
        }
        for row in rows
    ]


@router.get("/confidence-distribution")
async def confidence_distribution(session: AsyncSession = Depends(get_db)):
    """Distribution of confidence scores across all row results."""
    stmt = select(RowResult.confidence_score).where(
        RowResult.confidence_score.isnot(None)
    ).limit(5000)
    result = await session.execute(stmt)
    scores = [float(r[0]) for r in result.all()]

    if not scores:
        return {"buckets": []}

    # 10-bucket histogram
    buckets = [0] * 10
    for score in scores:
        bucket_idx = min(int(score * 10), 9)
        buckets[bucket_idx] += 1

    return {
        "buckets": [
            {"range": f"{i/10:.1f}–{(i+1)/10:.1f}", "count": count}
            for i, count in enumerate(buckets)
        ],
        "total": len(scores),
        "avg": round(sum(scores) / len(scores), 3),
    }


@router.get("/project-breakdown")
async def project_breakdown(session: AsyncSession = Depends(get_db)):
    """Success/failure breakdown per project."""
    stmt = (
        select(
            Job.project_name,
            func.sum(Job.success_rows).label("success"),
            func.sum(Job.failed_rows).label("failed"),
            func.count(Job.id).label("jobs"),
        )
        .group_by(Job.project_name)
        .order_by(func.sum(Job.success_rows).desc())
        .limit(20)
    )
    result = await session.execute(stmt)
    return [
        {
            "project": row.project_name,
            "success": int(row.success or 0),
            "failed": int(row.failed or 0),
            "jobs": int(row.jobs or 0),
        }
        for row in result.all()
    ]
