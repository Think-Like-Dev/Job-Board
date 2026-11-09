"""Embedding generation with per-resume/per-job caching."""

from __future__ import annotations

from uuid import UUID

from langchain_openai import OpenAIEmbeddings
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.constants import EMBEDDING_DIM
from app.core.exceptions import NoActiveProvider
from app.core.security import CredentialCipher
from app.models.ats import JobAnalysis, JobEmbedding, ResumeAnalysis, ResumeEmbedding
from app.models.llm_config import AICredential, AIProvider


class EmbeddingService:
    """Semantic scoring is optional: without an OpenAI key, callers score on the rest."""

    def __init__(
        self,
        session: AsyncSession,
        cipher: CredentialCipher,
        settings: Settings,
    ) -> None:
        self._session = session
        self._cipher = cipher
        self._settings = settings

    async def has_embedding_provider(self) -> bool:
        return await self._openai_credential() is not None

    async def ensure_resume_embedding(self, resume: ResumeAnalysis) -> list[float] | None:
        if not await self.has_embedding_provider():
            return None

        resume_id = resume.id
        existing = await self._cached_resume(resume_id)
        if existing is not None:
            return existing

        vector = await self.embed(resume.raw_text or resume.summary)
        self._session.add(
            ResumeEmbedding(
                resume_analysis_id=resume_id,
                embedding=vector,
                model=self._settings.embedding_model,
            )
        )
        try:
            await self._session.commit()
        except IntegrityError:
            # A concurrent request embedded the same resume first; reuse its vector.
            await self._session.rollback()
            cached = await self._cached_resume(resume_id)
            if cached is None:
                raise
            return cached
        return vector

    async def ensure_job_embedding(self, job: JobAnalysis) -> list[float] | None:
        if not await self.has_embedding_provider():
            return None

        job_id = job.job_id
        if job_id is not None:
            existing = await self._cached_job(job_id)
            if existing is not None:
                return existing

        vector = await self.embed(job.summary or str(job.extracted_data))
        if job_id is None:
            return vector

        self._session.add(
            JobEmbedding(
                job_id=job_id,
                embedding=vector,
                model=self._settings.embedding_model,
            )
        )
        try:
            await self._session.commit()
        except IntegrityError:
            await self._session.rollback()
            cached = await self._cached_job(job_id)
            if cached is None:
                raise
            return cached
        return vector

    async def embed(self, text: str) -> list[float]:
        credential = await self._openai_credential()
        if credential is None:
            raise NoActiveProvider(
                "No active OpenAI credential is configured; embeddings require one"
            )
        api_key = ""
        try:
            with self._cipher.decrypt(credential.encrypted_api_key) as decrypted:
                api_key = decrypted
                # Release the read transaction before the external call.
                await self._session.rollback()
                embeddings = OpenAIEmbeddings(
                    model=self._settings.embedding_model,
                    api_key=api_key,
                    dimensions=EMBEDDING_DIM,
                    timeout=self._settings.http_timeout_seconds,
                    max_retries=0,
                )
                vectors = await embeddings.aembed_documents(
                    [text[: self._settings.max_embedding_chars]]
                )
        finally:
            api_key = ""
        return vectors[0]

    async def _cached_resume(self, resume_id: UUID) -> list[float] | None:
        record = (
            await self._session.exec(
                select(ResumeEmbedding).where(
                    ResumeEmbedding.resume_analysis_id == resume_id,
                    ResumeEmbedding.model == self._settings.embedding_model,
                )
            )
        ).first()
        return record.embedding if record is not None else None

    async def _cached_job(self, job_id: UUID) -> list[float] | None:
        record = (
            await self._session.exec(
                select(JobEmbedding).where(
                    JobEmbedding.job_id == job_id,
                    JobEmbedding.model == self._settings.embedding_model,
                )
            )
        ).first()
        return record.embedding if record is not None else None

    async def _openai_credential(self) -> AICredential | None:
        statement = (
            select(AICredential)
            .join(AIProvider, AICredential.provider_id == AIProvider.id)
            .where(
                AIProvider.code == "openai",
                AIProvider.is_active.is_(True),
                AICredential.is_active.is_(True),
            )
            .order_by(AICredential.created_at)
        )
        return (await self._session.exec(statement)).first()
