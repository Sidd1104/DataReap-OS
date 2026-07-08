"""
OpenAI LLM Provider.
"""
from __future__ import annotations

from typing import Optional

from openai import AsyncOpenAI

from config.logging_config import get_logger
from config.settings import get_settings
from providers.base_provider import BaseLLMProvider, EnrichmentResult

logger = get_logger(__name__)
settings = get_settings()


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider (GPT-4o and friends)."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        super().__init__(model or settings.openai_model)
        self._api_key = api_key or settings.openai_api_key
        self._client: Optional[AsyncOpenAI] = None

    @property
    def provider_name(self) -> str:
        return "openai"

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=self._api_key)
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
                error="OpenAI API key not configured",
                provider=self.provider_name,
                model=self.model,
            )

        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a professional data research analyst. "
                            "Always respond with valid JSON only."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )

            raw_text = response.choices[0].message.content or ""
            tokens_used = response.usage.total_tokens if response.usage else 0

            data = self._parse_json_response(raw_text)
            result = self._build_result_from_json(data, raw_text)
            result.tokens_used = tokens_used
            return result

        except Exception as exc:
            logger.error("OpenAI enrichment failed", error=str(exc), exc_info=True)
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
            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Say OK"}],
                max_tokens=5,
            )
            return bool(response.choices)
        except Exception as exc:
            logger.warning("OpenAI connection test failed", error=str(exc))
            return False
