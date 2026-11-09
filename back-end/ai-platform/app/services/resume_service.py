"""Resume extraction and persistence."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.constants import EXTRACTION_VERSION
from app.core.exceptions import UnreadableDocument
from app.models.ats import ResumeAnalysis
from app.schemas.resume import ResumeExtractionSchema
from app.services.orchestrator import LLMOrchestrator
from app.services.parser import DocumentParser
from app.services.prompts import RESUME_EXTRACTION_SYSTEM


@dataclass(frozen=True)
class ParsedResume:
    sha256: str
    raw_text: str
    extracted: ResumeExtractionSchema
    cached: bool
    record: ResumeAnalysis


class ResumeService:
    def __init__(
        self,
        session: AsyncSession,
        parser: DocumentParser,
        orchestrator: LLMOrchestrator,
        settings: Settings,
    ) -> None:
        self._session = session
        self._parser = parser
        self._orchestrator = orchestrator
        self._settings = settings

    async def parse(
        self,
        filename: str | None,
        content: bytes,
        resume_file_id: UUID | None = None,
    ) -> ParsedResume:
        sha256 = hashlib.sha256(content).hexdigest()
        cached = await self._find_by_hash(sha256)
        if cached is not None:
            return await self._with_file_id(cached, resume_file_id)

        # Close the read transaction so the slow parser/LLM calls hold no pooled DB connection.
        await self._session.rollback()

        document = await self._parser.extract(filename, content)
        if len(document.text) < self._settings.min_resume_text_chars:
            raise UnreadableDocument(
                "The resume has too little extractable text; "
                "the profile snapshot fallback is required"
            )

        extracted = await self.extract_from_text(document.text)
        record = ResumeAnalysis(
            resume_file_id=resume_file_id,
            source_filename=filename,
            sha256=sha256,
            extraction_version=EXTRACTION_VERSION,
            raw_text=document.text[: self._settings.max_text_chars],
            extracted_data=extracted.model_dump(mode="json"),
            summary=extracted.executive_summary,
        )
        self._session.add(record)
        try:
            await self._session.commit()
        except IntegrityError:
            # Another request stored the same file first; use its row.
            await self._session.rollback()
            existing = await self._find_by_hash(sha256)
            if existing is None:
                raise
            return await self._with_file_id(existing, resume_file_id)

        await self._session.refresh(record)
        return ParsedResume(
            sha256=sha256,
            raw_text=document.text,
            extracted=extracted,
            cached=False,
            record=record,
        )

    async def extract_from_text(self, text: str) -> ResumeExtractionSchema:
        return await self._orchestrator.structured_output(
            ResumeExtractionSchema,
            system=RESUME_EXTRACTION_SYSTEM,
            user=text[: self._settings.max_text_chars],
        )

    async def _with_file_id(
        self, record: ResumeAnalysis, resume_file_id: UUID | None
    ) -> ParsedResume:
        if resume_file_id is not None and record.resume_file_id is None:
            record.resume_file_id = resume_file_id
            await self._session.commit()
        return self._parsed(record, cached=True)

    @staticmethod
    def _parsed(record: ResumeAnalysis, *, cached: bool) -> ParsedResume:
        return ParsedResume(
            sha256=record.sha256,
            raw_text=record.raw_text,
            extracted=ResumeExtractionSchema.model_validate(record.extracted_data),
            cached=cached,
            record=record,
        )

    async def _find_by_hash(self, sha256: str) -> ResumeAnalysis | None:
        return (
            await self._session.exec(
                select(ResumeAnalysis).where(
                    ResumeAnalysis.sha256 == sha256,
                    ResumeAnalysis.extraction_version == EXTRACTION_VERSION,
                )
            )
        ).first()
