"""Dynamic provider resolution with structured output and failure fallback."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import TypeVar
from uuid import UUID

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.exceptions import (
    AllProvidersExhausted,
    NoActiveProvider,
    UnsupportedProvider,
)
from app.core.security import CredentialCipher
from app.models.llm_config import AICredential, AIModel, AIModelFailure, AIProvider

SchemaT = TypeVar("SchemaT", bound=BaseModel)

_FAILURE_MESSAGE_LIMIT = 2_000

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _Route:
    """Plain route data, so a rollback cannot expire it before the LLM call."""

    provider_code: str
    model_name: str
    credential_id: UUID
    model_id: UUID
    encrypted_api_key: str


def _is_permanent_auth_error(exc: Exception) -> bool:
    """Auth/permission failures reject every model on the same credential."""
    if type(exc).__name__ in {"AuthenticationError", "PermissionDeniedError"}:
        return True
    return getattr(exc, "status_code", None) in {401, 403}


class LLMOrchestrator:
    def __init__(
        self,
        session: AsyncSession,
        cipher: CredentialCipher,
        settings: Settings,
    ) -> None:
        self._session = session
        self._cipher = cipher
        self._settings = settings

    async def structured_output(
        self,
        schema: type[SchemaT],
        *,
        system: str,
        user: str,
    ) -> SchemaT:
        routes = await self._active_routes()
        if not routes:
            await self._session.rollback()
            raise NoActiveProvider(
                "No active AI provider/credential is configured; add one via /providers/credentials"
            )

        # Release the read transaction before any network call.
        await self._session.rollback()

        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        failures: list[str] = []
        deadline = time.monotonic() + self._settings.max_fallback_seconds
        bad_credentials: set[UUID] = set()

        for route in routes:
            if route.credential_id in bad_credentials:
                continue
            if time.monotonic() >= deadline:
                failures.append("fallback deadline reached")
                break

            api_key = ""
            try:
                remaining = max(
                    1.0,
                    min(
                        self._settings.http_timeout_seconds,
                        deadline - time.monotonic(),
                    ),
                )
                with self._cipher.decrypt(route.encrypted_api_key) as decrypted:
                    api_key = decrypted
                    chat = self._build_chat_model(
                        route.provider_code, route.model_name, api_key, remaining
                    )
                    runnable = chat.with_structured_output(schema)
                    result = await runnable.ainvoke(messages)
                if isinstance(result, schema):
                    return result
                return schema.model_validate(result)
            except UnsupportedProvider:
                raise
            except Exception as exc:
                if _is_permanent_auth_error(exc):
                    bad_credentials.add(route.credential_id)
                message = self._sanitize(str(exc), api_key)
                await self._record_failure(route.credential_id, route.model_id, exc, message)
                failures.append(f"{route.provider_code}/{route.model_name}: {type(exc).__name__}")
            finally:
                api_key = ""

        raise AllProvidersExhausted("Every active AI route failed: " + "; ".join(failures))

    async def _active_routes(self) -> list[_Route]:
        statement = (
            select(AIModel, AIProvider, AICredential)
            .join(AIProvider, AIModel.provider_id == AIProvider.id)
            .join(AICredential, AICredential.provider_id == AIProvider.id)
            .where(
                AIModel.is_active.is_(True),
                AIProvider.is_active.is_(True),
                AICredential.is_active.is_(True),
            )
            .order_by(AIProvider.created_at, AIModel.created_at, AICredential.created_at)
        )
        rows = (await self._session.exec(statement)).all()
        return [
            _Route(
                provider_code=provider.code,
                model_name=model.model_name,
                credential_id=credential.id,
                model_id=model.id,
                encrypted_api_key=credential.encrypted_api_key,
            )
            for model, provider, credential in rows
        ]

    def _build_chat_model(
        self, provider_code: str, model_name: str, api_key: str, timeout: float
    ) -> BaseChatModel:
        if provider_code == "openai":
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                timeout=timeout,
                max_retries=0,
            )
        if provider_code == "anthropic":
            return ChatAnthropic(
                model_name=model_name,
                api_key=api_key,
                timeout=timeout,
                max_retries=0,
            )
        raise UnsupportedProvider(f"Provider '{provider_code}' is not implemented")

    async def _record_failure(
        self,
        credential_id: UUID | None,
        model_id: UUID | None,
        exc: Exception,
        message: str,
    ) -> None:
        try:
            self._session.add(
                AIModelFailure(
                    credential_id=credential_id,
                    model_id=model_id,
                    error_type=type(exc).__name__,
                    error_message=message,
                )
            )
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            logger.exception("Could not record AI model failure")

    @staticmethod
    def _sanitize(message: str, api_key: str) -> str:
        if api_key:
            message = message.replace(api_key, "***")
        return message[:_FAILURE_MESSAGE_LIMIT]
