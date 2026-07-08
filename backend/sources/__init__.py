"""
Sources registry — maps source name strings to source instances.
"""
from __future__ import annotations

from typing import Dict, List

from sources.base_source import BaseSource
from sources.google_search import GoogleSearchSource
from sources.linkedin_scraper import LinkedInSource
from sources.crunchbase_scraper import CrunchbaseSource
from sources.sec_scraper import SECSource
from sources.pdf_extractor import PDFExtractorSource

_SOURCE_MAP: Dict[str, BaseSource] = {
    "google": GoogleSearchSource(),
    "linkedin": LinkedInSource(),
    "crunchbase": CrunchbaseSource(),
    "sec": SECSource(),
    "pdf": PDFExtractorSource(),
}


def get_sources(source_names: List[str]) -> List[BaseSource]:
    """Return source instances for a list of source names."""
    return [_SOURCE_MAP[name] for name in source_names if name in _SOURCE_MAP]


def list_available_sources() -> List[str]:
    return list(_SOURCE_MAP.keys())
