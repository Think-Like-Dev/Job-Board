from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.constants import EMBEDDING_DIM


def _db(name: str) -> AliasChoices:
    """AI_DATABASE_* wins; bare DATABASE_* stays as the fallback so both
    services can share one env file without overwriting each other's host."""
    return AliasChoices(f"AI_DATABASE_{name}", f"DATABASE_{name}")


def _alias(*names: str) -> AliasChoices:
    """First name wins. Used so the AI service can read the shared env file
    (RABBITMQ_*, S3_*) while still allowing an AI_-prefixed override."""
    return AliasChoices(*names)


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

    # ── Embedding model (swappable) ────────────────────────────────────────
    # The model and its vector size are configuration, never constants baked
    # into the schema. Changing the size also needs an Alembic migration
    # (ALTER COLUMN ... TYPE vector(N) + rebuild the HNSW index) and a re-embed
    # via `app/scripts/convert_embeddings.py`.
    #
    # `multilingual-e5-small` covers 100 languages and is 384-dimensional — the
    # same size as the schema — so a job description in one language and a
    # resume in another can still be compared.
    local_embedding_model: str = Field(
        default="multilingual-e5-small", validation_alias="AI_LOCAL_EMBEDDING_MODEL"
    )
    embedding_dim: int = Field(default=EMBEDDING_DIM, validation_alias="AI_EMBEDDING_DIM", gt=0)
    embedding_base_url: str = Field(default="", validation_alias="AI_EMBEDDING_BASE_URL")
    # E5-style models expect an asymmetric prefix: the job description is a
    # query, the resume passages are passages.
    embedding_query_prefix: str = Field(
        default="query: ", validation_alias="AI_EMBEDDING_QUERY_PREFIX"
    )
    embedding_passage_prefix: str = Field(
        default="passage: ", validation_alias="AI_EMBEDDING_PASSAGE_PREFIX"
    )

    # ── OCR (Tesseract) ─────────────────────────────────────────────────────
    # The language packs installed in the image. English only for now; another
    # language means installing its Tesseract pack (see the ai-platform
    # README).
    ocr_languages: str = Field(default="eng", validation_alias="AI_OCR_LANGUAGES")
    # A page with fewer characters than this is treated as image-only and sent
    # to OCR instead of the text extractor.
    ocr_page_char_threshold: int = Field(
        default=40, validation_alias="AI_OCR_PAGE_CHAR_THRESHOLD", gt=0
    )

    # ── Local chat model (OpenAI-compatible, no API key) ───────────────────
    # The user runs the model themselves; the service only needs the endpoint.
    local_llm_base_url: str = Field(default="", validation_alias="AI_LOCAL_LLM_BASE_URL")
    local_llm_model: str = Field(default="", validation_alias="AI_LOCAL_LLM_MODEL")
    local_llm_api_key: str = Field(default="", validation_alias="AI_LOCAL_LLM_API_KEY")

    # ── Object storage (Garage / S3) ───────────────────────────────────────
    # The shared env file carries the bare S3_* names; AI_* wins when set.
    storage_endpoint: str = Field(
        default="http://localhost:3900",
        validation_alias=_alias("AI_STORAGE_ENDPOINT", "S3_ENDPOINT"),
    )
    storage_region: str = Field(
        default="garage", validation_alias=_alias("AI_STORAGE_REGION", "S3_REGION")
    )
    storage_access_key: str = Field(
        default="", validation_alias=_alias("AI_STORAGE_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID")
    )
    storage_secret_key: str = Field(
        default="",
        validation_alias=_alias("AI_STORAGE_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"),
    )
    storage_bucket: str = Field(
        default="jobboard-files",
        validation_alias=_alias("AI_STORAGE_BUCKET", "S3_BUCKET_NAME"),
    )
    storage_force_path_style: bool = Field(
        default=True,
        validation_alias=_alias("AI_STORAGE_FORCE_PATH_STYLE", "S3_FORCE_PATH_STYLE"),
    )

    # ── RabbitMQ ───────────────────────────────────────────────────────────
    rabbitmq_host: str = Field(
        default="localhost", validation_alias=_alias("AI_RABBITMQ_HOST", "RABBITMQ_HOST")
    )
    rabbitmq_port: int = Field(
        default=5672, validation_alias=_alias("AI_RABBITMQ_PORT", "RABBITMQ_PORT")
    )
    rabbitmq_user: str = Field(
        default="guest", validation_alias=_alias("AI_RABBITMQ_USER", "RABBITMQ_USER")
    )
    rabbitmq_password: str = Field(
        default="guest",
        validation_alias=_alias("AI_RABBITMQ_PASSWORD", "RABBITMQ_PASSWORD"),
    )
    rabbitmq_vhost: str = Field(
        default="/", validation_alias=_alias("AI_RABBITMQ_VHOST", "RABBITMQ_VHOST")
    )

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

    @property
    def rabbitmq_url(self) -> str:
        """AMQP URL for aio-pika."""
        user = quote_plus(self.rabbitmq_user)
        password = quote_plus(self.rabbitmq_password)
        vhost = self.rabbitmq_vhost.strip("/")
        suffix = f"/{vhost}" if vhost else ""
        return f"amqp://{user}:{password}@{self.rabbitmq_host}:{self.rabbitmq_port}{suffix}"

    @property
    def has_local_llm(self) -> bool:
        """A local model server is configured (endpoint + model name)."""
        return bool(self.local_llm_base_url and self.local_llm_model)


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()
