"""
Anthropic Claude LLM Provider.
"""
from __future__ import annotations

from typing import Optional

import anthropic

from config.logging_config import get_logger
from config.settings import get_settings
from providers.base_provider import BaseLLMProvider, EnrichmentResult

logger = get_logger(__name__)
settings = get_settings()


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude API provider."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        super().__init__(model or settings.anthropic_model)
        self._api_key = api_key or settings.anthropic_api_key
        self._client: Optional[anthropic.AsyncAnthropic] = None

    @property
    def provider_name(self) -> str:
        return "anthropic"

    def _get_client(self) -> anthropic.AsyncAnthropic:
        if self._client is None:
            self._client = anthropic.AsyncAnthropic(api_key=self._api_key)
        return self._client

    async def enrich(
        self,
        prompt: str,
        *,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> EnrichmentResult:
        if not self._api_key:
            return EnrichmentResult(
                success=False,
                error="Anthropic API key not configured",
                provider=self.provider_name,
                model=self.model,
            )

        try:
            client = self._get_client()
            response = await client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=(
                    "You are a professional data research analyst. "
                    "Always respond with valid JSON only. "
                    "Do not include any text outside the JSON object."
                ),
                messages=[{"role": "user", "content": prompt}],
            )

            raw_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    raw_text += block.text

            tokens_used = (
                response.usage.input_tokens + response.usage.output_tokens
                if response.usage
                else 0
            )

            data = self._parse_json_response(raw_text)
            result = self._build_result_from_json(data, raw_text)
            result.tokens_used = tokens_used
            return result

        except Exception as exc:
            logger.error("Anthropic enrichment failed", error=str(exc), exc_info=True)
            return EnrichmentResult(
                success=False,
                error=str(exc),
                provider=self.provider_name,
                model=self.model,
            )

    async def test_connection(self) -> bool:
        if not self._api_key:
            return False
        try:
            client = self._get_client()
            response = await client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": "Say OK"}],
            )
            return bool(response.content)
        except Exception as exc:
            logger.warning("Anthropic connection test failed", error=str(exc))
            return False
