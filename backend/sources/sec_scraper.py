"""
SEC EDGAR source — public US regulatory filings data.
Uses the SEC's free EDGAR full-text search API.
"""
from __future__ import annotations

from typing import List

import httpx

from config.logging_config import get_logger
from sources.base_source import BaseSource, SearchResult

logger = get_logger(__name__)

EDGAR_FULL_TEXT_SEARCH = "https://efts.sec.gov/LATEST/search-index?q={query}&dateRange=custom&startdt=2020-01-01&forms=SC%2013G,SC%2013D,13F-HR"
EDGAR_COMPANY_SEARCH = "https://www.sec.gov/cgi-bin/browse-edgar?company={company}&CIK=&type=&dateb=&owner=include&count=10&search_text=&action=getcompany"


class SECSource(BaseSource):
    """SEC EDGAR public filing source."""

    @property
    def source_name(self) -> str:
        return "sec"

    async def search(self, query: str, *, max_results: int = 3) -> List[SearchResult]:
        """Search SEC EDGAR full-text search."""
        from sources.google_search import GoogleSearchSource

        google = GoogleSearchSource()
        sec_query = f'site:sec.gov "{query}"'
        results = await google.search(sec_query, max_results=max_results)

        for r in results:
            r.source_name = self.source_name

        logger.debug("SEC search done", query=query[:60], results=len(results))
        return results

    async def extract_content(self, url: str) -> str:
        """Extract text from SEC filing pages."""
        import httpx
        from bs4 import BeautifulSoup

        try:
            async with httpx.AsyncClient(
                headers={
                    "User-Agent": "DataEnrichmentPlatform research@example.com",
                    "Accept-Encoding": "gzip, deflate",
                },
                follow_redirects=True,
                timeout=15.0,
            ) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "lxml")
                    for tag in soup(["script", "style"]):
                        tag.decompose()
                    return soup.get_text(separator="\n", strip=True)[:5000]
        except Exception as exc:
            logger.debug("SEC extraction failed", url=url, error=str(exc))
        return ""
