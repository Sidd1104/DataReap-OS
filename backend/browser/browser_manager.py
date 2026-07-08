"""
Browser Manager — orchestrates Playwright-based browser automation.
Only active when BROWSER_MODE_ENABLED=true.
"""
from __future__ import annotations

from typing import Optional

from config.logging_config import get_logger
from config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


class BrowserManager:
    """Manages Playwright browser instances with session persistence."""

    def __init__(self) -> None:
        self._playwright = None
        self._browser = None
        self._context = None
        self._initialized = False

    async def initialize(self) -> None:
        """Start Playwright and launch browser."""
        if not settings.browser_mode_enabled:
            logger.info("Browser mode disabled — skipping initialization")
            return

        try:
            from playwright.async_api import async_playwright

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=settings.browser_headless,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            # Create persistent context for session cookies
            self._context = await self._browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/120 Safari/537.36"
                ),
            )
            self._initialized = True
            logger.info("Browser initialized", headless=settings.browser_headless)
        except ImportError:
            logger.warning(
                "Playwright not installed. Run: playwright install chromium"
            )
        except Exception as exc:
            logger.error("Browser initialization failed", error=str(exc))

    async def get_page(self):
        """Get a new browser page."""
        if not self._initialized or self._context is None:
            raise RuntimeError("Browser not initialized. Check BROWSER_MODE_ENABLED setting.")
        return await self._context.new_page()

    async def close(self) -> None:
        """Clean up browser resources."""
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as exc:
            logger.warning("Browser cleanup error", error=str(exc))
        finally:
            self._initialized = False

    @property
    def is_ready(self) -> bool:
        return self._initialized

    async def screenshot(self, page, filename: str) -> Optional[str]:
        """Take a screenshot and save to the screenshots directory."""
        try:
            path = settings.screenshots_dir / filename
            settings.screenshots_dir.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(path), full_page=True)
            return str(path)
        except Exception as exc:
            logger.error("Screenshot failed", error=str(exc))
            return None


# Global singleton
browser_manager = BrowserManager()
