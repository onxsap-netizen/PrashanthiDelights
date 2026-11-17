"""Razorpay (UPI / cards / net banking) over plain HTTPS: no SDK, so nothing extra to install on Vercel.

Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (required), RAZORPAY_WEBHOOK_SECRET (for the webhook).
The amount is ALWAYS taken from our own order total, never from the browser.
"""
import hashlib, hmac
import httpx
from lib import settings

API = "https://api.razorpay.com/v1"


def key_id() -> str:
    return settings.get("RAZORPAY_KEY_ID")


def enabled() -> bool:
    return bool(key_id() and settings.get("RAZORPAY_KEY_SECRET"))


async def create_order(amount_inr: int, receipt: str, notes: dict) -> dict:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{API}/orders", auth=(key_id(), settings.get("RAZORPAY_KEY_SECRET")),
                         json={"amount": int(amount_inr) * 100, "currency": "INR", "receipt": receipt, "notes": notes})
    r.raise_for_status()
    return r.json()


def _hmac(secret: str, msg: bytes) -> str:
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def verify_payment(order_id: str, payment_id: str, signature: str) -> bool:
    """Checkout success signature: HMAC_SHA256(order_id|payment_id, key_secret)."""
    secret = settings.get("RAZORPAY_KEY_SECRET")
    if not secret:
        return False
    return hmac.compare_digest(_hmac(secret, f"{order_id}|{payment_id}".encode()), signature or "")


def verify_webhook(raw_body: bytes, signature: str) -> bool:
    secret = settings.get("RAZORPAY_WEBHOOK_SECRET")
    if not secret:
        return False
    return hmac.compare_digest(_hmac(secret, raw_body), signature or "")
