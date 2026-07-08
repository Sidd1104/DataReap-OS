"""
Provider factory — instantiates the correct LLM provider from config.
"""
from __future__ import annotations

from typing import Optional

from providers.base_provider import BaseLLMProvider
from providers.gemini_provider import GeminiProvider
from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider
from config.settings import get_settings

settings = get_settings()

_PROVIDER_MAP = {
    "gemini": GeminiProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
}


def get_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> BaseLLMProvider:
    """Return an instantiated LLM provider by name."""
    name = (provider_name or settings.default_llm_provider).lower()
    cls = _PROVIDER_MAP.get(name)
    if cls is None:
        raise ValueError(
            f"Unknown provider {name!r}. Valid: {list(_PROVIDER_MAP.keys())}"
        )
    return cls(api_key=api_key, model=model)
