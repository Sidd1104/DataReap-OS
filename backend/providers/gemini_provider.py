"""
Google Gemini LLM Provider.
"""
from __future__ import annotations

from typing import Optional

import google.generativeai as genai

from config.logging_config import get_logger
from config.settings import get_settings
from providers.base_provider import BaseLLMProvider, EnrichmentResult

logger = get_logger(__name__)
settings = get_settings()


class GeminiProvider(BaseLLMProvider):
    """Google Gemini API provider."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        super().__init__(model or settings.gemini_model)
        self._api_key = api_key or settings.gemini_api_key
        if self._api_key:
            genai.configure(api_key=self._api_key)
        self._client: Optional[genai.GenerativeModel] = None

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _get_model(self) -> genai.GenerativeModel:
        if self._client is None:
            generation_config = genai.GenerationConfig(
                temperature=0.1,
                top_p=0.95,
                top_k=40,
                response_mime_type="application/json",
            )
            self._client = genai.GenerativeModel(
                model_name=self.model,
                generation_config=generation_config,
            )
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
                error="Gemini API key not configured",
                provider=self.provider_name,
                model=self.model,
            )

        try:
            model = self._get_model()
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    response_mime_type="application/json",
                ),
            )

            raw_text = response.text
            tokens_used = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                tokens_used = getattr(
                    response.usage_metadata, "total_token_count", 0
                )

            data = self._parse_json_response(raw_text)
            result = self._build_result_from_json(data, raw_text)
            result.tokens_used = tokens_used
            return result

        except Exception as exc:
            logger.error("Gemini enrichment failed", error=str(exc), exc_info=True)
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
            model = genai.GenerativeModel(self.model)
            response = await model.generate_content_async("Reply with: OK")
            return bool(response.text)
        except Exception as exc:
            logger.warning("Gemini connection test failed", error=str(exc))
            return False
