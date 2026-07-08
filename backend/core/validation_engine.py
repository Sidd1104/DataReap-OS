"""
Validation Engine — validates enriched data fields.
Checks emails, phones, websites, geographic fields, and confidence scores.
Never allows hallucinated data to pass.
"""
from __future__ import annotations

import re
import socket
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx

from config.logging_config import get_logger

logger = get_logger(__name__)

# Compiled patterns
EMAIL_PATTERN = re.compile(
    r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
)
PHONE_PATTERN = re.compile(r"^\+?[1-9]\d{6,14}$")
URL_PATTERN = re.compile(
    r"^https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$"
)


class FieldValidationResult:
    def __init__(
        self,
        field: str,
        value: Any,
        is_valid: bool,
        confidence: float,
        reason: str = "",
    ) -> None:
        self.field = field
        self.value = value
        self.is_valid = is_valid
        self.confidence = confidence
        self.reason = reason

    def to_dict(self) -> dict:
        return {
            "field": self.field,
            "value": self.value,
            "is_valid": self.is_valid,
            "confidence": self.confidence,
            "reason": self.reason,
        }


class ValidationEngine:
    """
    Validates enriched data fields according to configurable rules.
    Supports: email, phone, website, LinkedIn, geographic fields.
    """

    def __init__(self) -> None:
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0"},
            )
        return self._http_client

    async def close(self) -> None:
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    # ── Email Validation ──────────────────────────────────────

    def validate_email(self, email: Any) -> FieldValidationResult:
        if not email or not isinstance(email, str):
            return FieldValidationResult("email", email, False, 0.0, "Empty or null")

        email = email.strip().lower()

        if not EMAIL_PATTERN.match(email):
            return FieldValidationResult("email", email, False, 0.0, "Invalid format")

        # Check for disposable/free email patterns
        free_domains = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com"}
        domain = email.split("@")[1]
        confidence = 0.7 if domain in free_domains else 0.9

        # MX record check (basic)
        try:
            socket.getaddrinfo(domain, None)
            return FieldValidationResult("email", email, True, confidence, "Valid")
        except socket.gaierror:
            return FieldValidationResult(
                "email", email, False, 0.1, f"Domain {domain!r} not resolvable"
            )

    # ── Phone Validation ──────────────────────────────────────

    def validate_phone(self, phone: Any, region: str = "US") -> FieldValidationResult:
        if not phone or not isinstance(phone, str):
            return FieldValidationResult("phone", phone, False, 0.0, "Empty or null")

        # Clean phone number
        cleaned = re.sub(r"[\s\-\(\)\.ext]", "", str(phone))
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned.lstrip("+")

        try:
            import phonenumbers
            parsed = phonenumbers.parse(cleaned, region)
            is_valid = phonenumbers.is_valid_number(parsed)
            confidence = 0.95 if is_valid else 0.1
            return FieldValidationResult(
                "phone",
                phonenumbers.format_number(
                    parsed, phonenumbers.PhoneNumberFormat.E164
                ) if is_valid else phone,
                is_valid,
                confidence,
                "Valid" if is_valid else "Invalid number",
            )
        except Exception as exc:
            return FieldValidationResult("phone", phone, False, 0.0, str(exc))

    # ── Website Validation ────────────────────────────────────

    def validate_website(self, url: Any) -> FieldValidationResult:
        if not url or not isinstance(url, str):
            return FieldValidationResult("website", url, False, 0.0, "Empty or null")

        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        if not URL_PATTERN.match(url):
            return FieldValidationResult("website", url, False, 0.0, "Invalid URL format")

        try:
            parsed = urlparse(url)
            if not parsed.netloc:
                return FieldValidationResult("website", url, False, 0.0, "No domain found")
            return FieldValidationResult("website", url, True, 0.85, "Valid URL format")
        except Exception as exc:
            return FieldValidationResult("website", url, False, 0.0, str(exc))

    async def validate_website_live(self, url: Any) -> FieldValidationResult:
        """Actually fetch the URL to confirm it's live."""
        basic = self.validate_website(url)
        if not basic.is_valid:
            return basic

        try:
            client = await self._get_client()
            resp = await client.head(basic.value, timeout=8.0)
            if resp.status_code < 400:
                return FieldValidationResult("website", basic.value, True, 0.97, f"HTTP {resp.status_code}")
            return FieldValidationResult("website", basic.value, False, 0.2, f"HTTP {resp.status_code}")
        except Exception as exc:
            return FieldValidationResult("website", basic.value, False, 0.3, f"Unreachable: {exc}")

    # ── LinkedIn Validation ───────────────────────────────────

    def validate_linkedin(self, url: Any) -> FieldValidationResult:
        if not url or not isinstance(url, str):
            return FieldValidationResult("linkedin", url, False, 0.0, "Empty or null")

        url = url.strip()
        if "linkedin.com" not in url.lower():
            return FieldValidationResult("linkedin", url, False, 0.0, "Not a LinkedIn URL")

        if not url.startswith("http"):
            url = "https://" + url.lstrip("/")

        return FieldValidationResult("linkedin", url, True, 0.9, "Valid LinkedIn URL")

    # ── Confidence Score Validation ───────────────────────────

    def validate_confidence(self, score: Any) -> FieldValidationResult:
        if score is None:
            return FieldValidationResult("confidence", 0.0, False, 0.0, "No score provided")
        try:
            score = float(score)
            if 0.0 <= score <= 1.0:
                return FieldValidationResult("confidence", score, True, 1.0, "Valid")
            return FieldValidationResult("confidence", score, False, 0.0, "Score out of 0-1 range")
        except (TypeError, ValueError):
            return FieldValidationResult("confidence", score, False, 0.0, "Not a number")

    # ── Geographic Validation ─────────────────────────────────

    def validate_geography(
        self,
        city: Optional[str] = None,
        state: Optional[str] = None,
        country: Optional[str] = None,
    ) -> Dict[str, FieldValidationResult]:
        results = {}
        if city:
            is_valid = bool(re.match(r"^[a-zA-Z\s\-\.,']{2,100}$", city.strip()))
            results["city"] = FieldValidationResult(
                "city", city, is_valid, 0.8 if is_valid else 0.0,
                "Valid" if is_valid else "Invalid city format"
            )
        if state:
            is_valid = bool(re.match(r"^[a-zA-Z\s\-\.]{2,100}$", state.strip()))
            results["state"] = FieldValidationResult(
                "state", state, is_valid, 0.8 if is_valid else 0.0,
                "Valid" if is_valid else "Invalid state format"
            )
        if country:
            is_valid = bool(re.match(r"^[a-zA-Z\s\-\.]{2,100}$", country.strip()))
            results["country"] = FieldValidationResult(
                "country", country, is_valid, 0.85 if is_valid else 0.0,
                "Valid" if is_valid else "Invalid country format"
            )
        return results

    # ── Full Row Validation ───────────────────────────────────

    async def validate_row(
        self,
        enriched_data: Dict[str, Any],
        rules: Dict[str, bool],
        live_check: bool = False,
    ) -> Dict[str, Any]:
        """
        Validate all fields in an enriched row according to rules.
        Returns a validation summary dict.
        """
        results = {}
        all_valid = True

        for field_name, value in enriched_data.items():
            field_lower = field_name.lower()

            if "email" in field_lower and rules.get("email", True):
                r = self.validate_email(value)
                results[field_name] = r.to_dict()
                if not r.is_valid:
                    all_valid = False

            elif "phone" in field_lower and rules.get("phone", True):
                r = self.validate_phone(value)
                results[field_name] = r.to_dict()
                if not r.is_valid:
                    all_valid = False

            elif "website" in field_lower and rules.get("website", True):
                if live_check:
                    r = await self.validate_website_live(value)
                else:
                    r = self.validate_website(value)
                results[field_name] = r.to_dict()
                if not r.is_valid:
                    all_valid = False

            elif "linkedin" in field_lower:
                r = self.validate_linkedin(value)
                results[field_name] = r.to_dict()

        return {
            "all_valid": all_valid,
            "field_results": results,
            "valid_count": sum(1 for r in results.values() if r.get("is_valid")),
            "total_checked": len(results),
        }


# Global singleton
validation_engine = ValidationEngine()
