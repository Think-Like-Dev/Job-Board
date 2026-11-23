"""Shared LLM prompts used by both the HTTP services and the LangGraph nodes."""

from __future__ import annotations

import json

from app.schemas.job_match import JobSpec
from app.schemas.resume import ResumeExtractionSchema
from app.schemas.scoring import ComponentScores

RESUME_EXTRACTION_SYSTEM = """You extract structured data from resumes.
Return only the requested fields. Never invent employers, dates, degrees, or skills.
Use the candidate's own wording for skills and achievements. Normalise dates to
YYYY-MM when possible. Leave a field empty when the resume does not state it."""

JOB_ANALYSIS_SYSTEM = """You turn a job description into structured hiring requirements.
Classify every skill as must-have only when the description says it is mandatory or
clearly core to the role; otherwise use nice-to-have. Infer the seniority level from
the title and responsibilities. Set min_years_experience from the stated requirement,
or 0 when none is stated. Do not invent requirements. Keep the summary to two sentences."""

EVALUATION_SYSTEM = """You are a senior technical recruiter writing a concise candidate
assessment. The numeric score is computed separately; do not restate or change it.
Base every claim on the supplied resume and job requirements. Return at most three
strengths, at most three risks, and three tailored interview questions."""


def evaluation_user_prompt(
    resume: ResumeExtractionSchema,
    spec: JobSpec,
    components: ComponentScores,
    max_chars: int,
) -> str:
    payload = {
        "resume": resume.model_dump(mode="json"),
        "job_requirements": spec.model_dump(mode="json"),
        "component_scores": components.model_dump(),
    }
    return json.dumps(payload, indent=2)[:max_chars]
