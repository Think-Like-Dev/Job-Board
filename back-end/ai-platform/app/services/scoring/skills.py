"""Deterministic skill matching with light canonicalisation."""

from __future__ import annotations

import re

# Common spellings for the same skill, applied after normalisation.
_ALIASES = {
    "react js": "react",
    "react.js": "react",
    "reactjs": "react",
    "node": "nodejs",
    "node js": "nodejs",
    "node.js": "nodejs",
    "postgres": "postgresql",
    "postgre sql": "postgresql",
    "js": "javascript",
    "ts": "typescript",
    "golang": "go",
    "k8s": "kubernetes",
}
# Tokens whose punctuation carries meaning and must survive normalisation.
_COMPOUND = {"c++": "cpp", "c#": "csharp", ".net": "dotnet"}


def _normalise(value: str) -> str:
    text = value.lower().strip()
    for token, replacement in _COMPOUND.items():
        text = text.replace(token, f" {replacement} ")
    text = re.sub(r"\(.*?\)", " ", text)  # drop "(3.11)" style detail
    text = re.sub(r"(?<=[a-z])\d+(?:\.\d+)*", " ", text)  # python3.11 -> python
    text = re.sub(r"\b\d+(?:\.\d+)*\b", " ", text)  # 3.11 -> (gone)
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    normalised = " ".join(text.split())
    return _ALIASES.get(normalised, normalised)


def skill_tokens(value: str) -> set[str]:
    return set(_normalise(value).split())


def contains_skill(text: str, skill: str) -> bool:
    """True when every word of ``skill`` appears in ``text``."""
    wanted = skill_tokens(skill)
    return bool(wanted) and wanted <= skill_tokens(text)


def score_skills(
    candidate_skills: list[str],
    must_have: list[str],
    nice_to_have: list[str],
) -> tuple[float, list[str], list[str]]:
    """0.70 must-have coverage + 0.30 nice-to-have coverage.

    No requirement lists at all means the JD says nothing about skills, so the
    component is worth nothing; an empty JD must not look like a perfect match.
    """
    candidate = {_normalise(skill) for skill in candidate_skills}
    must_hits = [skill for skill in must_have if _normalise(skill) in candidate]
    nice_hits = [skill for skill in nice_to_have if _normalise(skill) in candidate]
    missing = [skill for skill in must_have if _normalise(skill) not in candidate]

    if not must_have and not nice_to_have:
        return 0.0, [], []

    must_score = len(must_hits) / len(must_have) * 100.0 if must_have else 0.0
    nice_score = len(nice_hits) / len(nice_to_have) * 100.0 if nice_to_have else 0.0
    if must_have and nice_to_have:
        score = 0.70 * must_score + 0.30 * nice_score
    else:
        score = must_score if must_have else nice_score

    return score, must_hits + nice_hits, missing
