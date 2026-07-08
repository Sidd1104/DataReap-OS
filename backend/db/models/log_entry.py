"""
LogEntry ORM model — enterprise logging, every platform action persisted.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


class LogEntry(Base):
    __tablename__ = "log_entries"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Context
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    worker_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    # Log data
    level: Mapped[str] = mapped_column(String(20), default="INFO", index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=True)  # module/component name
    extra: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    def __repr__(self) -> str:
        return f"<LogEntry level={self.level!r} job={self.job_id!r} msg={self.message[:40]!r}>"
