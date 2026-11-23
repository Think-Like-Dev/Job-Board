"""Seed the provider/model catalog. Safe to re-run."""

from __future__ import annotations

import asyncio

from sqlmodel import select

from app.db.session import async_session_factory
from app.models.llm_config import AIModel, AIProvider

_PROVIDERS: list[dict[str, object]] = [
    {
        "code": "openai",
        "name": "OpenAI",
        "models": [
            ("gpt-4o", "GPT-4o"),
            ("gpt-4o-mini", "GPT-4o mini"),
        ],
    },
    {
        "code": "anthropic",
        "name": "Anthropic",
        "models": [
            ("claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet"),
            ("claude-3-5-haiku-20241022", "Claude 3.5 Haiku"),
        ],
    },
]


async def seed() -> None:
    async with async_session_factory() as session:
        for entry in _PROVIDERS:
            code = str(entry["code"])
            provider = (
                await session.exec(select(AIProvider).where(AIProvider.code == code))
            ).first()
            if provider is None:
                provider = AIProvider(
                    name=str(entry["name"]),
                    code=code,
                    is_active=True,
                )
                session.add(provider)
                await session.flush()

            for model_name, display_name in entry["models"]:  # type: ignore[union-attr]
                existing = (
                    await session.exec(
                        select(AIModel).where(
                            AIModel.provider_id == provider.id,
                            AIModel.model_name == model_name,
                        )
                    )
                ).first()
                if existing is None:
                    session.add(
                        AIModel(
                            provider_id=provider.id,
                            model_name=model_name,
                            display_name=display_name,
                            is_active=True,
                        )
                    )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
