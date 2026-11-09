"""FastAPI dependency wiring."""

from __future__ import annotations

import secrets

from fastapi import Depends, Header, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security import CredentialCipher, get_cipher
from app.db.session import get_session
from app.services.embedding_service import EmbeddingService
from app.services.job_service import JobService
from app.services.matching_service import MatchingService
from app.services.orchestrator import LLMOrchestrator
from app.services.parser import DocumentParser
from app.services.providers_service import ProvidersService
from app.services.resume_service import ResumeService


def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    expected = get_settings().internal_token
    if not expected:
        raise HTTPException(status_code=503, detail="AI_INTERNAL_TOKEN is not configured")
    if not secrets.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail="Invalid internal token")


def get_parser(settings: Settings = Depends(get_settings)) -> DocumentParser:
    return DocumentParser(settings.max_resume_bytes)


def get_orchestrator(
    session: AsyncSession = Depends(get_session),
    cipher: CredentialCipher = Depends(get_cipher),
    settings: Settings = Depends(get_settings),
) -> LLMOrchestrator:
    return LLMOrchestrator(session, cipher, settings)


def get_providers_service(
    session: AsyncSession = Depends(get_session),
    cipher: CredentialCipher = Depends(get_cipher),
) -> ProvidersService:
    return ProvidersService(session, cipher)


def get_resume_service(
    session: AsyncSession = Depends(get_session),
    parser: DocumentParser = Depends(get_parser),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
    settings: Settings = Depends(get_settings),
) -> ResumeService:
    return ResumeService(session, parser, orchestrator, settings)


def get_job_service(
    session: AsyncSession = Depends(get_session),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
    settings: Settings = Depends(get_settings),
) -> JobService:
    return JobService(session, orchestrator, settings)


def get_embedding_service(
    session: AsyncSession = Depends(get_session),
    cipher: CredentialCipher = Depends(get_cipher),
    settings: Settings = Depends(get_settings),
) -> EmbeddingService:
    return EmbeddingService(session, cipher, settings)


def get_matching_service(
    session: AsyncSession = Depends(get_session),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
    embedder: EmbeddingService = Depends(get_embedding_service),
    job_service: JobService = Depends(get_job_service),
    settings: Settings = Depends(get_settings),
) -> MatchingService:
    return MatchingService(session, orchestrator, embedder, job_service, settings)
