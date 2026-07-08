"""
Priority Queue Manager — async priority queue for enrichment tasks.
Supports enqueue, dequeue, pause, resume, cancel, and priority levels.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum
from typing import Any, Dict, Optional
from uuid import uuid4

from config.logging_config import get_logger

logger = get_logger(__name__)


class Priority(IntEnum):
    HIGH = 1
    NORMAL = 5
    LOW = 10


@dataclass(order=True)
class QueueTask:
    """A single enrichment task in the queue."""
    priority: int
    created_at: datetime = field(default_factory=datetime.utcnow, compare=False)
    task_id: str = field(default_factory=lambda: str(uuid4()), compare=False)
    job_id: str = field(default="", compare=False)
    row_index: int = field(default=0, compare=False)
    row_data: Dict[str, Any] = field(default_factory=dict, compare=False)
    config: Dict[str, Any] = field(default_factory=dict, compare=False)
    retry_count: int = field(default=0, compare=False)


class QueueManager:
    """
    Priority-based async queue manager.
    Manages the flow of enrichment tasks to worker processes.
    """

    def __init__(self) -> None:
        self._queue: asyncio.PriorityQueue[QueueTask] = asyncio.PriorityQueue()
        self._paused: bool = False
        self._cancelled_jobs: set[str] = set()
        self._task_registry: Dict[str, QueueTask] = {}
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # not paused initially
        self._total_enqueued: int = 0
        self._total_processed: int = 0

    # ── Core Operations ──────────────────────────────────────

    async def enqueue(
        self,
        job_id: str,
        row_index: int,
        row_data: Dict[str, Any],
        config: Dict[str, Any],
        priority: Priority = Priority.NORMAL,
        retry_count: int = 0,
    ) -> str:
        """Add a task to the queue. Returns the task_id."""
        task = QueueTask(
            priority=priority.value,
            job_id=job_id,
            row_index=row_index,
            row_data=row_data,
            config=config,
            retry_count=retry_count,
        )
        self._task_registry[task.task_id] = task
        await self._queue.put(task)
        self._total_enqueued += 1
        logger.debug(
            "Task enqueued",
            task_id=task.task_id,
            job_id=job_id,
            row_index=row_index,
            queue_size=self._queue.qsize(),
        )
        return task.task_id

    async def dequeue(self) -> Optional[QueueTask]:
        """
        Dequeue the next task, respecting the pause state.
        Skips tasks from cancelled jobs.
        """
        while True:
            # Block if paused
            await self._pause_event.wait()

            try:
                task = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                return None

            # Skip cancelled jobs
            if task.job_id in self._cancelled_jobs:
                self._queue.task_done()
                logger.debug("Skipping task for cancelled job", job_id=task.job_id)
                continue

            self._total_processed += 1
            return task

    def task_done(self) -> None:
        """Signal that the last dequeued task is complete."""
        try:
            self._queue.task_done()
        except ValueError:
            pass

    # ── Control ───────────────────────────────────────────────

    def pause(self) -> None:
        """Pause task consumption (in-progress tasks complete normally)."""
        if not self._paused:
            self._paused = True
            self._pause_event.clear()
            logger.info("Queue paused")

    def resume(self) -> None:
        """Resume task consumption."""
        if self._paused:
            self._paused = False
            self._pause_event.set()
            logger.info("Queue resumed")

    def cancel_job(self, job_id: str) -> None:
        """Mark a job as cancelled — future tasks from this job are skipped."""
        self._cancelled_jobs.add(job_id)
        logger.info("Job cancelled in queue", job_id=job_id)

    def uncancel_job(self, job_id: str) -> None:
        self._cancelled_jobs.discard(job_id)

    async def enqueue_retry(self, task: QueueTask, delay_seconds: float = 0) -> None:
        """Re-enqueue a failed task with incremented retry count."""
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        await self.enqueue(
            job_id=task.job_id,
            row_index=task.row_index,
            row_data=task.row_data,
            config=task.config,
            priority=Priority.HIGH,  # Retries get high priority
            retry_count=task.retry_count + 1,
        )

    # ── Stats ─────────────────────────────────────────────────

    @property
    def size(self) -> int:
        return self._queue.qsize()

    @property
    def is_paused(self) -> bool:
        return self._paused

    @property
    def stats(self) -> dict:
        return {
            "queue_size": self.size,
            "is_paused": self._paused,
            "total_enqueued": self._total_enqueued,
            "total_processed": self._total_processed,
            "cancelled_jobs": len(self._cancelled_jobs),
        }


# Global singleton queue manager
queue_manager = QueueManager()
