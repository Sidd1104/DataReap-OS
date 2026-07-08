"""
General validators — shared validation utilities used across the platform.
"""
from __future__ import annotations

import re
from typing import Any, Optional


def is_valid_email(email: Any) -> bool:
    if not email or not isinstance(email, str):
        return False
    pattern = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
    return bool(pattern.match(email.strip()))


def is_valid_url(url: Any) -> bool:
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    pattern = re.compile(r"^https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$")
    return bool(pattern.match(url))


def sanitize_string(value: Any, max_length: int = 500) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    # Remove null bytes and control characters
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    return cleaned[:max_length] if cleaned else None


def normalize_phone(phone: Any) -> Optional[str]:
    """Normalize a phone number to E.164 format if possible."""
    if not phone or not isinstance(phone, str):
        return None
    try:
        import phonenumbers
        parsed = phonenumbers.parse(phone, "US")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
    except Exception:
        pass
    return sanitize_string(phone, 30)


def clean_linkedin_url(url: Any) -> Optional[str]:
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if "linkedin.com" not in url.lower():
        return None
    if not url.startswith("http"):
        url = "https://" + url.lstrip("/")
    return url


def validate_confidence(score: Any) -> float:
    """Clamp confidence score to [0.0, 1.0]."""
    try:
        v = float(score)
        return max(0.0, min(1.0, v))
    except (TypeError, ValueError):
        return 0.0
