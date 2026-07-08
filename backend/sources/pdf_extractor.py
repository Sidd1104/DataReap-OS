"""
PDF Extractor source — extracts text from PDF documents.
Useful for prospectus, investor profiles, and company reports.
"""
from __future__ import annotations

from pathlib import Path
from typing import List

import httpx

from config.logging_config import get_logger
from sources.base_source import BaseSource, SearchResult

logger = get_logger(__name__)


class PDFExtractorSource(BaseSource):
    """PDF text extraction source."""

    @property
    def source_name(self) -> str:
        return "pdf"

    async def search(self, query: str, *, max_results: int = 3) -> List[SearchResult]:
        """PDFs don't support keyword search; return empty. Use extract_content directly."""
        return []

    async def extract_content(self, url_or_path: str) -> str:
        """
        Extract text from a PDF.
        Accepts either a URL (downloads first) or a local file path.
        """
        try:
            if url_or_path.startswith("http"):
                content = await self._download_pdf(url_or_path)
            else:
                content = Path(url_or_path).read_bytes()

            if not content:
                return ""

            return await self._parse_pdf(content)

        except Exception as exc:
            logger.error("PDF extraction failed", source=url_or_path, error=str(exc))
            return ""

    async def _download_pdf(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            return resp.content

    async def _parse_pdf(self, content: bytes) -> str:
        """Parse PDF bytes and extract text."""
        import io

        # Try pdfplumber first (better layout extraction)
        try:
            import pdfplumber

            with pdfplumber.open(io.BytesIO(content)) as pdf:
                pages_text = []
                for page in pdf.pages[:10]:  # Max 10 pages
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                return "\n".join(pages_text)[:8000]
        except Exception:
            pass

        # Fall back to pypdf
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            texts = []
            for page in reader.pages[:10]:
                texts.append(page.extract_text() or "")
            return "\n".join(texts)[:8000]
        except Exception as exc:
            logger.error("PDF parsing failed with both parsers", error=str(exc))
            return ""

    async def extract_from_result(self, result: SearchResult) -> str:
        """Extract content from a SearchResult that links to a PDF."""
        if result.url.lower().endswith(".pdf"):
            return await self.extract_content(result.url)
        return result.snippet
