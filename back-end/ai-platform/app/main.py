import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.v1.endpoints import health as health_endpoints
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.rabbitmq import RabbitMqManager
from app.db.session import engine
from app.workers.outbox_relay import OutboxRelay
from app.workers.scoring_worker import ScoringWorker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs the broker consumers inside the FastAPI process.

    There is no separate worker service: the scoring consumer and the outbox
    relay live here, next to the HTTP API.
    """
    settings = get_settings()
    manager = RabbitMqManager(settings)
    worker = ScoringWorker(manager, settings=settings)
    relay = OutboxRelay(manager)

    try:
        await manager.connect()
    except Exception:
        logger.exception(
            "Could not connect to RabbitMQ; scoring and result publishing are disabled"
        )
    else:
        await worker.start()
        relay.start()

    app.state.rabbitmq = manager
    app.state.scoring_worker = worker
    app.state.outbox_relay = relay

    try:
        yield
    finally:
        await relay.stop()
        await worker.stop()
        await manager.close()
        await engine.dispose()


def create_app() -> FastAPI:
    """Build the FastAPI application. Kept as a factory for tests and workers."""
    settings = get_settings()
    # Uvicorn only configures its own loggers, so the root logger has no
    # handler: without this the service's own messages (the broker
    # connection, the scoring worker, the outbox relay) never reach the log.
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    logging.getLogger().setLevel(settings.log_level.upper())
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", include_in_schema=False)
    def root_health() -> dict[str, str]:
        """Alias for the versioned probe, so `curl host:8000/health` works."""
        return health_endpoints.health()

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code},
        )

    return app


app = create_app()
