"""
Workers Router — worker pool status and control.
"""
from fastapi import APIRouter

from core.worker_engine import worker_engine
from core.queue_manager import queue_manager

router = APIRouter(prefix="/api/workers", tags=["workers"])


@router.get("/status")
async def worker_status():
    """Return current worker pool and queue stats."""
    return {
        "engine": worker_engine.stats,
        "queue": queue_manager.stats,
    }


@router.post("/pause-all")
async def pause_all_workers():
    worker_engine.pause_all()
    return {"status": "paused"}


@router.post("/resume-all")
async def resume_all_workers():
    worker_engine.resume_all()
    return {"status": "running"}


@router.post("/scale")
async def scale_workers(concurrency: int):
    if concurrency < 1 or concurrency > 50:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Concurrency must be between 1 and 50")
    await worker_engine.scale(concurrency)
    return {"concurrency": concurrency, "status": "scaled"}
