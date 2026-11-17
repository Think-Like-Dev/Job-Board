"""Probes the local chat model with the three prompts the pipeline sends.

The point is to find out whether the model server is up, whether it honours a
JSON schema, and how long one call takes - without a database, RabbitMQ or a
resume upload. Run it whenever a model file is swapped:

    uv run python -m app.scripts.probe_local_model
    uv run python -m app.scripts.probe_local_model --language ta

It exits non-zero when any of the three prompts does not produce an object
that matches its schema.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time

from app.core.config import get_settings
from app.schemas.job_match import JobSpec, QualitativeEvaluationSchema
from app.schemas.resume import ResumeExtractionSchema
from app.schemas.scoring import ComponentScores
from app.services.job_spec import build_deterministic_job_spec
from app.services.local_llm import structured_output
from app.services.prompts import (
    EVALUATION_SYSTEM,
    JOB_ANALYSIS_SYSTEM,
    RESUME_EXTRACTION_SYSTEM,
    evaluation_user_prompt,
)

SAMPLE_RESUME = """Priya Raman
priya.raman@example.com | +91 90000 00000 | Chennai, India

Summary
Backend engineer with 5 years building payment APIs.

Skills
Python, FastAPI, PostgreSQL, RabbitMQ, Docker, AWS

Experience
Senior Backend Engineer, Acme Payments (2021-03 - present)
- Built the ledger service in Python and FastAPI, 40k requests/min.
- Moved the async pipeline to RabbitMQ and cut settlement lag to two minutes.

Backend Engineer, Nimbus Software (2019-06 - 2021-02)
- Wrote the billing API in Django and PostgreSQL.

Education
B.E. Computer Science, Anna University, 2019

Certifications
AWS Certified Developer - Associate (2022)
"""

SAMPLE_JOB = """Senior Backend Engineer (Payments)

We are looking for a senior backend engineer to own our payments platform.
You will design Python services, work with PostgreSQL, and run event-driven
pipelines on RabbitMQ. Docker and AWS experience is required. Experience with
FastAPI is a plus. At least 5 years of backend experience is expected.
"""


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--language",
        default="en",
        help="the output language the narrative is asked for (default: en)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=None,
        help="per-call timeout in seconds (default: the configured one)",
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.has_local_llm:
        print(
            "No local model is configured: set AI_LOCAL_LLM_BASE_URL and AI_LOCAL_LLM_MODEL.",
            file=sys.stderr,
        )
        return 2

    timeout = args.timeout or settings.local_llm_timeout_seconds
    print(f"local model: {settings.local_llm_base_url} ({settings.local_llm_model})")
    print(
        f"limits: {settings.local_llm_max_input_chars} chars in, "
        f"{settings.local_llm_max_tokens} tokens out, {timeout:.0f} s per call"
    )

    failures = 0

    started = time.monotonic()
    try:
        extracted = await structured_output(
            settings,
            ResumeExtractionSchema,
            system=RESUME_EXTRACTION_SYSTEM,
            user=SAMPLE_RESUME,
            timeout=timeout,
        )
        print(
            f"resume extraction   ok  {time.monotonic() - started:5.1f}s  "
            f"skills={len(extracted.skills)} experience={len(extracted.experience)} "
            f"education={len(extracted.education)}"
        )
    except Exception as exc:
        failures += 1
        extracted = ResumeExtractionSchema()
        print(f"resume extraction   FAILED  {type(exc).__name__}: {exc}")

    started = time.monotonic()
    try:
        spec = await structured_output(
            settings,
            JobSpec,
            system=JOB_ANALYSIS_SYSTEM,
            user=SAMPLE_JOB,
            timeout=timeout,
        )
        print(
            f"job analysis        ok  {time.monotonic() - started:5.1f}s  "
            f"seniority={spec.seniority.value} must={len(spec.must_have_skills)} "
            f"nice={len(spec.nice_to_have_skills)}"
        )
    except Exception as exc:
        failures += 1
        spec = build_deterministic_job_spec(
            title="Senior Backend Engineer",
            description_text=SAMPLE_JOB,
            skills=[],
            years_of_experience=None,
        )
        print(f"job analysis        FAILED  {type(exc).__name__}: {exc}")

    started = time.monotonic()
    try:
        evaluation = await structured_output(
            settings,
            QualitativeEvaluationSchema,
            system=EVALUATION_SYSTEM,
            user=evaluation_user_prompt(
                extracted,
                spec,
                ComponentScores(skills=70, experience=60, semantic=75, role=80),
                settings.local_llm_max_input_chars,
                args.language,
            ),
            timeout=timeout,
        )
        print(
            f"evaluation          ok  {time.monotonic() - started:5.1f}s  "
            f"summary={len(evaluation.fit_analysis)} chars "
            f"strengths={len(evaluation.strengths)} risks={len(evaluation.risks)} "
            f"questions={len(evaluation.interview_questions)}"
        )
        if evaluation.fit_analysis:
            print(f"\n  {evaluation.fit_analysis[:400]}")
    except Exception as exc:
        failures += 1
        print(f"evaluation          FAILED  {type(exc).__name__}: {exc}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
