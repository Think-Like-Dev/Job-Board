"""Deterministic score breakdown shared by the engine and the API."""

from pydantic import BaseModel


class ComponentScores(BaseModel):
    skills: float = 0.0
    experience: float = 0.0
    semantic: float = 0.0
    role: float = 0.0
    projects: float = 0.0
    certifications: float = 0.0
    education: float = 0.0
