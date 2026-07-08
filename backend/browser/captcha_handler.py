"""
CAPTCHA handler — detects and manages CAPTCHA interruptions.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from config.logging_config import get_logger

logger = get_logger(__name__)


class CaptchaHandler:
    """Detects CAPTCHA presence and pauses the worker until resolved."""

    CAPTCHA_INDICATORS = [
        "captcha",
        "recaptcha",
        "hcaptcha",
        "verify you're human",
        "unusual traffic",
        "security check",
        "robot",
        "bot detection",
    ]

    def is_captcha_page(self, page_text: str) -> bool:
        """Check if page text contains CAPTCHA indicators."""
        text_lower = page_text.lower()
        return any(indicator in text_lower for indicator in self.CAPTCHA_INDICATORS)

    async def wait_for_resolution(
        self,
        max_wait_seconds: int = 1800,
        check_interval: int = 30,
    ) -> bool:
        """
        Block and wait for CAPTCHA to be resolved.
        Returns True if resolved, False if timed out.
        """
        logger.warning(
            "CAPTCHA encountered — waiting for manual resolution",
            max_wait_seconds=max_wait_seconds,
        )
        elapsed = 0
        while elapsed < max_wait_seconds:
            await asyncio.sleep(check_interval)
            elapsed += check_interval
            logger.info(
                "Waiting for CAPTCHA resolution",
                elapsed_seconds=elapsed,
                remaining_seconds=max_wait_seconds - elapsed,
            )

        logger.error("CAPTCHA wait timed out", max_wait_seconds=max_wait_seconds)
        return False


# Global singleton
captcha_handler = CaptchaHandler()
