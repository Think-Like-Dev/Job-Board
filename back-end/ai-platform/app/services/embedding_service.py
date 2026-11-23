"""Embedding generation with per-resume/per-job caching."""

from __future__ import annotations

from uuid import UUID

from langchain_openai import OpenAIEmbeddings
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.exceptions import NoActiveProvider
from app.core.security import CredentialCipher
from app.models.ats import JobAnalysis, JobEmbedding, ResumeAnalysis, ResumeEmbedding
from app.models.llm_config import AICredential, AIProvider
from app.services.canonical import embedding_text

# Where embeddings come from: `(base_url, model, api_key, dimensions)`.
# `base_url` None means the default OpenAI endpoint; `dimensions` None means
# the model decides (the local servers do not accept the parameter).
EmbeddingRoute = tuple[str | None, str, str, int | None]


class EmbeddingService:
    """Semantic scoring is optional: without a provider, callers score on the rest."""

    def __init__(
        self,
        session: AsyncSession,
        cipher: CredentialCipher,
        settings: Settings,
    ) -> None:
        self._session = session
        self._cipher = cipher
        self._settings = settings

    @property
    def model_name(self) -> str:
        """The model the vectors are produced with."""
        return self._settings.local_embedding_model or self._settings.embedding_model

    async def has_embedding_provider(self) -> bool:
        return await self._embedding_route() is not None

    async def ensure_resume_embedding(self, resume: ResumeAnalysis) -> list[float] | None:
        if not await self.has_embedding_provider():
            return None

        resume_id = resume.id
        existing = await self._cached_resume(resume_id)
        if existing is not None:
            return existing

        text = embedding_text(
            canonical_text=resume.canonical_text,
            extracted_data=resume.extracted_data,
            raw_text=resume.raw_text,
            summary=resume.summary,
        )
        if not text:
            return None
        vector = await self.embed(text)
        self._session.add(
            ResumeEmbedding(
                resume_analysis_id=resume_id,
                embedding=vector,
                model=self.model_name,
            )
        )
        try:
            await self._session.commit()
        except IntegrityError:
            # A concurrent worker embedded the same resume first; reuse its vector.
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
                model=self.model_name,
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
        """Embeds a text with no prefix."""
        return await self._embed(text, prefix="")

    async def embed_query(self, text: str) -> list[float]:
        """Embeds a job description.

        E5-style models are asymmetric: a job description is a `query` and a
        resume passage is a `passage`. The prefixes are configuration because
        they belong to the model, not to the model server.
        """
        return await self._embed(text, prefix=self._settings.embedding_query_prefix)

    async def embed_passage(self, text: str) -> list[float]:
        """Embeds a piece of a resume."""
        return await self._embed(text, prefix=self._settings.embedding_passage_prefix)

    async def _embed(self, text: str, *, prefix: str) -> list[float]:
        route = await self._embedding_route()
        if route is None:
            raise NoActiveProvider(
                "No active embedding provider is configured; embeddings require one"
            )
        base_url, model, encrypted_key, dimensions = route

        api_key = ""
        try:
            if encrypted_key:
                with self._cipher.decrypt(encrypted_key) as decrypted:
                    api_key = decrypted
                    vectors = await self._embed_with(
                        model, api_key, base_url, dimensions, prefix + text
                    )
            else:
                # The local model server needs no key.
                api_key = "local"
                vectors = await self._embed_with(
                    model, api_key, base_url, dimensions, prefix + text
                )
        finally:
            api_key = ""

        return vectors[0]

    async def _embed_with(
        self,
        model: str,
        api_key: str,
        base_url: str | None,
        dimensions: int | None,
        text: str,
    ) -> list[list[float]]:
        embeddings = OpenAIEmbeddings(
            model=model,
            api_key=api_key,
            base_url=base_url,
            dimensions=dimensions,
            timeout=self._settings.http_timeout_seconds,
            max_retries=0,
        )
        return await embeddings.aembed_documents([text[: self._settings.max_embedding_chars]])

    async def _embedding_route(self) -> EmbeddingRoute | None:
        """Where embeddings come from: a stored provider or the local server."""
        credential = await self._openai_credential()
        if credential is not None:
            return (
                None,
                self._settings.embedding_model,
                credential.encrypted_api_key,
                self._settings.embedding_dim,
            )

        # The local model server speaks the OpenAI-compatible API and needs no
        # key. It does not accept a `dimensions` parameter, so the size comes
        # from the model itself.
        if self._settings.embedding_base_url and self._settings.local_embedding_model:
            return (
                self._settings.embedding_base_url,
                self._settings.local_embedding_model,
                "",
                None,
            )

        return None

    async def _cached_resume(self, resume_id: UUID) -> list[float] | None:
        record = (
            await self._session.exec(
                select(ResumeEmbedding).where(
                    ResumeEmbedding.resume_analysis_id == resume_id,
                    ResumeEmbedding.model == self.model_name,
                )
            )
        ).first()
        return record.embedding if record is not None else None

    async def _cached_job(self, job_id: UUID) -> list[float] | None:
        record = (
            await self._session.exec(
                select(JobEmbedding).where(
                    JobEmbedding.job_id == job_id,
                    JobEmbedding.model == self.model_name,
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
