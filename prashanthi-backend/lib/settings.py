"""API keys and other settings that the owner can edit from the Admin dashboard.

A value saved in the dashboard (MongoDB `settings` collection) wins; if there is none, the environment
variable of the same name is used, so keys already set in Vercel keep working.
Secrets are never sent back to the browser, only "set / not set" and the last 4 characters.
"""
import os, re, time
from lib.db import db

# key -> (label, group, secret?, help)
FIELDS: dict[str, tuple[str, str, bool, str]] = {
    "RAZORPAY_KEY_ID": ("Razorpay Key ID", "Online payment", False, "Starts with rzp_test_ or rzp_live_"),
    "RAZORPAY_KEY_SECRET": ("Razorpay Key Secret", "Online payment", True, "Shown only once when you generate the key in Razorpay"),
    "RAZORPAY_WEBHOOK_SECRET": ("Razorpay Webhook Secret", "Online payment", True, "The secret you typed when adding the webhook in Razorpay"),
    "WHATSAPP_TOKEN": ("WhatsApp access token", "WhatsApp", True, "Permanent token from Meta (System user)"),
    "WHATSAPP_PHONE_NUMBER_ID": ("WhatsApp phone number ID", "WhatsApp", False, "From Meta > WhatsApp > API Setup"),
    "OWNER_WHATSAPP": ("Your WhatsApp number", "WhatsApp", False, "For new-order, low-stock and daily summary alerts, e.g. 9845828903"),
    "SITE_URL": ("Shop web address", "Shop", False, "Used for the tracking link, e.g. https://prashanthi-delta.vercel.app"),
    "SHOP_PHONE": ("Shop phone (shown in messages)", "Shop", False, "Optional"),
    "STORE_ADDRESS": ("Store address (shown in messages)", "Shop", False, "Optional"),
    "CRON_SECRET": ("Daily summary secret", "Automation", True, "Any long random text; protects the daily-summary link"),
    "LOW_STOCK_AT": ("Low-stock level", "Stock", False, "Warn when an item has this many left or fewer (default 5)"),
}

_cache: dict[str, str] = {}
_loaded_at = 0.0
TTL = 15.0   # seconds. Another server instance picks up a change within this time.


def clean(v: str) -> str:
    return (v or "").strip().strip('"').strip("'").strip()


async def load(force: bool = False) -> None:
    """Refresh the in-memory copy (cheap: at most one small DB read every few seconds)."""
    global _cache, _loaded_at
    if not force and time.monotonic() - _loaded_at < TTL:
        return
    try:
        doc = await db.settings.find_one({"_id": "app"}) or {}
        _cache = {k: clean(str(v)) for k, v in (doc.get("values") or {}).items() if k in FIELDS and clean(str(v))}
    except Exception:
        pass   # DB hiccup: keep the previous values, fall back to env
    _loaded_at = time.monotonic()


def get(key: str, default: str = "") -> str:
    return _cache.get(key) or clean(os.environ.get(key, "")) or default


def source(key: str) -> str:
    return "dashboard" if _cache.get(key) else ("server" if clean(os.environ.get(key, "")) else "none")


def validate(key: str, value: str) -> str:
    """Returns the cleaned value or raises ValueError with a message the owner can act on."""
    v = clean(value)
    if key == "RAZORPAY_KEY_ID" and not re.fullmatch(r"rzp_(test|live)_[A-Za-z0-9]+", v):
        raise ValueError("Razorpay Key ID should look like rzp_test_xxxxxxxx or rzp_live_xxxxxxxx")
    if key in ("RAZORPAY_KEY_SECRET", "WHATSAPP_TOKEN", "RAZORPAY_WEBHOOK_SECRET") and (" " in v or len(v) < 8):
        raise ValueError(f"{FIELDS[key][0]} looks incomplete. Paste it exactly as given, with no spaces")
    if key == "CRON_SECRET" and len(v) < 16:
        raise ValueError("Daily summary secret should be at least 16 characters")
    if key == "WHATSAPP_PHONE_NUMBER_ID" and not v.isdigit():
        raise ValueError("WhatsApp phone number ID should be digits only")
    if key == "OWNER_WHATSAPP":
        d = re.sub(r"\D", "", v)
        if len(d) == 12 and d.startswith("91"):
            d = d[2:]
        if not re.fullmatch(r"[6-9]\d{9}", d):
            raise ValueError("Enter your 10-digit mobile number")
        v = d
    if key == "SITE_URL":
        if not v.startswith(("https://", "http://")):
            raise ValueError("Shop web address must start with https://")
        v = v.rstrip("/")
    if key == "LOW_STOCK_AT" and not (v.isdigit() and 0 <= int(v) <= 1000):
        raise ValueError("Low-stock level should be a number")
    return v


def mask(key: str, value: str) -> str:
    return ("•" * 8 + value[-4:]) if len(value) > 4 else "•" * 8


async def view() -> list[dict]:
    await load(force=True)
    out = []
    for k, (label, group, secret, hint) in FIELDS.items():
        val = get(k)
        out.append({"key": k, "label": label, "group": group, "secret": secret, "hint": hint, "set": bool(val),
                    "source": source(k), "preview": (mask(k, val) if secret and val else val)})
    return out


async def save(values: dict[str, str], clear: list[str]) -> None:
    sets = {f"values.{k}": validate(k, v) for k, v in values.items() if k in FIELDS and clean(v)}
    unsets = {f"values.{k}": "" for k in clear if k in FIELDS}
    ops: dict = {}
    if sets:
        ops["$set"] = sets
    if unsets:
        ops["$unset"] = unsets
    if ops:
        await db.settings.update_one({"_id": "app"}, ops, upsert=True)
    await load(force=True)
