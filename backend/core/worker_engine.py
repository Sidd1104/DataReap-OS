"""
Worker Engine — async worker pool that processes enrichment tasks.
Supports pause, resume, timeout, crash recovery, and auto-retry.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4

from config.logging_config import get_logger
from config.settings import get_settings
from core.queue_manager import QueueTask, queue_manager

logger = get_logger(__name__)
settings = get_settings()


class WorkerState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    CRASHED = "crashed"


@dataclass
class WorkerStats:
    worker_id: str
    state: WorkerState = WorkerState.IDLE
    current_task_id: Optional[str] = None
    current_job_id: Optional[str] = None
    tasks_processed: int = 0
    tasks_failed: int = 0
    started_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None


class Worker:
    """A single async enrichment worker."""

    def __init__(
        self,
        worker_id: str,
        task_handler: Callable[[QueueTask], Any],
        max_retries: int = 3,
        timeout_seconds: int = 30,
    ) -> None:
        self.worker_id = worker_id
        self._task_handler = task_handler
        self._max_retries = max_retries
        self._timeout_seconds = timeout_seconds
        self._stats = WorkerStats(worker_id=worker_id)
        self._pause_event = asyncio.Event()
        self._pause_event.set()
        self._stop_event = asyncio.Event()
        self._task: Optional[asyncio.Task] = None

    @property
    def stats(self) -> WorkerStats:
        return self._stats

    def pause(self) -> None:
        self._pause_event.clear()
        self._stats.state = WorkerState.PAUSED
        logger.info("Worker paused", worker_id=self.worker_id)

    def resume(self) -> None:
        self._pause_event.set()
        self._stats.state = WorkerState.RUNNING
        logger.info("Worker resumed", worker_id=self.worker_id)

    def stop(self) -> None:
        self._stop_event.set()
        self._stats.state = WorkerState.STOPPED
        logger.info("Worker stopped", worker_id=self.worker_id)

    async def run(self) -> None:
        """Main worker loop — dequeue and process tasks until stopped."""
        self._stats.state = WorkerState.RUNNING
        self._stats.started_at = datetime.utcnow()
        logger.info("Worker started", worker_id=self.worker_id)

        while not self._stop_event.is_set():
            # Wait if paused
            await self._pause_event.wait()

            if self._stop_event.is_set():
                break

            # Dequeue next task
            task = await queue_manager.dequeue()
            if task is None:
                await asyncio.sleep(settings.worker_poll_interval)
                continue

            self._stats.current_task_id = task.task_id
            self._stats.current_job_id = task.job_id
            self._stats.last_activity = datetime.utcnow()

            await self._process_task(task)
            queue_manager.task_done()

            self._stats.current_task_id = None
            self._stats.current_job_id = None

        self._stats.state = WorkerState.STOPPED
        logger.info("Worker loop exited", worker_id=self.worker_id)

    async def _process_task(self, task: QueueTask) -> None:
        """Process a single task with timeout and retry logic."""
        start = time.monotonic()
        try:
            logger.info(
                "Processing task",
                worker_id=self.worker_id,
                task_id=task.task_id,
                job_id=task.job_id,
                row_index=task.row_index,
                retry=task.retry_count,
            )

            await asyncio.wait_for(
                self._task_handler(task),
                timeout=self._timeout_seconds,
            )

            elapsed = time.monotonic() - start
            self._stats.tasks_processed += 1
            logger.info(
                "Task completed",
                worker_id=self.worker_id,
                task_id=task.task_id,
                elapsed_ms=round(elapsed * 1000),
            )

        except asyncio.TimeoutError:
            elapsed = time.monotonic() - start
            self._stats.tasks_failed += 1
            logger.warning(
                "Task timed out",
                worker_id=self.worker_id,
                task_id=task.task_id,
                timeout_seconds=self._timeout_seconds,
            )
            if task.retry_count < self._max_retries:
                delay = 2 ** task.retry_count  # exponential backoff
                await queue_manager.enqueue_retry(task, delay_seconds=delay)
            else:
                logger.error(
                    "Task exhausted retries",
                    task_id=task.task_id,
                    job_id=task.job_id,
                    row_index=task.row_index,
                )

        except Exception as exc:
            elapsed = time.monotonic() - start
            self._stats.tasks_failed += 1
            logger.error(
                "Task failed",
                worker_id=self.worker_id,
                task_id=task.task_id,
                error=str(exc),
                exc_info=True,
            )
            if task.retry_count < self._max_retries:
                delay = 2 ** task.retry_count
                await queue_manager.enqueue_retry(task, delay_seconds=delay)


class WorkerEngine:
    """
    Manages a pool of async workers.
    Supports dynamic scaling, pause, resume, and crash recovery.
    """

    def __init__(self) -> None:
        self._workers: Dict[str, Worker] = {}
        self._worker_tasks: Dict[str, asyncio.Task] = {}
        self._task_handler: Optional[Callable] = None
        self._concurrency: int = settings.default_concurrency
        self._max_retries: int = settings.default_retries
        self._timeout_seconds: int = settings.default_timeout_seconds
        self._running: bool = False

    def set_task_handler(self, handler: Callable[[QueueTask], Any]) -> None:
        """Register the function that processes each task."""
        self._task_handler = handler

    async def start(
        self,
        concurrency: Optional[int] = None,
        max_retries: Optional[int] = None,
        timeout_seconds: Optional[int] = None,
    ) -> None:
        """Start the worker pool."""
        if self._running:
            logger.warning("Worker engine already running")
            return

        self._concurrency = concurrency or self._concurrency
        self._max_retries = max_retries or self._max_retries
        self._timeout_seconds = timeout_seconds or self._timeout_seconds
        self._running = True

        for i in range(self._concurrency):
            await self._spawn_worker()

        logger.info(
            "Worker engine started",
            concurrency=self._concurrency,
            max_retries=self._max_retries,
            timeout_seconds=self._timeout_seconds,
        )

    async def _spawn_worker(self) -> str:
        """Create and start a new worker."""
        if self._task_handler is None:
            raise RuntimeError("No task handler registered. Call set_task_handler() first.")

        worker_id = f"worker-{str(uuid4())[:8]}"
        worker = Worker(
            worker_id=worker_id,
            task_handler=self._task_handler,
            max_retries=self._max_retries,
            timeout_seconds=self._timeout_seconds,
        )
        self._workers[worker_id] = worker

        task = asyncio.create_task(
            self._supervised_run(worker),
            name=f"worker-{worker_id}",
        )
        self._worker_tasks[worker_id] = task
        return worker_id

    async def _supervised_run(self, worker: Worker) -> None:
        """Run a worker with crash recovery."""
        while self._running:
            try:
                await worker.run()
                break  # Clean exit
            except Exception as exc:
                worker._stats.state = WorkerState.CRASHED
                logger.error(
                    "Worker crashed, restarting in 5s",
                    worker_id=worker.worker_id,
                    error=str(exc),
                    exc_info=True,
                )
                await asyncio.sleep(5)
                if self._running:
                    worker._stats.state = WorkerState.RUNNING
                    logger.info("Worker restarted", worker_id=worker.worker_id)

    async def stop(self) -> None:
        """Stop all workers gracefully."""
        self._running = False
        for worker in self._workers.values():
            worker.stop()
        if self._worker_tasks:
            await asyncio.gather(*self._worker_tasks.values(), return_exceptions=True)
        self._workers.clear()
        self._worker_tasks.clear()
        logger.info("Worker engine stopped")

    def pause_all(self) -> None:
        queue_manager.pause()
        for worker in self._workers.values():
            worker.pause()
        logger.info("All workers paused")

    def resume_all(self) -> None:
        queue_manager.resume()
        for worker in self._workers.values():
            worker.resume()
        logger.info("All workers resumed")

    async def scale(self, new_concurrency: int) -> None:
        """Dynamically scale the worker pool up or down."""
        current = len(self._workers)
        if new_concurrency > current:
            for _ in range(new_concurrency - current):
                await self._spawn_worker()
        elif new_concurrency < current:
            workers_to_stop = list(self._workers.keys())[new_concurrency:]
            for wid in workers_to_stop:
                self._workers[wid].stop()
                del self._workers[wid]
                del self._worker_tasks[wid]
        self._concurrency = new_concurrency
        logger.info("Worker pool scaled", old=current, new=new_concurrency)

    @property
    def stats(self) -> dict:
        worker_stats = [
            {
                "worker_id": w.stats.worker_id,
                "state": w.stats.state.value,
                "current_job_id": w.stats.current_job_id,
                "tasks_processed": w.stats.tasks_processed,
                "tasks_failed": w.stats.tasks_failed,
                "last_activity": (
                    w.stats.last_activity.isoformat() if w.stats.last_activity else None
                ),
            }
            for w in self._workers.values()
        ]
        return {
            "running": self._running,
            "concurrency": self._concurrency,
            "active_workers": len(self._workers),
            "workers": worker_stats,
        }


# Global singleton worker engine
worker_engine = WorkerEngine()
