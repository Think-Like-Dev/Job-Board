"""Deterministic plain-text rendering of an extracted resume.

The structured extraction is the source of truth. Embeddings are computed from
this rendering rather than from the raw PDF text, so the vector describes what
the pipeline actually understood. The rendering is stable: the same extraction
always produces the same text, which keeps a re-embedding reproducible.

The JSON stays in `resume_analysis.extracted_data` for portability. When the
embedding model changes, the stored JSON is rendered again and embedded with
the new model; the PDF is never parsed or extracted a second time.
"""

from __future__ import annotations

from app.schemas.resume import EducationEntry, ExperienceEntry, ResumeExtractionSchema

# The fallback summary written when the model could not read the resume. It is
# a marker, not content, so it never reaches an embedding or a score.
FALLBACK_SUMMARY = "Candidate profile snapshot (resume text was unreadable)."


def render_resume_text(extracted: ResumeExtractionSchema) -> str:
    """Renders the extraction as sectioned plain text, omitting empty sections."""
    sections: list[str] = []

    identity = _identity(extracted)
    if identity:
        sections.append(identity)

    summary = _real_summary(extracted)
    if summary:
        sections.append(f"SUMMARY\n{summary}")

    if extracted.skills:
        sections.append("SKILLS\n" + ", ".join(_unique(extracted.skills)))

    if extracted.experience:
        sections.append("EXPERIENCE\n" + "\n\n".join(_experience(e) for e in extracted.experience))

    if extracted.projects:
        sections.append(
            "PROJECTS\n" + "\n".join(f"- {item}" for item in _unique(extracted.projects))
        )

    if extracted.education:
        sections.append("EDUCATION\n" + "\n".join(_education(e) for e in extracted.education))

    if extracted.certifications:
        sections.append(
            "CERTIFICATIONS\n"
            + "\n".join(f"- {item}" for item in _unique(extracted.certifications))
        )

    return "\n\n".join(sections).strip()


def embedding_text(
    *,
    canonical_text: str,
    extracted_data: dict | None,
    raw_text: str,
    summary: str,
) -> str:
    """The text an embedding is computed from.

    New rows carry `canonical_text`. Rows written before that column existed
    are rendered from their stored JSON on demand, so a model swap never needs
    a new extraction. Raw text is only the last resort for a row whose
    extraction produced nothing at all.
    """
    if canonical_text and canonical_text.strip():
        return canonical_text.strip()

    if extracted_data:
        try:
            rendered = render_resume_text(ResumeExtractionSchema.model_validate(extracted_data))
        except Exception:
            rendered = ""
        if rendered:
            return rendered

    return (raw_text or summary or "").strip()


def is_empty_extraction(extracted: ResumeExtractionSchema | None) -> bool:
    """True when the extraction carries no candidate data at all.

    A student with education but no experience is not empty. An object with
    every list empty and only the fallback summary is.
    """
    if extracted is None:
        return True
    return not (
        extracted.skills
        or extracted.experience
        or extracted.education
        or extracted.certifications
        or extracted.projects
        or _real_summary(extracted)
    )


def _identity(extracted: ResumeExtractionSchema) -> str:
    name = " ".join(part for part in (extracted.first_name, extracted.last_name) if part).strip()
    contact = " | ".join(
        part for part in (extracted.email, extracted.phone, extracted.location) if part
    )
    return "\n".join(part for part in (name, contact) if part)


def _real_summary(extracted: ResumeExtractionSchema) -> str:
    summary = (extracted.executive_summary or "").strip()
    return "" if summary == FALLBACK_SUMMARY else summary


def _experience(entry: ExperienceEntry) -> str:
    heading = " at ".join(part for part in (entry.role, entry.company) if part).strip()
    dates = _dates(entry.start_date, entry.end_date)
    if dates:
        heading = f"{heading} ({dates})" if heading else dates
    lines = [heading] if heading else []
    lines.extend(f"- {achievement}" for achievement in entry.achievements if achievement)
    return "\n".join(lines)


def _education(entry: EducationEntry) -> str:
    degree = " in ".join(part for part in (entry.degree, entry.field_of_study) if part).strip()
    text = ", ".join(part for part in (degree, entry.institution) if part).strip()
    if entry.graduation_year:
        text = f"{text} ({entry.graduation_year})" if text else str(entry.graduation_year)
    return text


def _dates(start: str | None, end: str | None) -> str:
    if start and end:
        return f"{start} - {end}"
    return start or end or ""


def _unique(values: list[str]) -> list[str]:
    """Keeps the first spelling of each value, case-insensitively."""
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        text = value.strip()
        key = text.casefold()
        if text and key not in seen:
            seen.add(key)
            result.append(text)
    return result
