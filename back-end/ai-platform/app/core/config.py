from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _db(name: str) -> AliasChoices:
    """AI_DATABASE_* wins; bare DATABASE_* stays as the fallback so both
    services can share one env file without overwriting each other's host."""
    return AliasChoices(f"AI_DATABASE_{name}", f"DATABASE_{name}")


class Settings(BaseSettings):
    """Process configuration. AI-owned variables use the ``AI_`` prefix;
    database credentials prefer ``AI_DATABASE_*`` so this service can point at
    its own Postgres instance.
    """

    model_config = SettingsConfigDict(
        env_prefix="AI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Platform API"
    app_version: str = "0.1.0"
    environment: str = "local"
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"

    database_host: str = Field(default="localhost", validation_alias=_db("HOST"))
    database_port: int = Field(default=5432, validation_alias=_db("PORT"))
    database_user: str = Field(default="jobboard", validation_alias=_db("USER"))
    database_password: str = Field(default="", validation_alias=_db("PASSWORD"))
    database_name: str = "job_board_ai_ats"
    database_echo: bool = False
    database_url_override: str | None = Field(default=None, validation_alias="AI_DATABASE_URL")

    encryption_key: str = ""
    internal_token: str = ""

    http_timeout_seconds: int = 30
    max_fallback_seconds: int = 45
    embedding_model: str = "text-embedding-3-small"
    max_resume_bytes: int = 10 * 1024 * 1024
    min_resume_text_chars: int = 200
    max_text_chars: int = 50_000
    # text-embedding-3-small accepts ~8k tokens; ~3 chars/token keeps a margin.
    max_embedding_chars: int = 24_000

    @property
    def database_url(self) -> str:
        """Async SQLAlchemy DSN. A direct ``AI_DATABASE_URL`` wins."""
        if self.database_url_override:
            return self.database_url_override
        user = quote_plus(self.database_user)
        password = quote_plus(self.database_password)
        return (
            f"postgresql+asyncpg://{user}:{password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()
