"""
Notification Service — sends alerts via Email, Telegram, Discord, and Slack.
All channels are optional; silently skips unconfigured channels.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from config.logging_config import get_logger
from config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


class NotificationService:
    """Multi-channel notification dispatcher."""

    async def send(
        self,
        title: str,
        message: str,
        level: str = "info",
        job_id: Optional[str] = None,
    ) -> None:
        """Send notification to all configured channels."""
        full_message = f"[{level.upper()}] {title}\n{message}"
        if job_id:
            full_message += f"\nJob ID: {job_id}"

        tasks = []
        if settings.notify_email and settings.smtp_username:
            tasks.append(self._send_email(title, full_message))
        if settings.telegram_bot_token and settings.telegram_chat_id:
            tasks.append(self._send_telegram(full_message))
        if settings.discord_webhook_url:
            tasks.append(self._send_discord(title, message, level))
        if settings.slack_bot_token:
            tasks.append(self._send_slack(title, message, level))

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception):
                    logger.warning("Notification channel failed", error=str(r))

    async def _send_email(self, subject: str, body: str) -> None:
        try:
            import aiosmtplib
            from email.mime.text import MIMEText

            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = f"[AI Enrichment] {subject}"
            msg["From"] = settings.smtp_from
            msg["To"] = settings.notify_email

            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_username,
                password=settings.smtp_password,
                use_tls=False,
                start_tls=True,
            )
            logger.info("Email notification sent", to=settings.notify_email)
        except Exception as exc:
            logger.error("Email notification failed", error=str(exc))
            raise

    async def _send_telegram(self, message: str) -> None:
        try:
            import httpx

            url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    url,
                    json={
                        "chat_id": settings.telegram_chat_id,
                        "text": message[:4096],
                        "parse_mode": "HTML",
                    },
                    timeout=10.0,
                )
                resp.raise_for_status()
            logger.info("Telegram notification sent")
        except Exception as exc:
            logger.error("Telegram notification failed", error=str(exc))
            raise

    async def _send_discord(self, title: str, message: str, level: str) -> None:
        try:
            import httpx

            color_map = {"info": 0x5865F2, "warning": 0xFEE75C, "error": 0xED4245, "success": 0x57F287}
            color = color_map.get(level.lower(), 0x5865F2)

            payload = {
                "embeds": [
                    {
                        "title": f"🤖 {title}",
                        "description": message[:2000],
                        "color": color,
                    }
                ]
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    settings.discord_webhook_url, json=payload, timeout=10.0
                )
                resp.raise_for_status()
            logger.info("Discord notification sent")
        except Exception as exc:
            logger.error("Discord notification failed", error=str(exc))
            raise

    async def _send_slack(self, title: str, message: str, level: str) -> None:
        try:
            from slack_sdk.web.async_client import AsyncWebClient

            client = AsyncWebClient(token=settings.slack_bot_token)
            await client.chat_postMessage(
                channel=settings.slack_channel,
                text=f"*{title}*\n{message}",
                username="AI Enrichment Platform",
                icon_emoji=":robot_face:",
            )
            logger.info("Slack notification sent")
        except Exception as exc:
            logger.error("Slack notification failed", error=str(exc))
            raise

    async def notify_job_complete(self, job_id: str, job_name: str, stats: dict) -> None:
        await self.send(
            title=f"Job Complete: {job_name}",
            message=(
                f"✅ Enrichment completed\n"
                f"Total: {stats.get('total_rows', 0)}\n"
                f"Success: {stats.get('success_rows', 0)}\n"
                f"Failed: {stats.get('failed_rows', 0)}"
            ),
            level="success",
            job_id=job_id,
        )

    async def notify_job_failed(self, job_id: str, job_name: str, error: str) -> None:
        await self.send(
            title=f"Job Failed: {job_name}",
            message=f"❌ Error: {error}",
            level="error",
            job_id=job_id,
        )


# Global singleton
notification_service = NotificationService()
