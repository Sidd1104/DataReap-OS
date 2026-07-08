"""
Import / Export Service — handles reading input files and writing enriched output.
Supports: CSV, Excel, JSON.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from config.logging_config import get_logger

logger = get_logger(__name__)


class ImportExportService:
    """Reads input datasets and writes enriched output in multiple formats."""

    # ── Import ────────────────────────────────────────────────

    async def read_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Read a dataset file and return as a list of row dicts.
        Supports .csv, .xlsx, .xls, .json
        """
        path = Path(file_path)
        suffix = path.suffix.lower()

        try:
            if suffix == ".csv":
                df = pd.read_csv(path, dtype=str)
            elif suffix in (".xlsx", ".xls"):
                df = pd.read_excel(path, dtype=str)
            elif suffix == ".json":
                with open(path) as f:
                    data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                else:
                    df = pd.DataFrame([data])
            else:
                raise ValueError(f"Unsupported file format: {suffix}")

            # Clean up column names
            df.columns = [str(c).strip() for c in df.columns]
            # Replace NaN with None
            df = df.where(pd.notna(df), None)

            rows = df.to_dict(orient="records")
            logger.info(
                "File imported",
                path=str(path),
                rows=len(rows),
                columns=list(df.columns),
            )
            return rows

        except Exception as exc:
            logger.error("File import failed", path=str(path), error=str(exc))
            raise

    # ── Export ────────────────────────────────────────────────

    async def export_results(
        self,
        results: List[Dict[str, Any]],
        output_path: str,
        format: str = "excel",
        include_metadata: bool = True,
    ) -> str:
        """
        Export enriched results to the specified format.
        Returns the path to the written file.
        """
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        # Build dataframe from results
        rows = []
        for r in results:
            row = dict(r.get("input_data", {}))
            row.update(r.get("output_data", {}))
            if include_metadata:
                row["_confidence"] = r.get("confidence_score", 0)
                row["_status"] = r.get("status", "")
                row["_sources"] = ", ".join(r.get("sources_used", []))
            rows.append(row)

        df = pd.DataFrame(rows)

        fmt = format.lower()
        if fmt == "excel":
            output_path = str(path.with_suffix(".xlsx"))
            with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name="Enriched Data")

                # Apply formatting
                workbook = writer.book
                worksheet = writer.sheets["Enriched Data"]
                header_fmt = workbook.add_format(
                    {"bold": True, "bg_color": "#1a1a2e", "font_color": "#e0e0e0"}
                )
                for col_num, col_name in enumerate(df.columns):
                    worksheet.write(0, col_num, col_name, header_fmt)
                    worksheet.set_column(col_num, col_num, max(15, len(str(col_name)) + 5))

        elif fmt == "csv":
            output_path = str(path.with_suffix(".csv"))
            df.to_csv(output_path, index=False)

        elif fmt == "json":
            output_path = str(path.with_suffix(".json"))
            df.to_json(output_path, orient="records", indent=2)

        else:
            raise ValueError(f"Unsupported export format: {fmt}")

        logger.info("Results exported", path=output_path, rows=len(rows), format=fmt)
        return output_path

    async def get_columns(self, file_path: str) -> List[str]:
        """Return column names from a file without reading all data."""
        path = Path(file_path)
        suffix = path.suffix.lower()
        try:
            if suffix == ".csv":
                df = pd.read_csv(path, nrows=0)
            elif suffix in (".xlsx", ".xls"):
                df = pd.read_excel(path, nrows=0)
            elif suffix == ".json":
                with open(path) as f:
                    data = json.load(f)
                    if isinstance(data, list) and data:
                        return list(data[0].keys())
                    return []
            else:
                return []
            return list(df.columns)
        except Exception:
            return []


# Global singleton
import_export_service = ImportExportService()
