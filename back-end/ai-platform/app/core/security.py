"""AES-256-GCM helpers for BYOK provider credentials."""

from __future__ import annotations

import base64
import os
from collections.abc import Iterator
from contextlib import contextmanager

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError

_NONCE_BYTES = 12
_KEY_BYTES = 32


class CredentialCipher:
    """Encrypts API keys at rest and decrypts them only inside a request block."""

    def __init__(self, encoded_key: str) -> None:
        if not encoded_key:
            raise ConfigurationError("AI_ENCRYPTION_KEY is not configured")
        try:
            key = base64.urlsafe_b64decode(encoded_key)
        except Exception as exc:
            raise ConfigurationError("AI_ENCRYPTION_KEY must be urlsafe base64") from exc
        if len(key) != _KEY_BYTES:
            raise ConfigurationError("AI_ENCRYPTION_KEY must decode to 32 bytes")
        self._aes = AESGCM(key)

    def encrypt(self, plaintext: str) -> str:
        nonce = os.urandom(_NONCE_BYTES)
        ciphertext = self._aes.encrypt(nonce, plaintext.encode("utf-8"), None)
        return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")

    @contextmanager
    def decrypt(self, token: str) -> Iterator[str]:
        raw = base64.urlsafe_b64decode(token)
        value = self._aes.decrypt(raw[:_NONCE_BYTES], raw[_NONCE_BYTES:], None).decode("utf-8")
        try:
            yield value
        finally:
            # Python strings cannot be wiped; drop the reference as early as possible.
            value = ""


def get_cipher() -> CredentialCipher:
    return CredentialCipher(get_settings().encryption_key)
