from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_providers_service, require_internal_token
from app.schemas.credentials import (
    CredentialCreate,
    CredentialRead,
    ProviderRead,
)
from app.services.providers_service import ProvidersService

router = APIRouter(prefix="/providers", dependencies=[Depends(require_internal_token)])


@router.get("", response_model=list[ProviderRead], summary="List providers and models")
async def list_providers(
    service: ProvidersService = Depends(get_providers_service),
) -> list[ProviderRead]:
    return await service.list_providers()


@router.get(
    "/credentials",
    response_model=list[CredentialRead],
    summary="List stored credentials (metadata only)",
)
async def list_credentials(
    service: ProvidersService = Depends(get_providers_service),
) -> list[CredentialRead]:
    return await service.list_credentials()


@router.post(
    "/credentials",
    response_model=CredentialRead,
    status_code=201,
    summary="Store an encrypted provider API key",
)
async def create_credential(
    payload: CredentialCreate,
    service: ProvidersService = Depends(get_providers_service),
) -> CredentialRead:
    return await service.create_credential(payload)


@router.patch(
    "/credentials/{credential_id}/toggle",
    response_model=CredentialRead,
    summary="Enable or disable a credential",
)
async def toggle_credential(
    credential_id: UUID,
    service: ProvidersService = Depends(get_providers_service),
) -> CredentialRead:
    return await service.toggle_credential(credential_id)
