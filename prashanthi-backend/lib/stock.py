"""Stock keeping. A product with no `stock` value is not tracked (always available).

Stock is taken when an order is placed (so two people can't buy the last box) and given back if the
order is cancelled or an online payment is abandoned. All changes are single atomic Mongo updates.
"""
import os
from pymongo import ReturnDocument
from lib import settings
from lib.db import db

NO_ID = {"_id": 0}


def low_threshold() -> int:
    try:
        return max(0, int(settings.get("LOW_STOCK_AT", "5")))
    except ValueError:
        return 5


class OutOfStock(Exception):
    def __init__(self, name: str, left: int):
        self.name, self.left = name, left
        super().__init__(f"Only {left} left of {name}" if left > 0 else f"{name} is sold out")


async def reserve(lines: list[tuple[dict, int]]) -> tuple[list[dict], list[dict]]:
    """lines = [(product_doc, qty)]. Returns (reserved, low) where reserved=[{product_id, qty}] and
    low = products that have just dropped to / below the low-stock level. Raises OutOfStock and undoes
    everything it took if any line can't be covered."""
    reserved: list[dict] = []
    low: list[dict] = []
    thr = low_threshold()
    for p, qty in lines:
        if p.get("stock") is None:
            continue
        # one atomic "take qty if at least qty is there" update: two customers can never both get the last box
        res = await db.products.update_one({"id": p["id"], "stock": {"$gte": qty}}, {"$inc": {"stock": -qty}})
        after = await db.products.find_one({"id": p["id"]}, NO_ID) if res.matched_count else None
        if after is None:
            now = await db.products.find_one({"id": p["id"]}, NO_ID) or {}
            if now.get("stock") is None:   # owner stopped tracking it a moment ago: fine, carry on
                continue
            await release(reserved)
            raise OutOfStock(p["name"], int(now.get("stock") or 0))
        reserved.append({"product_id": p["id"], "qty": qty})
        if after["stock"] <= thr < after["stock"] + qty:
            low.append({"name": after["name"], "stock": after["stock"]})
    return reserved, low


async def release(reserved: list[dict]) -> None:
    for r in reserved:
        await db.products.update_one({"id": r["product_id"], "stock": {"$ne": None}}, {"$inc": {"stock": r["qty"]}})


async def release_order(order_id: str) -> bool:
    """Give an order's reserved stock back exactly once (safe to call repeatedly)."""
    before = await db.orders.find_one_and_update(
        {"id": order_id, "reserved.0": {"$exists": True}}, {"$set": {"reserved": []}},
        projection=NO_ID, return_document=ReturnDocument.BEFORE)
    if not before:
        return False
    await db.orders.update_one({"id": order_id}, {"$set": {"released": before["reserved"]}})
    await release(before["reserved"])
    return True


async def reserve_order_again(order_id: str) -> bool:
    """Take stock again for an order that was cancelled and is being reopened. False = not enough stock."""
    doc = await db.orders.find_one({"id": order_id}, NO_ID) or {}
    rel = doc.get("released") or []
    if not rel:
        return True
    prods = {p["id"]: p async for p in db.products.find({"id": {"$in": [r["product_id"] for r in rel]}}, NO_ID)}
    try:
        reserved, _ = await reserve([(prods[r["product_id"]], r["qty"]) for r in rel if r["product_id"] in prods])
    except OutOfStock:
        return False
    await db.orders.update_one({"id": order_id}, {"$set": {"reserved": reserved, "released": []}})
    return True
