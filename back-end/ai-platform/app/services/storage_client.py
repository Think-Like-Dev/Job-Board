"""Reads resume bytes from object storage (Garage / S3).

The core API never copies resume bytes into a message: the event carries the
storage key and this client fetches the object. No presigned URLs are used —
they expire, and an at-least-once redelivery can happen hours later.
"""

from __future__ import annotations

import asyncio
import logging
from functools import lru_cache

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import Settings, get_settings
from app.core.exceptions import UnreadableDocument

logger = logging.getLogger(__name__)


class StorageClient:
    """Fetches stored objects by key."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = boto3.client(
            "s3",
            endpoint_url=self._settings.storage_endpoint,
            region_name=self._settings.storage_region,
            aws_access_key_id=self._settings.storage_access_key or None,
            aws_secret_access_key=self._settings.storage_secret_key or None,
            config=Config(
                signature_version="s3v4",
                s3={
                    "addressing_style": (
                        "path" if self._settings.storage_force_path_style else "auto"
                    )
                },
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    async def read(self, key: str) -> bytes:
        """Returns the object's bytes.

        The blocking boto3 call runs in a worker thread so the event loop
        keeps serving other messages.
        """
        try:
            return await asyncio.to_thread(self._read_sync, key)
        except UnreadableDocument:
            raise
        except (BotoCoreError, ClientError) as exc:
            raise UnreadableDocument(
                f"The stored resume could not be read ({type(exc).__name__})"
            ) from exc

    def _read_sync(self, key: str) -> bytes:
        response = self._client.get_object(Bucket=self._settings.storage_bucket, Key=key)
        body = response["Body"].read()
        limit = self._settings.max_resume_bytes
        if len(body) > limit:
            raise UnreadableDocument(
                f"The stored resume is larger than the {limit // (1024 * 1024)} MB limit"
            )
        return body


@lru_cache
def get_storage_client() -> StorageClient:
    """Process-wide storage client."""
    return StorageClient()
