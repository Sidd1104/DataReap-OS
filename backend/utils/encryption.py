"""
Encryption utility — Fernet symmetric encryption for storing secrets in DB.
Used by AppSettingModel for API keys and tokens.
"""
from __future__ import annotations

import base64
from typing import Optional

from config.logging_config import get_logger
from config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


def _get_fernet():
    """Lazily import and instantiate Fernet with the configured key."""
    from cryptography.fernet import Fernet, InvalidToken

    key = settings.encryption_key
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )

    # Ensure key is bytes
    if isinstance(key, str):
        key = key.encode()

    return Fernet(key), InvalidToken


def encrypt(plaintext: str) -> str:
    """Encrypt a string value. Returns base64-encoded ciphertext."""
    if not plaintext:
        return plaintext
    try:
        fernet, _ = _get_fernet()
        return fernet.encrypt(plaintext.encode()).decode()
    except Exception as exc:
        logger.error("Encryption failed", error=str(exc))
        raise


def decrypt(ciphertext: str) -> str:
    """Decrypt a previously encrypted value. Returns plaintext."""
    if not ciphertext:
        return ciphertext
    try:
        fernet, InvalidToken = _get_fernet()
        return fernet.decrypt(ciphertext.encode()).decode()
    except Exception as exc:
        logger.error("Decryption failed", error=str(exc))
        raise


def generate_key() -> str:
    """Generate a new Fernet key (for onboarding setup)."""
    from cryptography.fernet import Fernet
    return Fernet.generate_key().decode()


def safe_decrypt(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt with fallback — returns None on failure."""
    if not ciphertext:
        return None
    try:
        return decrypt(ciphertext)
    except Exception:
        return None
