"""
SSE Stream Router — Server-Sent Events for real-time log streaming.
The frontend connects to /api/stream/logs and receives live log entries.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AsyncSessionLocal
from db.repositories.log_repository import LogRepository

router = APIRouter(prefix="/api/stream", tags=["stream"])


async def _log_event_generator(
    request: Request,
    job_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE events with new log entries.
    Polls the database every second for new entries.
    """
    last_timestamp = datetime.utcnow() - timedelta(seconds=10)

    # Send initial connection event
    yield "event: connected\ndata: {\"message\": \"Live log stream connected\"}\n\n"

    while True:
        # Check if client disconnected
        if await request.is_disconnected():
            break

        try:
            async with AsyncSessionLocal() as session:
                repo = LogRepository(session)
                if job_id:
                    logs = await repo.get_since(last_timestamp, limit=50)
                    logs = [l for l in logs if l.job_id == job_id]
                else:
                    logs = await repo.get_since(last_timestamp, limit=50)

                for log in logs:
                    event_data = {
                        "id": log.id,
                        "level": log.level,
                        "message": log.message,
                        "source": log.source,
                        "job_id": log.job_id,
                        "created_at": log.created_at.isoformat(),
                    }
                    yield f"event: log\ndata: {json.dumps(event_data)}\n\n"
                    last_timestamp = max(last_timestamp, log.created_at)

        except Exception as exc:
            error_event = {"error": str(exc)}
            yield f"event: error\ndata: {json.dumps(error_event)}\n\n"

        await asyncio.sleep(1.0)

    yield "event: disconnected\ndata: {}\n\n"


@router.get("/logs")
async def stream_logs(
    request: Request,
    job_id: Optional[str] = None,
):
    """
    SSE endpoint for real-time log streaming.
    Frontend: const source = new EventSource('/api/stream/logs?job_id=...')
    """
    return StreamingResponse(
        _log_event_generator(request, job_id=job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/status")
async def stream_status(request: Request):
    """SSE endpoint for worker and queue status updates."""
    async def status_generator():
        while True:
            if await request.is_disconnected():
                break

            from core.worker_engine import worker_engine
            from core.queue_manager import queue_manager

            status_data = {
                "engine": worker_engine.stats,
                "queue": queue_manager.stats,
                "timestamp": datetime.utcnow().isoformat(),
            }
            yield f"event: status\ndata: {json.dumps(status_data)}\n\n"
            await asyncio.sleep(2.0)

    return StreamingResponse(
        status_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
