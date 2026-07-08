"""
Base data source — abstract interface for all search/scraping sources.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class SearchResult:
    """A single result returned by a data source."""
    title: str
    url: str
    snippet: str = ""
    source_name: str = ""
    raw_content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseSource(ABC):
    """Abstract base class for all data sources."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        ...

    @abstractmethod
    async def search(
        self,
        query: str,
        *,
        max_results: int = 5,
    ) -> List[SearchResult]:
        """Search this source for the given query."""
        ...

    async def extract_content(self, url: str) -> str:
        """Optionally extract full page content from a URL."""
        return ""

    def build_query(self, row_data: Dict[str, Any], input_columns: List[str]) -> str:
        """Build a search query from row data."""
        parts = [str(row_data.get(col, "")) for col in input_columns if row_data.get(col)]
        return " ".join(parts)
