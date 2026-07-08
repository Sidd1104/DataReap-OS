"""
Playwright Engine — high-level scraping operations using the browser.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from config.logging_config import get_logger
from browser.browser_manager import browser_manager

logger = get_logger(__name__)


class PlaywrightEngine:
    """High-level browser scraping operations."""

    async def fetch_page_text(self, url: str, wait_selector: Optional[str] = None) -> str:
        """Navigate to a URL and return visible text content."""
        page = await browser_manager.get_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            if wait_selector:
                await page.wait_for_selector(wait_selector, timeout=10000)
            text = await page.inner_text("body")
            return text[:8000]
        except Exception as exc:
            logger.error("Page fetch failed", url=url, error=str(exc))
            return ""
        finally:
            await page.close()

    async def search_google(self, query: str, num_results: int = 5) -> list[Dict[str, str]]:
        """Perform a Google search using the browser (bypasses API limits)."""
        page = await browser_manager.get_page()
        results = []
        try:
            await page.goto(
                f"https://www.google.com/search?q={query}",
                wait_until="domcontentloaded",
                timeout=20000,
            )
            # Extract search results
            links = await page.query_selector_all("div.g a[href]")
            for link in links[:num_results]:
                href = await link.get_attribute("href")
                title_el = await link.query_selector("h3")
                title = await title_el.inner_text() if title_el else ""
                if href and href.startswith("http"):
                    results.append({"title": title, "url": href})
        except Exception as exc:
            logger.error("Browser Google search failed", error=str(exc))
        finally:
            await page.close()
        return results

    async def handle_captcha_pause(self, page) -> None:
        """
        Pause processing if CAPTCHA is detected.
        Logs a warning and waits for manual resolution (30 minute timeout).
        """
        logger.warning("CAPTCHA detected — pausing for manual resolution (30 min timeout)")
        await browser_manager.screenshot(page, "captcha_detected.png")
        # Wait up to 30 minutes for the user to solve the CAPTCHA
        import asyncio
        await asyncio.sleep(30 * 60)


# Global singleton
playwright_engine = PlaywrightEngine()
