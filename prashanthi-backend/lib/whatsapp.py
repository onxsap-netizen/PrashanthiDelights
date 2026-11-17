"""WhatsApp order messages through Meta's WhatsApp Cloud API (template messages).

Why templates: WhatsApp only lets a business start a conversation with a pre-approved template. The exact
wording of each template is in TEMPLATES below (and in WHATSAPP_SETUP.md): create them once in Meta's
WhatsApp Manager with the same names and text, and this code fills in the {{1}}, {{2}}... values.

Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID (both required to send), WHATSAPP_API_VERSION (default v21.0),
WHATSAPP_TEMPLATE_LANG (default en), OWNER_WHATSAPP (your number, for new-order / low-stock / daily summary alerts),
SITE_URL, SHOP_PHONE, STORE_ADDRESS (used inside messages).

Nothing here can break an order: every send is wrapped, time-limited and logged to the `notifications` collection.
Each event is sent at most once per order (an atomic claim on the order), so retries / webhooks can't double-text a customer.
"""
import asyncio, os, re
from typing import Optional
import httpx
from lib.db import db
from models.shop import utcnow

# event -> (template name, body text exactly as approved in Meta, ordered parameter names)
TEMPLATES: dict[str, tuple[str, str, list[str]]] = {
    "order_confirmed": ("prs_order_confirmed",
        "Hi {{1}}, thank you for ordering from Prashanthi Delights! 🙏\nYour order {{2}} is confirmed.\n\nItems: {{3}}\nTotal: {{4}}\n{{5}}\n{{6}}\n\nTrack your order here: {{7}}\nThank you for supporting us!",
        ["name", "code", "items", "total", "pay_line", "fulfil_line", "track"]),
    "payment_received": ("prs_payment_received",
        "Hi {{1}}, we have received your payment of {{2}} for order {{3}}. Thank you! 🙏",
        ["name", "total", "code"]),
    "order_ready": ("prs_order_ready",
        "Hi {{1}}, your order {{2}} is {{3}}.",
        ["name", "code", "ready_text"]),
    "order_dispatched": ("prs_order_dispatched",
        "Hi {{1}}, good news! Your order {{2}} is out for delivery 🛵\n{{3}}\nQuestions? Call {{4}}.",
        ["name", "code", "pay_note", "shop_phone"]),
    "order_delivered": ("prs_order_delivered",
        "Hi {{1}}, your order {{2}} has been {{3}}. Thank you for choosing Prashanthi Delights. We hope you enjoy every bite! 🍬",
        ["name", "code", "done_text"]),
    "order_cancelled": ("prs_order_cancelled",
        "Hi {{1}}, your order {{2}} has been cancelled. {{3}} If this is unexpected, please call {{4}}.",
        ["name", "code", "refund_note", "shop_phone"]),
    "owner_new_order": ("prs_owner_new_order",
        "New order {{1}} from {{2}} ({{3}}): {{4}} | Total {{5}} | {{6}} | {{7}}. Open Admin for details.",
        ["code", "name", "phone", "items", "total", "fulfil_line", "pay_line"]),
    "owner_low_stock": ("prs_owner_low_stock",
        "Low stock alert: {{1}}. Update stock in Admin > Stock.",
        ["list"]),
    "owner_daily_summary": ("prs_owner_daily_summary",
        "Summary for {{1}}: {{2}} orders, {{3}} sales ({{4}} collected, {{5}} pending). Top items: {{6}}. Stock: {{7}}. Have a great evening!",
        ["label", "orders", "sales", "collected", "pending", "top", "stock"]),
}
CUSTOMER_EVENTS = ["order_confirmed", "payment_received", "order_ready", "order_dispatched", "order_delivered", "order_cancelled"]
STATUS_EVENT = {"Fulfilled": "order_ready", "Out for delivery": "order_dispatched", "Delivered": "order_delivered", "Cancelled": "order_cancelled"}


def _env(k: str, d: str = "") -> str:
    return os.environ.get(k, d).strip()


def enabled() -> bool:
    return bool(_env("WHATSAPP_TOKEN") and _env("WHATSAPP_PHONE_NUMBER_ID"))


def rupees(n) -> str:
    return "₹" + f"{int(round(n)):,}"


def clean(v, limit: int = 600) -> str:
    """WhatsApp rejects empty parameters, newlines, tabs and runs of 4+ spaces."""
    s = re.sub(r"[\r\n\t]+", " ", str(v if v is not None else ""))
    s = re.sub(r" {2,}", " ", s).strip()
    if len(s) > limit:
        s = s[: limit - 1].rstrip() + "…"
    return s or "-"


def wa_number(phone: str) -> Optional[str]:
    d = re.sub(r"\D", "", phone or "")
    if len(d) == 10:
        return "91" + d
    if len(d) == 12 and d.startswith("91"):
        return d
    return None


def items_text(items: list[dict]) -> str:
    return ", ".join(f"{i['name']} × {i['qty']}" for i in items)


def fulfil_line(o: dict) -> str:
    if o.get("mode") == "Pickup":
        return f"Pickup: {clean(o.get('slot'))} at {_env('STORE_ADDRESS', '8th Cross, Malleshwaram, Bengaluru')}"
    return f"Delivery to: {clean(o.get('address'), 160)}" if o.get("mode") else "-"


def pay_line(o: dict) -> str:
    if not o.get("payment_method"):
        return "-"
    if o.get("paid"):
        return "Payment: received ✅"
    if o["payment_method"] == "UPI":
        return "Payment: waiting for your UPI payment"
    return "Payment: pay at the store" if o.get("mode") == "Pickup" else "Payment: pay on delivery"


def params_for(event: str, o: dict, extra: Optional[dict] = None) -> list[str]:
    site = _env("SITE_URL").rstrip("/")
    v = {
        "name": (o.get("name") or "there").split()[0], "code": o.get("code", ""), "items": items_text(o.get("items", [])),
        "total": rupees(o.get("total", 0)), "pay_line": pay_line(o), "fulfil_line": fulfil_line(o) if o.get("mode") else "-",
        "track": f"{site}/track?q={o.get('code', '')}" if site else "our website (Track order page)",
        "shop_phone": _env("SHOP_PHONE", "+91 98458 28903"), "phone": o.get("phone", ""),
        "ready_text": "ready for pickup at our store" if o.get("mode") == "Pickup" else "packed and will be on its way shortly",
        "pay_note": "Payment is complete ✅" if o.get("paid") else f"Please keep {rupees(o.get('total', 0))} ready to pay on delivery.",
        "done_text": "collected" if o.get("mode") == "Pickup" else "delivered",
        "refund_note": ("We will refund your online payment within 5-7 working days." if o.get("paid") else "No payment is pending."),
    }
    v.update(extra or {})
    return [clean(v[k]) for k in TEMPLATES[event][2]]


def render(event: str, params: list[str]) -> str:
    """The message as the customer sees it (also used for the 'send manually on WhatsApp' button)."""
    text = TEMPLATES[event][1]
    for i, p in enumerate(params, 1):
        text = text.replace("{{%d}}" % i, p)
    return text


async def _send(to: str, event: str, params: list[str]) -> tuple[str, str]:
    """-> (status, detail). status: sent | failed | skipped. Never raises."""
    if not enabled():
        return "skipped", "WhatsApp is not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)"
    if not to:
        return "skipped", "No valid WhatsApp number"
    body = {"messaging_product": "whatsapp", "to": to, "type": "template", "template": {
        "name": TEMPLATES[event][0], "language": {"code": _env("WHATSAPP_TEMPLATE_LANG", "en")},
        "components": [{"type": "body", "parameters": [{"type": "text", "text": p} for p in params]}]}}
    url = f"https://graph.facebook.com/{_env('WHATSAPP_API_VERSION', 'v21.0')}/{_env('WHATSAPP_PHONE_NUMBER_ID')}/messages"
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.post(url, json=body, headers={"Authorization": f"Bearer {_env('WHATSAPP_TOKEN')}"})
        if r.status_code < 300:
            return "sent", ((r.json().get("messages") or [{}])[0].get("id", ""))
        try:
            err = r.json().get("error", {})
            return "failed", f"{r.status_code}: {err.get('message', r.text[:200])}"
        except Exception:
            return "failed", f"{r.status_code}: {r.text[:200]}"
    except Exception as e:  # network, timeout...
        return "failed", f"{type(e).__name__}: {e}"[:300]


async def _log(event: str, to: str, order_code: str, status: str, detail: str, text: str) -> None:
    try:
        await db.notifications.insert_one({"event": event, "to": to, "order_code": order_code, "status": status,
                                           "detail": detail, "text": text, "created_at": utcnow()})
    except Exception:
        pass


async def notify_order(order: dict, event: str, force: bool = False) -> str:
    """Send one customer message for an order. Returns sent / failed / skipped / duplicate."""
    try:
        if not force:
            claim = await db.orders.update_one({"id": order["id"], f"notified.{event}": {"$exists": False}},
                                               {"$set": {f"notified.{event}": "sending"}})
            if claim.modified_count == 0:
                return "duplicate"
        params = params_for(event, order)
        to = wa_number(order.get("phone", ""))
        status, detail = await _send(to or "", event, params)
        await db.orders.update_one({"id": order["id"]}, {"$set": {f"notified.{event}": status}})
        await _log(event, to or order.get("phone", ""), order.get("code", ""), status, detail, render(event, params))
        return status
    except Exception as e:
        return f"failed ({type(e).__name__})"


async def notify_owner(event: str, extra: dict, order: Optional[dict] = None) -> str:
    to = wa_number(_env("OWNER_WHATSAPP"))
    try:
        params = params_for(event, order or {}, extra)
        status, detail = await _send(to or "", event, params) if to else ("skipped", "OWNER_WHATSAPP is not set")
        await _log(event, to or "", (order or {}).get("code", ""), status, detail, render(event, params))
        return status
    except Exception as e:
        return f"failed ({type(e).__name__})"


async def order_placed(order: dict, low_stock: list[dict]) -> None:
    """Everything to send right after an order is created."""
    jobs = []
    if order["payment_method"] != "Online":   # online orders are confirmed once the payment succeeds
        jobs.append(notify_order(order, "order_confirmed"))
    jobs.append(notify_owner("owner_new_order", {"fulfil_line": fulfil_line(order)}, order))
    if low_stock:
        jobs.append(notify_owner("owner_low_stock", {"list": ", ".join(f"{p['name']} ({p['stock']} left)" for p in low_stock)}))
    await asyncio.gather(*jobs, return_exceptions=True)


def manual_link(order: dict, event: str) -> dict:
    """Fallback for when the API isn't set up yet: a wa.me link with the message pre-typed."""
    from urllib.parse import quote
    text = render(event, params_for(event, order))
    to = wa_number(order.get("phone", "")) or ""
    return {"text": text, "link": f"https://wa.me/{to}?text={quote(text)}" if to else ""}
