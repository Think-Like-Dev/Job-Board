"""BYOK catalog and credential management."""

from __future__ import annotations

from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.exceptions import CredentialNotFound, ProviderNotFound
from app.core.security import CredentialCipher
from app.models.llm_config import AICredential, AIModel, AIProvider
from app.schemas.credentials import (
    CredentialCreate,
    CredentialRead,
    ProviderModelRead,
    ProviderRead,
)


class ProvidersService:
    def __init__(self, session: AsyncSession, cipher: CredentialCipher) -> None:
        self._session = session
        self._cipher = cipher

    async def list_providers(self) -> list[ProviderRead]:
        providers = (await self._session.exec(select(AIProvider).order_by(AIProvider.name))).all()
        models = (await self._session.exec(select(AIModel).order_by(AIModel.display_name))).all()
        by_provider: dict[UUID, list[ProviderModelRead]] = {}
        for model in models:
            by_provider.setdefault(model.provider_id, []).append(
                ProviderModelRead(
                    id=model.id,
                    model_name=model.model_name,
                    display_name=model.display_name,
                    is_active=model.is_active,
                )
            )
        return [
            ProviderRead(
                id=provider.id,
                name=provider.name,
                code=provider.code,
                is_active=provider.is_active,
                models=by_provider.get(provider.id, []),
            )
            for provider in providers
        ]

    async def list_credentials(self) -> list[CredentialRead]:
        statement = (
            select(AICredential, AIProvider)
            .join(AIProvider, AICredential.provider_id == AIProvider.id)
            .order_by(AICredential.created_at.desc())
        )
        rows = (await self._session.exec(statement)).all()
        return [self._to_read(credential, provider) for credential, provider in rows]

    async def create_credential(self, payload: CredentialCreate) -> CredentialRead:
        provider = (
            await self._session.exec(
                select(AIProvider).where(AIProvider.code == payload.provider_code)
            )
        ).first()
        if provider is None:
            raise ProviderNotFound(f"Unknown provider '{payload.provider_code}'")

        credential = AICredential(
            provider_id=provider.id,
            encrypted_api_key=self._cipher.encrypt(payload.api_key),
            key_last_four=payload.api_key[-4:],
            is_active=True,
        )
        self._session.add(credential)
        await self._session.commit()
        await self._session.refresh(credential)
        return self._to_read(credential, provider)

    async def toggle_credential(self, credential_id: UUID) -> CredentialRead:
        credential = await self._session.get(AICredential, credential_id)
        if credential is None:
            raise CredentialNotFound(f"Credential '{credential_id}' was not found")
        credential.is_active = not credential.is_active
        await self._session.commit()
        await self._session.refresh(credential)
        provider = await self._session.get(AIProvider, credential.provider_id)
        if provider is None:
            raise ProviderNotFound("Credential provider no longer exists")
        return self._to_read(credential, provider)

    @staticmethod
    def _to_read(credential: AICredential, provider: AIProvider) -> CredentialRead:
        return CredentialRead(
            id=credential.id,
            provider_code=provider.code,
            provider_name=provider.name,
            key_last_four=credential.key_last_four,
            is_active=credential.is_active,
            created_at=credential.created_at,
        )
