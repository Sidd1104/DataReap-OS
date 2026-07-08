"""
Crunchbase source — public organization and person data.
Uses Google CSE targeting site:crunchbase.com.
"""
from __future__ import annotations

from typing import List

from config.logging_config import get_logger
from sources.base_source import BaseSource, SearchResult

logger = get_logger(__name__)


class CrunchbaseSource(BaseSource):
    """Crunchbase public data source."""

    @property
    def source_name(self) -> str:
        return "crunchbase"

    async def search(self, query: str, *, max_results: int = 3) -> List[SearchResult]:
        from sources.google_search import GoogleSearchSource

        google = GoogleSearchSource()
        cb_query = f'site:crunchbase.com "{query}"'
        results = await google.search(cb_query, max_results=max_results)

        for r in results:
            r.source_name = self.source_name

        logger.debug("Crunchbase search done", query=query[:60], results=len(results))
        return results

    async def extract_content(self, url: str) -> str:
        import httpx
        from bs4 import BeautifulSoup

        try:
            async with httpx.AsyncClient(
                headers={"User-Agent": "Mozilla/5.0"},
                follow_redirects=True,
                timeout=10.0,
            ) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "lxml")
                    for tag in soup(["script", "style"]):
                        tag.decompose()
                    return soup.get_text(separator="\n", strip=True)[:4000]
        except Exception as exc:
            logger.debug("Crunchbase extraction failed", error=str(exc))
        return ""
