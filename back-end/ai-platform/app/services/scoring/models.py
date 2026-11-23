from dataclasses import dataclass

from app.schemas.scoring import ComponentScores


@dataclass(frozen=True)
class DeterministicScore:
    score: float
    components: ComponentScores
    matching_skills: list[str]
    missing_skills: list[str]
    knockout_reason: str | None
