"""
Base LLM Provider — abstract interface for all AI providers.
All concrete providers (Gemini, OpenAI, Anthropic) implement this.
"""
from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class EnrichmentResult:
    """Standardized result from any LLM provider."""
    success: bool
    fields: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    overall_confidence: float = 0.0
    raw_response: str = ""
    error: Optional[str] = None
    provider: str = ""
    model: str = ""
    tokens_used: int = 0
    notes: str = ""

    def get_field_value(self, field_name: str) -> Any:
        field_data = self.fields.get(field_name, {})
        return field_data.get("value")

    def get_field_confidence(self, field_name: str) -> float:
        field_data = self.fields.get(field_name, {})
        return float(field_data.get("confidence", 0.0))

    def to_flat_dict(self) -> Dict[str, Any]:
        """Returns a flat dict of field_name -> value for easy row merging."""
        return {k: v.get("value") for k, v in self.fields.items()}


class BaseLLMProvider(ABC):
    """Abstract base class for all LLM providers."""

    def __init__(self, model: str) -> None:
        self.model = model

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...

    @abstractmethod
    async def enrich(
        self,
        prompt: str,
        *,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> EnrichmentResult:
        """Send a prompt and return structured enrichment results."""
        ...

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test that the provider API is reachable and key is valid."""
        ...

    def _parse_json_response(self, raw: str) -> Dict[str, Any]:
        """
        Robustly extract JSON from LLM response.
        Handles markdown code blocks and trailing text.
        """
        # Try direct parse
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # Extract from markdown code block
        code_block = re.search(r"```(?:json)?\s*\n?([\s\S]+?)\n?```", raw)
        if code_block:
            try:
                return json.loads(code_block.group(1))
            except json.JSONDecodeError:
                pass

        # Find first { ... } block
        brace_match = re.search(r"\{[\s\S]+\}", raw)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Could not extract JSON from response: {raw[:200]}")

    def _build_result_from_json(
        self, data: Dict[str, Any], raw: str
    ) -> EnrichmentResult:
        """Build an EnrichmentResult from parsed JSON dict."""
        fields = data.get("fields", {})
        # Normalize field entries
        normalized = {}
        for field_name, field_data in fields.items():
            if isinstance(field_data, dict):
                normalized[field_name] = {
                    "value": field_data.get("value"),
                    "confidence": float(field_data.get("confidence", 0.0)),
                    "source_url": field_data.get("source_url"),
                }
            else:
                # Provider returned raw value without metadata
                normalized[field_name] = {
                    "value": field_data,
                    "confidence": 0.5,
                    "source_url": None,
                }

        return EnrichmentResult(
            success=True,
            fields=normalized,
            overall_confidence=float(data.get("overall_confidence", 0.0)),
            raw_response=raw,
            provider=self.provider_name,
            model=self.model,
            notes=data.get("notes", ""),
        )
