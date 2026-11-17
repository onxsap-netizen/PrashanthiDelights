import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel

load_dotenv()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "prashanthi")]
INDEXES: dict[str, list[IndexModel]] = {}


async def ensure_indexes() -> None:
    for name, idx in INDEXES.items():
        await db[name].create_indexes(idx)
