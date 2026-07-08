"""
Google Custom Search API source.
Uses Google's Custom Search JSON API for web search.
Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.
"""
from __future__ import annotations

from typing import List

import httpx

from config.logging_config import get_logger
from config.settings import get_settings
from sources.base_source import BaseSource, SearchResult

logger = get_logger(__name__)
settings = get_settings()

GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"


class GoogleSearchSource(BaseSource):
    """Google Custom Search Engine source."""

    def __init__(self) -> None:
        self._api_key = settings.google_search_api_key
        self._engine_id = settings.google_search_engine_id
        self._client: httpx.AsyncClient | None = None

    @property
    def source_name(self) -> str:
        return "google"

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=15.0)
        return self._client

    async def search(self, query: str, *, max_results: int = 5) -> List[SearchResult]:
        if not self._api_key or not self._engine_id:
            logger.warning("Google Search API not configured — skipping source")
            return []

        try:
            client = self._get_client()
            params = {
                "key": self._api_key,
                "cx": self._engine_id,
                "q": query,
                "num": min(max_results, 10),
            }
            resp = await client.get(GOOGLE_CSE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

            results = []
            for item in data.get("items", []):
                results.append(
                    SearchResult(
                        title=item.get("title", ""),
                        url=item.get("link", ""),
                        snippet=item.get("snippet", ""),
                        source_name=self.source_name,
                        metadata={
                            "display_link": item.get("displayLink", ""),
                            "kind": item.get("kind", ""),
                        },
                    )
                )
            logger.debug(
                "Google search completed",
                query=query[:60],
                results=len(results),
            )
            return results

        except httpx.HTTPStatusError as exc:
            logger.error(
                "Google Search API HTTP error",
                status=exc.response.status_code,
                query=query[:60],
            )
            return []
        except Exception as exc:
            logger.error("Google Search failed", error=str(exc))
            return []

    async def extract_content(self, url: str) -> str:
        """Fetch and parse a webpage's text content."""
        try:
            from bs4 import BeautifulSoup

            client = self._get_client()
            resp = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0"},
                follow_redirects=True,
                timeout=10.0,
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                # Remove scripts and styles
                for tag in soup(["script", "style", "nav", "footer"]):
                    tag.decompose()
                text = soup.get_text(separator="\n", strip=True)
                return text[:5000]  # Limit to 5k chars to stay within token budget
        except Exception as exc:
            logger.debug("Content extraction failed", url=url, error=str(exc))
        return ""
