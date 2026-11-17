import base64, hashlib, hmac, json, os, random, uuid, zlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel
from pymongo import ASCENDING, DESCENDING, IndexModel
from lib import razorpay, settings, stock, whatsapp
from lib.db import INDEXES, db
from models.shop import (Login, NotifyIn, Order, OrderIn, OrderItem, OrderPatch, PayStart, PayVerify, Product,
                         ProductIn, ProductPatch, ProofIn, norm_phone, utcnow)

INDEXES["products"] = [IndexModel([("id", ASCENDING)], name="id", unique=True)]
INDEXES["orders"] = [
    IndexModel([("id", ASCENDING)], name="id", unique=True),
    IndexModel([("code", ASCENDING)], name="code"),
    IndexModel([("phone", ASCENDING)], name="phone"),
    IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    IndexModel([("rzp_order_id", ASCENDING)], name="rzp_order_id", sparse=True),
]
INDEXES["notifications"] = [IndexModel([("created_at", DESCENDING)], name="created", expireAfterSeconds=90 * 86400)]
IST = ZoneInfo("Asia/Kolkata")
UNPAID_ONLINE_MINUTES = 30   # an online order nobody paid for is cancelled and its stock released
async def _load_settings() -> None:
    await settings.load()   # dashboard-saved keys (cached for a few seconds)

router = APIRouter(dependencies=[Depends(_load_settings)])
NO_ID = {"_id": 0}
ONLINE_ONLY = True   # every new order must be paid online (no cash on delivery / pay at store)

def _token() -> str:
    return hashlib.sha256((os.environ.get("ADMIN_PASSWORD", "prashanthi123") + "|prs").encode()).hexdigest()

async def require_admin(admin_session: Optional[str] = Cookie(None)) -> None:
    if not admin_session or not hmac.compare_digest(admin_session, _token()):
        raise HTTPException(status_code=401, detail="Admin sign-in required")

def _order(doc: dict) -> Order:
    if doc["created_at"].tzinfo is None:
        doc["created_at"] = doc["created_at"].replace(tzinfo=timezone.utc)
    doc["has_proof"] = bool(doc.get("proof_image"))
    return Order(**doc)

def _public(doc: dict) -> dict:
    """Uploaded photos are stored as data URLs; hand out a small cacheable link instead."""
    img = doc.get("image") or ""
    if img.startswith("data:"):
        doc["image"] = f"/api/products/{doc['id']}/image?v={zlib.crc32(img.encode()):x}"
    return doc

def _storefront(doc: dict) -> dict:
    """Customers only learn the exact stock when it is running low ("Only 3 left"); otherwise it stays private."""
    doc = _public(doc)
    st = doc.get("stock")
    if st is not None and st > stock.low_threshold():
        doc["stock"] = None
    return doc

async def _sweep_unpaid_online() -> None:
    """Cancel online orders left unpaid for 30 min (customer closed the payment window) and give the stock back."""
    try:
        cutoff = utcnow() - timedelta(minutes=UNPAID_ONLINE_MINUTES)
        async for d in db.orders.find({"payment_method": "Online", "paid": {"$ne": True}, "status": "Pending", "created_at": {"$lt": cutoff}}, NO_ID).limit(50):
            r = await db.orders.update_one({"id": d["id"], "paid": {"$ne": True}, "status": "Pending"},
                                           {"$set": {"status": "Cancelled", "auto_cancelled": True, "payment_status": "Failed"}})
            if r.modified_count:
                await stock.release_order(d["id"])
    except Exception:
        pass  # housekeeping must never break a customer request

# ---------- public ----------
@router.get("/products", response_model=list[Product])
async def list_products():
    docs = await db.products.find({"available": True, "$or": [{"stock": None}, {"stock": {"$gt": 0}}]}, NO_ID).sort("category", 1).to_list(500)
    return [_storefront(d) for d in docs]

@router.get("/products/{id}/image")
async def product_image(id: str):
    doc = await db.products.find_one({"id": id}, {"_id": 0, "image": 1})
    img = (doc or {}).get("image") or ""
    if not img.startswith("data:"):
        raise HTTPException(404, "No photo")
    head, _, b64 = img.partition(",")
    media = head[5:].split(";")[0] or "image/jpeg"
    try:
        raw = base64.b64decode(b64)
    except Exception:
        raise HTTPException(404, "No photo")
    return Response(content=raw, media_type=media, headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"})

@router.post("/orders", response_model=Order)
async def create_order(body: OrderIn):
    if body.mode == "Delivery" and not body.address.strip():
        raise HTTPException(422, "Delivery address is required")
    # every order is paid online (no cash on delivery / pay at store)
    if ONLINE_ONLY and body.payment_method != "Online":
        raise HTTPException(422, "Please pay online to place your order.")
    if body.payment_method == "Online" and not razorpay.enabled():
        raise HTTPException(503, "Online payment isn't available right now. Please try again shortly or call the shop.")
    await _sweep_unpaid_online()
    prods = {p["id"]: p async for p in db.products.find({"id": {"$in": [i.product_id for i in body.items]}, "available": True}, NO_ID)}
    items, lines = [], []
    for l in body.items:
        p = prods.get(l.product_id)
        if not p:
            raise HTTPException(422, "An item in your basket is no longer available")
        items.append(OrderItem(name=p["name"], qty=l.qty, price=p["price"], product_id=p["id"]))
        lines.append((p, l.qty))
    try:
        reserved, low = await stock.reserve(lines)
    except stock.OutOfStock as e:
        raise HTTPException(422, str(e))
    sub = sum(i.qty * i.price for i in items)
    fee = 60 if body.mode == "Delivery" and sub < 1500 else 0
    try:
        code = f"PRS-{random.randint(1000, 9999)}"
        while await db.orders.find_one({"code": code}):
            code = f"PRS-{random.randint(1000, 9999)}"
        order = Order(id=str(uuid.uuid4()), code=code, name=body.name.strip(), phone=body.phone.strip(), mode=body.mode,
                      slot=body.slot, address=body.address.strip(), payment_method=body.payment_method,
                      items=items, fee=fee, total=sub + fee, created_at=utcnow())
        doc = order.model_dump(exclude={"has_proof", "notified"})
        doc["reserved"] = reserved
        await db.orders.insert_one(doc)
    except Exception:
        await stock.release(reserved)   # never keep stock for an order that wasn't saved
        raise
    await whatsapp.order_placed(doc, low)
    return order

@router.get("/config")
async def config():
    """Public shop settings: the UPI id customers pay to."""
    return {"upi_id": os.environ.get("UPI_ID", "").strip(), "upi_name": os.environ.get("UPI_NAME", "Prashanthi Delights").strip(),
            "online_pay": razorpay.enabled(), "online_required": True, "razorpay_key": razorpay.key_id() if razorpay.enabled() else "",
            "whatsapp": whatsapp.enabled(), "low_stock_at": stock.low_threshold()}

@router.post("/orders/{code}/proof", response_model=Order)
async def submit_proof(code: str, body: ProofIn):
    utr = body.utr.strip()
    if not utr and not body.image:
        raise HTTPException(422, "Add the UPI transaction ID or a screenshot")
    if utr and not utr.replace("-", "").isalnum():
        raise HTTPException(422, "The transaction ID should have only letters and numbers")
    doc = await db.orders.find_one({"code": code.strip().upper()}, NO_ID)
    # the phone number on the order is the customer's key to their own order
    if not doc or doc["phone"] != body.phone.strip():
        raise HTTPException(404, "Order not found")
    if doc["payment_method"] != "UPI":
        raise HTTPException(422, "This order is not paid by UPI")
    if doc.get("paid"):
        raise HTTPException(409, "This order is already marked paid")
    upd = {"payment_status": "Proof submitted", "payment_ref": utr}
    if body.image:
        upd["proof_image"] = body.image
    await db.orders.update_one({"id": doc["id"]}, {"$set": upd})
    return _order(await db.orders.find_one({"id": doc["id"]}, NO_ID))

# ---------- online payment (Razorpay) ----------
async def _mark_paid(doc: dict, payment_id: str) -> bool:
    """Idempotent: checkout verification, the webhook and the admin can all call this; only the first one acts."""
    r = await db.orders.update_one({"id": doc["id"], "paid": {"$ne": True}},
                                   {"$set": {"paid": True, "payment_status": "Paid", "payment_id": payment_id}})
    if r.modified_count == 0:
        return False
    fresh = await db.orders.find_one({"id": doc["id"]}, NO_ID)
    if fresh["status"] == "Cancelled":
        # money arrived for an order we auto-cancelled (customer paid after the 30 min window)
        if fresh.get("auto_cancelled") and await stock.reserve_order_again(fresh["id"]):
            await db.orders.update_one({"id": fresh["id"]}, {"$set": {"status": "Pending", "auto_cancelled": False}})
            fresh = await db.orders.find_one({"id": doc["id"]}, NO_ID)
        else:
            await db.orders.update_one({"id": fresh["id"]}, {"$set": {"needs_refund": True}})
            return True
    await whatsapp.notify_order(fresh, "order_confirmed" if fresh["payment_method"] == "Online" else "payment_received")
    return True

async def _order_for(code: str, phone: str) -> dict:
    doc = await db.orders.find_one({"code": code.strip().upper()}, NO_ID)
    if not doc or doc["phone"] != phone.strip():
        raise HTTPException(404, "Order not found")
    return doc

@router.post("/orders/{code}/pay")
async def pay_start(code: str, body: PayStart):
    """Create the Razorpay payment for an order. The amount comes from OUR order, not from the browser."""
    if not razorpay.enabled():
        raise HTTPException(422, "Online payment isn't available right now")
    doc = await _order_for(code, body.phone)
    if doc["payment_method"] != "Online":
        raise HTTPException(422, "This order is not an online-payment order")
    if doc.get("paid"):
        raise HTTPException(409, "This order is already paid")
    if doc["status"] == "Cancelled":
        raise HTTPException(409, "This order has expired. Please place a new order.")
    rid = doc.get("rzp_order_id")
    if not rid:
        try:
            rzp = await razorpay.create_order(doc["total"], doc["code"], {"order_code": doc["code"]})
        except Exception:
            raise HTTPException(502, "The payment service is busy. Please try again in a moment.")
        rid = rzp["id"]
        await db.orders.update_one({"id": doc["id"]}, {"$set": {"rzp_order_id": rid}})
    return {"key": razorpay.key_id(), "order_id": rid, "amount": doc["total"] * 100, "currency": "INR",
            "name": os.environ.get("UPI_NAME", "Prashanthi Delights"), "description": f"Order {doc['code']}",
            "prefill": {"name": doc["name"], "contact": "+91" + doc["phone"] if len(doc["phone"]) == 10 else doc["phone"]}}

@router.post("/orders/{code}/pay/verify", response_model=Order)
async def pay_verify(code: str, body: PayVerify):
    doc = await _order_for(code, body.phone)
    if not doc.get("rzp_order_id") or body.razorpay_order_id != doc["rzp_order_id"] \
            or not razorpay.verify_payment(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(400, "We couldn't verify this payment. If money was deducted, it will be matched automatically or refunded.")
    await _mark_paid(doc, body.razorpay_payment_id)
    return _order(await db.orders.find_one({"id": doc["id"]}, NO_ID))

@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    """Backup path: marks the order paid even if the customer closed the tab right after paying."""
    raw = await request.body()
    if not razorpay.verify_webhook(raw, x_razorpay_signature or ""):
        raise HTTPException(400, "Bad signature")
    try:
        ev = json.loads(raw)
        pay = ev["payload"]["payment"]["entity"]
        doc = await db.orders.find_one({"rzp_order_id": pay.get("order_id")}, NO_ID)
        if doc and ev["event"] in ("payment.captured", "order.paid") and pay.get("amount") == doc["total"] * 100:
            await _mark_paid(doc, pay["id"])
        elif doc and ev["event"] == "payment.failed" and not doc.get("paid"):
            await db.orders.update_one({"id": doc["id"], "paid": {"$ne": True}}, {"$set": {"payment_status": "Failed"}})
    except (KeyError, ValueError, TypeError):
        pass  # unknown / unrelated event: acknowledge so Razorpay doesn't keep retrying
    return {"ok": True}

@router.get("/orders/track", response_model=list[Order])
async def track(q: str):
    q = q.strip()
    docs = await db.orders.find({"$or": [{"code": q.upper()}, {"phone": norm_phone(q)}]}, NO_ID).sort("created_at", -1).to_list(10)
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
    await _sweep_unpaid_online()
    docs = await db.orders.find({"status": status} if status else {}, NO_ID).sort("created_at", -1).to_list(1000)
    return [_order(d) for d in docs]

@router.patch("/admin/orders/{id}", response_model=Order, dependencies=[Depends(require_admin)])
async def patch_order(id: str, body: OrderPatch):
    doc = await db.orders.find_one({"id": id}, NO_ID)
    if not doc:
        raise HTTPException(404, "Order not found")
    upd = body.model_dump(exclude_none=True)
    if "payment_status" in upd:
        upd["paid"] = upd["payment_status"] == "Paid"
    elif "paid" in upd:
        upd["payment_status"] = "Paid" if upd["paid"] else "Unpaid"
    new_status = upd.get("status")
    changed = bool(new_status) and new_status != doc["status"]
    if changed and doc["status"] == "Cancelled":
        if not await stock.reserve_order_again(id):
            raise HTTPException(409, "Not enough stock to reopen this order")
        upd["auto_cancelled"] = False
    if changed and new_status == "Cancelled":
        if doc.get("paid") and doc["payment_method"] in ("Online", "UPI"):
            upd["needs_refund"] = True
    if upd:
        await db.orders.update_one({"id": id}, {"$set": upd})
    if changed and new_status == "Cancelled":
        await stock.release_order(id)
    fresh = await db.orders.find_one({"id": id}, NO_ID)
    # customer WhatsApp messages (each is sent once per order, so flipping a status back and forth won't spam)
    if changed and new_status in whatsapp.STATUS_EVENT:
        await whatsapp.notify_order(fresh, whatsapp.STATUS_EVENT[new_status])
    if upd.get("paid") is True and not doc.get("paid") and doc["payment_method"] in ("UPI", "Online") and fresh["status"] != "Cancelled":
        await whatsapp.notify_order(fresh, "payment_received")
    return _order(fresh)

@router.get("/admin/orders/{id}/whatsapp", dependencies=[Depends(require_admin)])
async def order_whatsapp(id: str, event: str):
    """The message text + a wa.me link, so the owner can send it by hand (works before the API is set up)."""
    if event not in whatsapp.CUSTOMER_EVENTS:
        raise HTTPException(422, "Unknown message")
    doc = await db.orders.find_one({"id": id}, NO_ID)
    if not doc:
        raise HTTPException(404, "Order not found")
    return whatsapp.manual_link(doc, event)

@router.post("/admin/orders/{id}/notify", dependencies=[Depends(require_admin)])
async def order_notify(id: str, body: NotifyIn):
    """Send (or re-send) one WhatsApp message through the API."""
    if body.event not in whatsapp.CUSTOMER_EVENTS:
        raise HTTPException(422, "Unknown message")
    doc = await db.orders.find_one({"id": id}, NO_ID)
    if not doc:
        raise HTTPException(404, "Order not found")
    return {"status": await whatsapp.notify_order(doc, body.event, force=True)}

@router.get("/admin/notifications", dependencies=[Depends(require_admin)])
async def notifications(limit: int = 50):
    docs = await db.notifications.find({}, NO_ID).sort("created_at", -1).to_list(min(max(limit, 1), 200))
    return docs

@router.get("/admin/integrations", dependencies=[Depends(require_admin)])
async def integrations():
    """A setup checklist: which of the optional services are switched on."""
    e = lambda k: bool(settings.get(k))
    return {"razorpay": razorpay.enabled(), "razorpay_webhook": e("RAZORPAY_WEBHOOK_SECRET"),
            "whatsapp": whatsapp.enabled(), "owner_whatsapp": e("OWNER_WHATSAPP"), "site_url": e("SITE_URL"),
            "cron": e("CRON_SECRET"), "low_stock_at": stock.low_threshold()}

@router.get("/admin/orders/{id}/proof", dependencies=[Depends(require_admin)])
async def order_proof(id: str):
    doc = await db.orders.find_one({"id": id}, {"_id": 0, "proof_image": 1})
    img = (doc or {}).get("proof_image") or ""
    if not img.startswith("data:"):
        raise HTTPException(404, "No proof uploaded")
    head, _, b64 = img.partition(",")
    return Response(content=base64.b64decode(b64), media_type=head[5:].split(";")[0],
                    headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})

@router.get("/admin/products", response_model=list[Product], dependencies=[Depends(require_admin)])
async def admin_products():
    docs = await db.products.find({}, NO_ID).sort("category", 1).to_list(500)
    return [_public(d) for d in docs]

@router.post("/admin/products", response_model=Product, dependencies=[Depends(require_admin)])
async def add_product(body: ProductIn):
    p = Product(**body.model_dump())
    await db.products.insert_one(p.model_dump())
    return Product(**_public(p.model_dump()))

@router.patch("/admin/products/{id}", response_model=Product, dependencies=[Depends(require_admin)])
async def patch_product(id: str, body: ProductPatch):
    upd = body.model_dump(exclude_none=True)
    tracked, add = upd.pop("stock_tracked", None), upd.pop("stock_add", None)
    ops: dict = {}
    if tracked is False:
        upd.pop("stock", None)
        ops["$unset"] = {"stock": ""}
    if upd:
        ops["$set"] = upd
    if ops:
        await db.products.update_one({"id": id}, ops)
    if add:   # relative change is atomic, and can never take stock below zero
        await db.products.update_one({"id": id, "stock": {"$gte": max(0, -add)}}, {"$inc": {"stock": add}})
    doc = await db.products.find_one({"id": id}, NO_ID)
    if not doc:
        raise HTTPException(404, "Item not found")
    return Product(**_public(doc))

@router.delete("/admin/products/{id}", dependencies=[Depends(require_admin)])
async def del_product(id: str):
    await db.products.delete_one({"id": id})
    return {"ok": True}

@router.get("/admin/stats", dependencies=[Depends(require_admin)])
async def stats():
    docs = await db.orders.find({"status": {"$ne": "Cancelled"}}, NO_ID).to_list(5000)
    return {"orders": len(docs), "new": sum(d["status"] == "Pending" for d in docs),
            "collected": sum(d["total"] for d in docs if d.get("paid")),
            "due": sum(d["total"] for d in docs if not d.get("paid"))}


# ---------- order & stock summary ----------
def _since(days: int) -> Optional[datetime]:
    """Start of the range in India time (midnight today for days=1). days=0 means all time."""
    if days <= 0:
        return None
    start = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    return start.astimezone(timezone.utc)

def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

OPEN_STATUSES = ("Pending", "Fulfilled", "Out for delivery")   # ordered, but not yet delivered / collected
MIN_COVER = 2   # suggested restock covers at least this many times the low-stock level

async def build_summary(days: int = 1) -> dict:
    since = _since(days)
    all_docs = await db.orders.find({}, NO_ID).to_list(5000)
    docs = [d for d in all_docs if since is None or _aware(d["created_at"]) >= since]
    live = [d for d in docs if d["status"] != "Cancelled"]
    # demand that does not depend on the selected period
    since7 = _since(7)
    sold7: dict[str, int] = {}
    open_qty: dict[str, int] = {}
    for d in all_docs:
        if d["status"] == "Cancelled":
            continue
        recent = _aware(d["created_at"]) >= since7
        for i in d["items"]:
            if recent:
                sold7[i["name"]] = sold7.get(i["name"], 0) + i["qty"]
            if d["status"] in OPEN_STATUSES:
                open_qty[i["name"]] = open_qty.get(i["name"], 0) + i["qty"]
    thr = stock.low_threshold()
    menu = await db.products.find({}, NO_ID).to_list(1000)
    by_name: dict[str, dict] = {}
    for p in menu:
        by_name[p["name"]] = {"id": p["id"], "name": p["name"], "category": p["category"], "qty": 0, "orders": 0, "amount": 0,
                              "stock": p.get("stock"), "available": p.get("available", True)}
    for d in live:
        for i in d["items"]:
            r = by_name.setdefault(i["name"], {"id": "", "name": i["name"], "category": "Removed from menu", "qty": 0, "orders": 0,
                                               "amount": 0, "stock": None, "available": False})
            r["qty"] += i["qty"]; r["orders"] += 1; r["amount"] += i["qty"] * i["price"]
    for r in by_name.values():
        r["open_qty"] = open_qty.get(r["name"], 0)     # in orders not yet delivered (already taken out of stock)
        r["sold_7d"] = sold7.get(r["name"], 0)
        st = r["stock"]
        if st is None or not r["id"]:
            r["level"], r["restock"] = "untracked", 0
        else:
            # enough for a week of recent sales, and never less than twice the low-stock level
            target = max(r["sold_7d"], thr * MIN_COVER)
            r["restock"] = max(0, target - st)
            r["level"] = "out" if st == 0 else ("low" if st <= thr else ("soon" if st < r["sold_7d"] else "ok"))
    products = sorted(by_name.values(), key=lambda r: (-r["qty"], r["name"]))
    tracked = [r for r in products if r["stock"] is not None and r["id"]]
    count = lambda key: {k: sum(1 for d in docs if d[key] == k) for k in sorted({d[key] for d in docs})}
    label = "today" if days == 1 else ("all time" if days <= 0 else f"last {days} days")
    need = sorted((r for r in tracked if r["restock"] > 0 and r["level"] != "ok"), key=lambda r: (["out", "low", "soon"].index(r["level"]), r["name"]))
    return {
        "days": days, "label": label, "date": datetime.now(IST).strftime("%d %b %Y"),
        "orders": len(live), "cancelled": len(docs) - len(live), "items_sold": sum(r["qty"] for r in products),
        "sales": sum(d["total"] for d in live), "collected": sum(d["total"] for d in live if d.get("paid")),
        "pending": sum(d["total"] for d in live if not d.get("paid")),
        "by_status": count("status"), "by_mode": count("mode"), "by_payment": count("payment_method"),
        "products": products,
        "stock": {"tracked": len(tracked), "untracked": len([r for r in products if r["stock"] is None and r["id"]]), "low_at": thr,
                  "open_units": sum(open_qty.values()),
                  "out": [r["name"] for r in tracked if r["stock"] == 0],
                  "low": [{"name": r["name"], "stock": r["stock"]} for r in tracked if 0 < r["stock"] <= thr],
                  "restock": [{"name": r["name"], "category": r["category"], "stock": r["stock"], "sold_7d": r["sold_7d"],
                               "need": r["restock"], "level": r["level"]} for r in need]},
    }

@router.get("/admin/summary", dependencies=[Depends(require_admin)])
async def summary(days: int = 1):
    await _sweep_unpaid_online()
    return await build_summary(days)

async def _send_summary(days: int = 1) -> str:
    s = await build_summary(days)
    top = ", ".join(f"{r['name']} x{r['qty']}" for r in s["products"][:5] if r["qty"]) or "none yet"
    st = s["stock"]
    low_txt = ", ".join("%s (%d)" % (r["name"], r["stock"]) for r in st["low"])
    bits = (["Out: " + ", ".join(st["out"])] if st["out"] else []) + (["Low: " + low_txt] if st["low"] else [])
    stock_txt = " | ".join(bits) if bits else ("all good" if st["tracked"] else "stock tracking is off")
    return await whatsapp.notify_owner("owner_daily_summary", {
        "label": s["date"] if days == 1 else s["label"], "orders": s["orders"], "sales": whatsapp.rupees(s["sales"]),
        "collected": whatsapp.rupees(s["collected"]), "pending": whatsapp.rupees(s["pending"]), "top": top, "stock": stock_txt})

@router.post("/admin/summary/send", dependencies=[Depends(require_admin)])
async def summary_send(days: int = 1):
    """'Send me today's summary on WhatsApp' button."""
    return {"status": await _send_summary(days)}

@router.get("/cron/daily-summary")
async def cron_daily_summary(authorization: Optional[str] = Header(None), key: Optional[str] = None):
    """Hit once a day (Vercel Cron or cron-job.org). Protected by CRON_SECRET."""
    secret = settings.get("CRON_SECRET")
    given = (authorization or "").removeprefix("Bearer ").strip() or (key or "")
    if not secret or not hmac.compare_digest(given, secret):
        raise HTTPException(401, "Not allowed")
    await _sweep_unpaid_online()
    return {"status": await _send_summary(1)}


# ---------- settings / API keys (admin dashboard) ----------
class SettingsIn(BaseModel):
    values: dict[str, str] = {}
    clear: list[str] = []

@router.get("/admin/settings", dependencies=[Depends(require_admin)])
async def get_settings():
    """Which keys are set, where they come from, and a masked preview. Secret values are never returned."""
    return await settings.view()

@router.put("/admin/settings", dependencies=[Depends(require_admin)])
async def put_settings(body: SettingsIn):
    """Save keys from the dashboard. Empty values are ignored (use `clear` to remove a saved key)."""
    bad = [k for k in list(body.values) + body.clear if k not in settings.FIELDS]
    if bad:
        raise HTTPException(422, f"Unknown setting: {bad[0]}")
    try:
        await settings.save(body.values, body.clear)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return await settings.view()

@router.post("/admin/settings/test/{service}", dependencies=[Depends(require_admin)])
async def test_settings(service: str):
    """Check the saved keys really work, so a typo is caught now and not on a customer's order."""
    import httpx
    await settings.load(force=True)
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            if service == "razorpay":
                if not razorpay.enabled():
                    return {"ok": False, "message": "Add the Razorpay Key ID and Key Secret first."}
                r = await c.get(f"{razorpay.API}/orders", params={"count": 1}, auth=(razorpay.key_id(), settings.get("RAZORPAY_KEY_SECRET")))
                if r.status_code == 200:
                    mode = "TEST" if razorpay.key_id().startswith("rzp_test_") else "LIVE"
                    return {"ok": True, "message": f"Razorpay connected ({mode} mode)."}
                return {"ok": False, "message": "Razorpay rejected these keys. Check the Key ID and Secret belong together and are for the same mode (test/live)."}
            if service == "whatsapp":
                if not whatsapp.enabled():
                    return {"ok": False, "message": "Add the WhatsApp token and phone number ID first."}
                r = await c.get(f"https://graph.facebook.com/{os.environ.get('WHATSAPP_API_VERSION', 'v21.0')}/{settings.get('WHATSAPP_PHONE_NUMBER_ID')}",
                                params={"fields": "display_phone_number,verified_name"}, headers={"Authorization": f"Bearer {settings.get('WHATSAPP_TOKEN')}"})
                if r.status_code == 200:
                    return {"ok": True, "message": f"WhatsApp connected ({r.json().get('display_phone_number', 'number found')})."}
                return {"ok": False, "message": "Meta rejected the token or phone number ID. Check both and that the token has whatsapp_business_messaging permission."}
    except Exception:
        return {"ok": False, "message": "Couldn't reach the service. Try again in a moment."}
    raise HTTPException(404, "Unknown service")
