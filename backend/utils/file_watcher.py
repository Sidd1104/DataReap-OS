"""
File watcher utility — uses watchdog to monitor the uploads folder.
Triggers callbacks when new files are detected.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Callable, Optional

from config.logging_config import get_logger

logger = get_logger(__name__)


class AsyncFileWatcher:
    """
    Watches a directory for new files using polling (cross-platform).
    Calls an async callback when a new file is detected.
    """

    def __init__(
        self,
        watch_dir: str,
        on_new_file: Callable[[Path], None],
        extensions: tuple[str, ...] = (".csv", ".xlsx", ".xls", ".json"),
        poll_interval: float = 5.0,
    ) -> None:
        self._watch_dir = Path(watch_dir)
        self._on_new_file = on_new_file
        self._extensions = extensions
        self._poll_interval = poll_interval
        self._seen_files: set[Path] = set()
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        """Start watching the directory."""
        self._watch_dir.mkdir(parents=True, exist_ok=True)
        self._running = True
        self._task = asyncio.create_task(self._watch_loop(), name="file-watcher")
        logger.info("File watcher started", directory=str(self._watch_dir))

    async def stop(self) -> None:
        """Stop watching."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("File watcher stopped")

    async def _watch_loop(self) -> None:
        """Polling loop that checks for new files."""
        while self._running:
            try:
                current_files = {
                    f
                    for f in self._watch_dir.iterdir()
                    if f.is_file() and f.suffix.lower() in self._extensions
                    and not f.name.endswith(".imported")
                }

                new_files = current_files - self._seen_files
                for file_path in sorted(new_files):
                    logger.info("New file detected", path=str(file_path))
                    try:
                        if asyncio.iscoroutinefunction(self._on_new_file):
                            await self._on_new_file(file_path)
                        else:
                            self._on_new_file(file_path)
                        # Mark as seen after successful processing
                        self._seen_files.add(file_path)
                    except Exception as exc:
                        logger.error(
                            "File handler failed",
                            path=str(file_path),
                            error=str(exc),
                        )

                self._seen_files = current_files
            except Exception as exc:
                logger.error("File watcher error", error=str(exc))

            await asyncio.sleep(self._poll_interval)
