import logging, os
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware
from lib.db import ensure_indexes
from routers.shop import router as shop_router

log = logging.getLogger("prashanthi")
app = FastAPI(title="Prashanthi Delights")
api_router = APIRouter(prefix="/api")
api_router.include_router(shop_router)


@api_router.get("/")
async def health():
    return {"ok": True}


app.include_router(api_router)
_origins = [o.strip().strip('"') for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Index creation must never stop the API from starting (e.g. index already exists with other options).
    try:
        await ensure_indexes()
    except Exception as e:  # noqa: BLE001
        log.warning("ensure_indexes failed: %s", e)
