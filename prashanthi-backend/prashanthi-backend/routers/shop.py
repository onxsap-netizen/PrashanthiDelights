import hashlib, hmac, os, random, uuid
from datetime import timezone
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pymongo import ASCENDING, DESCENDING, IndexModel
from lib.db import INDEXES, db
from models.shop import (Login, Order, OrderIn, OrderItem, OrderPatch, Product,
                         ProductIn, ProductPatch, utcnow)

INDEXES["products"] = [IndexModel([("id", ASCENDING)], name="id", unique=True)]
INDEXES["orders"] = [
    IndexModel([("id", ASCENDING)], name="id", unique=True),
    IndexModel([("code", ASCENDING)], name="code"),
    IndexModel([("phone", ASCENDING)], name="phone"),
    IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
]
router = APIRouter()
NO_ID = {"_id": 0}

def _token() -> str:
    return hashlib.sha256((os.environ.get("ADMIN_PASSWORD", "prashanthi123") + "|prs").encode()).hexdigest()

async def require_admin(admin_session: Optional[str] = Cookie(None)) -> None:
    if not admin_session or not hmac.compare_digest(admin_session, _token()):
        raise HTTPException(status_code=401, detail="Admin sign-in required")

def _order(doc: dict) -> Order:
    if doc["created_at"].tzinfo is None:
        doc["created_at"] = doc["created_at"].replace(tzinfo=timezone.utc)
    return Order(**doc)

# ---------- public ----------
@router.get("/products", response_model=list[Product])
async def list_products():
    return await db.products.find({"available": True}, NO_ID).sort("category", 1).to_list(500)

@router.post("/orders", response_model=Order)
async def create_order(body: OrderIn):
    if body.mode == "Delivery" and not body.address.strip():
        raise HTTPException(422, "Delivery address is required")
    prods = {p["id"]: p async for p in db.products.find({"id": {"$in": [i.product_id for i in body.items]}, "available": True}, NO_ID)}
    items = []
    for l in body.items:
        p = prods.get(l.product_id)
        if not p:
            raise HTTPException(422, "An item in your basket is no longer available")
        items.append(OrderItem(name=p["name"], qty=l.qty, price=p["price"]))
    sub = sum(i.qty * i.price for i in items)
    fee = 60 if body.mode == "Delivery" and sub < 1500 else 0
    code = f"PRS-{random.randint(1000, 9999)}"
    while await db.orders.find_one({"code": code}):
        code = f"PRS-{random.randint(1000, 9999)}"
    order = Order(id=str(uuid.uuid4()), code=code, name=body.name.strip(), phone=body.phone.strip(), mode=body.mode,
                  slot=body.slot, address=body.address.strip(), payment_method=body.payment_method,
                  items=items, fee=fee, total=sub + fee, created_at=utcnow())
    await db.orders.insert_one(order.model_dump())
    return order

@router.get("/orders/track", response_model=list[Order])
async def track(q: str):
    q = q.strip()
    docs = await db.orders.find({"$or": [{"code": q.upper()}, {"phone": q}]}, NO_ID).sort("created_at", -1).to_list(10)
    return [_order(d) for d in docs]

# ---------- admin ----------
@router.post("/admin/login")
async def login(body: Login, response: Response):
    if not hmac.compare_digest(body.password, os.environ.get("ADMIN_PASSWORD", "prashanthi123")):
        raise HTTPException(401, "Wrong password")
    response.set_cookie("admin_session", _token(), httponly=True, samesite="lax", secure=os.environ.get("COOKIE_SECURE") == "1", max_age=60 * 60 * 12)
    return {"ok": True}

@router.post("/admin/logout")
async def logout(response: Response):
    response.delete_cookie("admin_session")
    return {"ok": True}

@router.get("/admin/me", dependencies=[Depends(require_admin)])
async def me():
    return {"ok": True}

@router.get("/admin/orders", response_model=list[Order], dependencies=[Depends(require_admin)])
async def admin_orders(status: Optional[str] = None):
    docs = await db.orders.find({"status": status} if status else {}, NO_ID).sort("created_at", -1).to_list(1000)
    return [_order(d) for d in docs]

@router.patch("/admin/orders/{id}", response_model=Order, dependencies=[Depends(require_admin)])
async def patch_order(id: str, body: OrderPatch):
    upd = body.model_dump(exclude_none=True)
    if upd:
        await db.orders.update_one({"id": id}, {"$set": upd})
    doc = await db.orders.find_one({"id": id}, NO_ID)
    if not doc:
        raise HTTPException(404, "Order not found")
    return _order(doc)

@router.get("/admin/products", response_model=list[Product], dependencies=[Depends(require_admin)])
async def admin_products():
    return await db.products.find({}, NO_ID).sort("category", 1).to_list(500)

@router.post("/admin/products", response_model=Product, dependencies=[Depends(require_admin)])
async def add_product(body: ProductIn):
    p = Product(**body.model_dump())
    await db.products.insert_one(p.model_dump())
    return p

@router.patch("/admin/products/{id}", response_model=Product, dependencies=[Depends(require_admin)])
async def patch_product(id: str, body: ProductPatch):
    upd = body.model_dump(exclude_none=True)
    if upd:
        await db.products.update_one({"id": id}, {"$set": upd})
    doc = await db.products.find_one({"id": id}, NO_ID)
    if not doc:
        raise HTTPException(404, "Item not found")
    return Product(**doc)

@router.delete("/admin/products/{id}", dependencies=[Depends(require_admin)])
async def del_product(id: str):
    await db.products.delete_one({"id": id})
    return {"ok": True}

@router.get("/admin/stats", dependencies=[Depends(require_admin)])
async def stats():
    docs = await db.orders.find({"status": {"$ne": "Cancelled"}}, NO_ID).to_list(5000)
    return {"orders": len(docs), "new": sum(d["status"] == "Pending" for d in docs),
            "collected": sum(d["total"] for d in docs if d["paid"]),
            "due": sum(d["total"] for d in docs if not d["paid"])}
