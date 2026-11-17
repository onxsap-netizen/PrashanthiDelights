import os
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware
from lib.db import ensure_indexes
from routers.shop import router as shop_router

app = FastAPI(title="Prashanthi Delights")
api_router = APIRouter(prefix="/api")
api_router.include_router(shop_router)


@api_router.get("/")
async def health():
    return {"ok": True}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await ensure_indexes()
