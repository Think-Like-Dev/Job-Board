from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.deps import get_matching_service, get_resume_service, require_internal_token
from app.core.config import Settings, get_settings
from app.schemas.ats import (
    EvaluateMatchRequest,
    EvaluateMatchResponse,
    ParseResumeResponse,
)
from app.services.matching_service import MatchingService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/ats", dependencies=[Depends(require_internal_token)])


@router.post(
    "/resumes/parse",
    response_model=ParseResumeResponse,
    summary="Parse a PDF/DOCX resume and cache the extraction by SHA-256",
)
async def parse_resume(
    file: Annotated[UploadFile, File(description="PDF or DOCX resume")],
    resume_file_id: UUID | None = Form(default=None, description="Garage/core file id"),
    service: ResumeService = Depends(get_resume_service),
    settings: Settings = Depends(get_settings),
) -> ParseResumeResponse:
    content = await file.read(settings.max_resume_bytes + 1)
    parsed = await service.parse(file.filename, content, resume_file_id)
    return ParseResumeResponse(
        resume_analysis_id=parsed.record.id,
        sha256=parsed.sha256,
        cached=parsed.cached,
        extracted=parsed.extracted,
        summary=parsed.record.summary,
    )


@router.post(
    "/matches/evaluate",
    response_model=EvaluateMatchResponse,
    summary="Score a parsed resume against a job description",
)
async def evaluate_match(
    payload: EvaluateMatchRequest,
    service: MatchingService = Depends(get_matching_service),
) -> EvaluateMatchResponse:
    return await service.evaluate(payload)
