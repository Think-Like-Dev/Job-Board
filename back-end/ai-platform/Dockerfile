# ============================================================
# Build: resolve uv.lock into /app/.venv
# ============================================================

FROM python:3.14-slim AS builder

# shortcut: unpinned uv image, pin the tag once the build is proven
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


# ============================================================
# Runtime: no uv, no compiler, venv on PATH
# ============================================================

FROM python:3.14-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Tesseract for scanned (image-only) pages. Only the English language pack is
# installed: to support another language, add its pack here (for example
# `tesseract-ocr-tam`) and list it in AI_OCR_LANGUAGES. See the README.
# curl is not used by the app - it is there so an operator can probe the host
# model servers from inside this container, which is where the URLs in the
# README (`host.docker.internal:9931`) only exist. A slim image has no curl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        libgl1 \
        libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 appuser

COPY --from=builder --chown=appuser:appuser /app/.venv ./.venv

# No pyproject.toml at runtime: nothing here needs it, and the venv is already resolved.
COPY --chown=appuser:appuser alembic.ini ./
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser app ./app

USER appuser

EXPOSE 8000
