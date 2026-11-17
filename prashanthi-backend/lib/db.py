import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel

load_dotenv()


def _env(name: str, default: str = "") -> str:
    # strip stray spaces / quotes that sneak in when pasting values into a dashboard
    return os.environ.get(name, default).strip().strip('"').strip("'")


_url = _env("MONGO_URL")
if not _url:
    raise RuntimeError("MONGO_URL is not set. Add it in Vercel > Settings > Environment Variables and redeploy.")
client = AsyncIOMotorClient(_url, serverSelectionTimeoutMS=8000)
db = client[_env("DB_NAME", "prashanthi")]
INDEXES: dict[str, list[IndexModel]] = {}


async def ensure_indexes() -> None:
    for name, idx in INDEXES.items():
        await db[name].create_indexes(idx)
