"""
RowResult ORM model — stores the enriched result for a single input row.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base


class RowResult(Base):
    __tablename__ = "row_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # Original input data (JSON snapshot of the row)
    input_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    # Enriched output data
    output_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    # Validation results per field
    validation_results: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=True)

    # Quality
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sources_used: Mapped[list[str]] = mapped_column(JSON, nullable=True, default=list)
    source_urls: Mapped[dict[str, str]] = mapped_column(JSON, nullable=True, default=dict)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="success", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timing
    processing_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<RowResult job={self.job_id!r} row={self.row_index} status={self.status!r}>"
