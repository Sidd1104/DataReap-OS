"""
Core Enrichment Service — orchestrates the full enrichment pipeline per row.
1. Build search query from row data
2. Run configured sources in parallel
3. Build and render prompt with source context
4. Call LLM provider
5. Validate results
6. Save to database
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from config.logging_config import get_logger
from config.settings import get_settings
from core.prompt_manager import prompt_manager
from core.queue_manager import QueueTask
from core.validation_engine import validation_engine
from db.database import get_db_session
from db.models.row_result import RowResult
from db.repositories.job_repository import JobRepository
from db.repositories.log_repository import LogRepository
from providers import get_provider
from sources import get_sources

logger = get_logger(__name__)
settings = get_settings()


class EnrichmentService:
    """
    Orchestrates the end-to-end enrichment pipeline for a single row.
    Designed to be called by the worker engine for each QueueTask.
    """

    async def process_task(self, task: QueueTask) -> None:
        """
        Main entry point called by the worker engine.
        Processes one row and saves results to database.
        """
        start_time = time.monotonic()
        config = task.config
        job_id = task.job_id
        row_index = task.row_index
        row_data = task.row_data

        async with get_db_session() as session:
            log_repo = LogRepository(session)
            job_repo = JobRepository(session)

            await log_repo.log(
                "INFO",
                f"[Row {row_index}] Starting enrichment",
                job_id=job_id,
                source="enrichment_service",
                extra={"row_data_preview": {k: str(v)[:50] for k, v in row_data.items()}},
            )

            try:
                # ── 1. Gather context from sources ───────────────────
                source_context = await self._gather_source_context(
                    row_data=row_data,
                    config=config,
                    job_id=job_id,
                )

                # ── 2. Build and render prompt ────────────────────────
                template_name = config.get("prompt_template", "default")
                target_columns = config.get("target_columns", [])
                input_columns = config.get("input_columns", list(row_data.keys()))

                prompt = prompt_manager.render(
                    template_name=template_name,
                    input_data=row_data,
                    target_columns=target_columns,
                    extra_context={"source_context": source_context},
                )

                # ── 3. Call LLM provider ──────────────────────────────
                provider_name = config.get("llm_provider", settings.default_llm_provider)
                provider = get_provider(provider_name)

                await log_repo.log(
                    "INFO",
                    f"[Row {row_index}] Calling {provider_name} ({provider.model})",
                    job_id=job_id,
                    source="enrichment_service",
                )

                enrichment_result = await provider.enrich(prompt)

                if not enrichment_result.success:
                    raise RuntimeError(
                        f"LLM enrichment failed: {enrichment_result.error}"
                    )

                # ── 4. Validate results ───────────────────────────────
                validation_rules = config.get("validation_rules", {})
                flat_data = enrichment_result.to_flat_dict()
                validation_summary = await validation_engine.validate_row(
                    flat_data, validation_rules
                )

                # ── 5. Persist row result ─────────────────────────────
                elapsed_ms = (time.monotonic() - start_time) * 1000
                row_result = RowResult(
                    job_id=job_id,
                    row_index=row_index,
                    input_data=row_data,
                    output_data=flat_data,
                    validation_results=validation_summary,
                    confidence_score=enrichment_result.overall_confidence,
                    sources_used=list(config.get("search_sources", [])),
                    status="success",
                    processing_time_ms=elapsed_ms,
                )
                session.add(row_result)

                # ── 6. Update job counters ────────────────────────────
                job = await job_repo.get_by_id(job_id)
                if job:
                    job.processed_rows += 1
                    job.success_rows += 1
                    # Estimate time remaining
                    if job.total_rows > 0 and elapsed_ms > 0:
                        remaining = job.total_rows - job.processed_rows
                        avg_ms = elapsed_ms / max(job.processed_rows, 1)
                        job.estimated_seconds_remaining = (remaining * avg_ms) / 1000
                    await session.flush()

                await log_repo.log(
                    "INFO",
                    (
                        f"[Row {row_index}] ✓ Enriched in {elapsed_ms:.0f}ms | "
                        f"confidence={enrichment_result.overall_confidence:.2f} | "
                        f"provider={provider_name}"
                    ),
                    job_id=job_id,
                    source="enrichment_service",
                    extra={
                        "fields_found": len(
                            [v for v in flat_data.values() if v is not None]
                        ),
                        "total_fields": len(flat_data),
                    },
                )

            except Exception as exc:
                elapsed_ms = (time.monotonic() - start_time) * 1000
                error_msg = str(exc)

                # Save failed row result
                row_result = RowResult(
                    job_id=job_id,
                    row_index=row_index,
                    input_data=row_data,
                    output_data={},
                    status="failed",
                    error_message=error_msg,
                    retry_count=task.retry_count,
                    processing_time_ms=elapsed_ms,
                )
                session.add(row_result)

                # Update job fail counter
                job = await job_repo.get_by_id(job_id)
                if job:
                    job.processed_rows += 1
                    job.failed_rows += 1
                    await session.flush()

                await log_repo.log(
                    "ERROR",
                    f"[Row {row_index}] ✗ Failed: {error_msg}",
                    job_id=job_id,
                    source="enrichment_service",
                    extra={"retry_count": task.retry_count},
                )

                # Re-raise so worker engine can handle retries
                raise

    async def _gather_source_context(
        self,
        row_data: Dict[str, Any],
        config: Dict[str, Any],
        job_id: str,
    ) -> str:
        """Search all configured sources in parallel and compile context."""
        source_names: List[str] = config.get("search_sources", [])
        if not source_names:
            return ""

        sources = get_sources(source_names)
        if not sources:
            return ""

        # Build query from input columns
        input_columns = config.get("input_columns", list(row_data.keys()))
        query_parts = [
            str(row_data.get(col, ""))
            for col in input_columns
            if row_data.get(col)
        ]
        query = " ".join(query_parts)

        # Search all sources in parallel
        search_tasks = [
            source.search(query, max_results=3) for source in sources
        ]
        results_lists = await asyncio.gather(*search_tasks, return_exceptions=True)

        context_parts = []
        for source, results in zip(sources, results_lists):
            if isinstance(results, Exception):
                logger.warning(
                    "Source search failed",
                    source=source.source_name,
                    error=str(results),
                )
                continue
            for r in results:
                context_parts.append(
                    f"[{source.source_name.upper()}] {r.title}\n{r.url}\n{r.snippet}"
                )

        context = "\n\n".join(context_parts)
        logger.debug(
            "Source context gathered",
            job_id=job_id,
            sources=source_names,
            context_chars=len(context),
        )
        return context


# Global singleton
enrichment_service = EnrichmentService()
