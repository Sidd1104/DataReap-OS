"""
LinkedIn source — public profile data extraction.
Note: LinkedIn blocks most scraping. This source attempts public profile 
pages using ethical scraping with rate limiting. For robust results, 
use the browser module instead.
"""
from __future__ import annotations

from typing import List
from urllib.parse import quote_plus

import httpx

from config.logging_config import get_logger
from sources.base_source import BaseSource, SearchResult

logger = get_logger(__name__)


class LinkedInSource(BaseSource):
    """LinkedIn public search source."""

    @property
    def source_name(self) -> str:
        return "linkedin"

    async def search(self, query: str, *, max_results: int = 3) -> List[SearchResult]:
        """
        Return LinkedIn-targeted search results using Google CSE with site:linkedin.com.
        This is the most reliable approach without scraping LinkedIn directly.
        """
        from sources.google_search import GoogleSearchSource

        google = GoogleSearchSource()
        li_query = f'site:linkedin.com/in/ "{query}"'
        results = await google.search(li_query, max_results=max_results)

        # Annotate as LinkedIn source
        for r in results:
            r.source_name = self.source_name

        logger.debug("LinkedIn search done via Google", query=query[:60], results=len(results))
        return results

    async def extract_content(self, url: str) -> str:
        """
        Attempt to extract public LinkedIn profile text.
        LinkedIn heavily blocks crawlers, so this will often fail.
        Use browser module for authenticated access.
        """
        try:
            async with httpx.AsyncClient(
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 Chrome/120"
                    )
                },
                follow_redirects=True,
                timeout=10.0,
            ) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "lxml")
                    return soup.get_text(separator="\n", strip=True)[:3000]
        except Exception as exc:
            logger.debug("LinkedIn extraction failed (expected)", url=url, error=str(exc))
        return ""
