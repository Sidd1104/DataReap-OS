"""
Enterprise logging configuration using structlog + rich.
Outputs structured JSON in production, pretty console output in development.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import structlog
from rich.console import Console
from rich.logging import RichHandler


def configure_logging(log_level: str = "INFO", log_file: str = "./logs/platform.log") -> None:
    """
    Configure application-wide logging.
    - Development: Rich colored console output
    - Production: Structured JSON to file + console
    """
    log_dir = Path(log_file).parent
    log_dir.mkdir(parents=True, exist_ok=True)

    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # ── Handlers ────────────────────────────────────────────
    handlers: list[logging.Handler] = []

    # Console handler (rich pretty-print)
    console_handler = RichHandler(
        console=Console(stderr=True),
        show_time=True,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
    )
    console_handler.setLevel(numeric_level)
    handlers.append(console_handler)

    # File handler (plain text for structured logs)
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(numeric_level)
    file_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(file_formatter)
    handlers.append(file_handler)

    # Root logger
    logging.basicConfig(
        level=numeric_level,
        handlers=handlers,
        force=True,
    )

    # Silence noisy third-party loggers
    for noisy in ["httpx", "httpcore", "asyncio", "uvicorn.access"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # ── Structlog ────────────────────────────────────────────
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a named structured logger."""
    return structlog.get_logger(name)
