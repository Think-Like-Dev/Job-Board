from fastapi import APIRouter

from app.api.v1.endpoints import ats, health, providers, system

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(providers.router, tags=["providers"])
api_router.include_router(ats.router, tags=["ats"])
api_router.include_router(system.router, tags=["system"])
