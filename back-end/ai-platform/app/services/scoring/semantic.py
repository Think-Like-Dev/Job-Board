from __future__ import annotations

import math


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def score_semantic(
    candidate_vectors: list[list[float]],
    job_vector: list[float] | None,
) -> float:
    """The best similarity between a job and the candidate's chunks.

    A resume is a set of chunks (skills, one role, one qualification), so the
    match is the best chunk against the job, not one vector against another.
    """
    if not job_vector or not candidate_vectors:
        return 0.0

    best = max(cosine_similarity(candidate, job_vector) for candidate in candidate_vectors)
    return max(0.0, min(1.0, best)) * 100.0
