from __future__ import annotations

from datetime import date, datetime, timedelta

from app.schemas.job_match import JobSpec
from app.schemas.resume import ExperienceEntry
from app.services.scoring.skills import contains_skill

_DATE_FORMATS = ("%Y-%m", "%Y-%m-%d", "%b %Y", "%B %Y", "%Y")
_FRESHNESS_DAYS = 730
_FRESHNESS_PENALTY = 0.85


def parse_month(value: str | None) -> date | None:
    if not value:
        return None
    cleaned = value.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _intervals(entries: list[ExperienceEntry], today: date) -> list[tuple[date, date]]:
    intervals: list[tuple[date, date]] = []
    for entry in entries:
        start = parse_month(entry.start_date)
        if start is None:
            continue
        end = parse_month(entry.end_date) or today
        if end >= start:
            intervals.append((start, end))
    return sorted(intervals)


def merged_months(entries: list[ExperienceEntry], today: date) -> float:
    intervals = _intervals(entries, today)
    if not intervals:
        return 0.0

    total_days = 0
    current_start, current_end = intervals[0]
    for start, end in intervals[1:]:
        if start <= current_end:
            current_end = max(current_end, end)
        else:
            total_days += (current_end - current_start).days
            current_start, current_end = start, end
    total_days += (current_end - current_start).days
    return total_days / 30.4375


def score_experience(
    entries: list[ExperienceEntry],
    spec: JobSpec,
    today: date | None = None,
) -> float:
    today = today or date.today()
    years = merged_months(entries, today) / 12.0
    required = spec.min_years_experience

    base = 100.0 if required <= 0 else min(100.0, years / required * 100.0)

    if spec.must_have_skills:
        cutoff = today - timedelta(days=_FRESHNESS_DAYS)
        recent_text = " ".join(
            " ".join([entry.role, entry.company, *entry.achievements])
            for entry in entries
            if (parse_month(entry.end_date) or today) >= cutoff
        ).lower()
        if not any(contains_skill(recent_text, skill) for skill in spec.must_have_skills):
            base *= _FRESHNESS_PENALTY

    return base
