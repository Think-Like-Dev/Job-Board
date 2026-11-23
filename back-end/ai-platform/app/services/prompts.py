"""Shared LLM prompts used by both the HTTP services and the LangGraph nodes."""

from __future__ import annotations

import json

from app.schemas.job_match import JobSpec
from app.schemas.resume import ResumeExtractionSchema

RESUME_EXTRACTION_SYSTEM = """You extract structured data from resumes.
Return only the requested fields. Never invent employers, dates, degrees, certifications, or skills.
A skill is a technology, tool, language, framework or platform — never a section
heading, a job title, or a sentence. Copy the exact token from the resume, and
split a comma-separated list into separate skills. If the resume has no
experience section, return an empty list. Use the candidate's own wording for
skills and achievements — keep the original language, do not translate it.
Normalise dates to YYYY-MM when possible. Leave a field empty when the resume
does not state it."""

JOB_ANALYSIS_SYSTEM = """You turn a job description into structured hiring requirements.
Classify every skill as must-have only when the description says it is mandatory or
clearly core to the role; otherwise use nice-to-have. Infer the seniority level from
the title and responsibilities. Set min_years_experience from the stated requirement,
or 0 when none is stated. Do not invent requirements. Keep the summary to two sentences."""

EVALUATION_SYSTEM = """You are a senior technical recruiter writing a concise candidate
assessment. The numeric score is computed separately; do not restate or change it.
Base every claim on the supplied resume and job requirements.
Write `fit_analysis` as at most five bullet points, one point per line, each starting
with "- " and no longer than 25 words: the closest matches, the gaps that matter, and
what to probe in the interview.
Leave education out of the bullets unless the job description asks for a qualification
or the candidate studied at a widely recognised institution (an IIT, NIT or equivalent);
when it does, use one bullet at most.
Give two or three strengths, two or three risks, and three interview questions:
put each one in the matching list, not in the summary.
Answer with the four keys `fit_analysis`, `strengths`, `risks` and
`interview_questions`, and nothing else.
Never repeat a field name, a schema name, an error message or a list of skills
as a strength. Write a sentence a recruiter would say to a colleague.
Write every piece of text in the requested output language, whatever language the
resume and the job description are written in. Keep skill and tool names as they
appear in the source; translate only the prose."""


def evaluation_user_prompt(
    resume: ResumeExtractionSchema,
    spec: JobSpec,
    max_chars: int,
    output_language: str = "en",
) -> str:
    """The prose context for the narrative.

    The component scores are deliberately absent: the model echoed their keys
    as "strengths" and as the fit analysis. It reasons from the resume and the
    job requirements, which is all a narrative needs.
    """
    payload = {
        "output_language": output_language,
        "resume": resume.model_dump(mode="json"),
        "job_requirements": spec.model_dump(mode="json"),
    }
    return json.dumps(payload, indent=2)[:max_chars]
