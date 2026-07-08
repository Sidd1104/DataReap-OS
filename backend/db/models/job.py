"""
Job ORM model — represents a single enrichment batch (one uploaded file).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base

JobStatus = Literal["pending", "running", "paused", "completed", "failed", "cancelled"]


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    project_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # File info
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)

    # Progress tracking
    processed_rows: Mapped[int] = mapped_column(Integer, default=0)
    success_rows: Mapped[int] = mapped_column(Integer, default=0)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0)
    skipped_rows: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Worker config snapshot
    config: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Estimated completion (seconds remaining)
    estimated_seconds_remaining: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Output file path
    output_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    @property
    def progress_pct(self) -> float:
        if self.total_rows == 0:
            return 0.0
        return round((self.processed_rows / self.total_rows) * 100, 2)

    def __repr__(self) -> str:
        return f"<Job id={self.id!r} status={self.status!r} progress={self.progress_pct}%>"
