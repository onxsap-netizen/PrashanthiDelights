"""Runs the REAL routers against an in-memory MongoDB (mongomock) and fake Razorpay / WhatsApp servers."""
import hashlib, hmac, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.update(MONGO_URL="mongodb://localhost:1", ADMIN_PASSWORD="pw", COOKIE_SECURE="0")
import lib.db as _db
from mongomock_motor import AsyncMongoMockClient
_db.db = AsyncMongoMockClient()["test"]          # must happen before the routers import `db`

import httpx, pytest, pytest_asyncio
from lib import razorpay, settings as _settings, whatsapp
from routers import shop as _shop
from server import app

WA_ENV = dict(WHATSAPP_TOKEN="tok", WHATSAPP_PHONE_NUMBER_ID="123", OWNER_WHATSAPP="+91 99999 00000", SITE_URL="https://shop.test")
RZP_ENV = dict(RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="secret", RAZORPAY_WEBHOOK_SECRET="whsec")


class Fakes:
    def __init__(self):
        self.wa: list[dict] = []      # WhatsApp API calls received
        self.rzp: list[dict] = []     # Razorpay order creations

    def handler(self, request: httpx.Request) -> httpx.Response:
        if "graph.facebook.com" in str(request.url):
            body = json.loads(request.content)
            self.wa.append(body)
            return httpx.Response(200, json={"messages": [{"id": f"wamid.{len(self.wa)}"}]})
        if "api.razorpay.com" in str(request.url):
            body = json.loads(request.content)
            self.rzp.append(body)
            return httpx.Response(200, json={"id": f"order_{len(self.rzp)}", **body})
        return httpx.Response(404)

    def to(self, number: str, event_template: str) -> list[dict]:
        return [m for m in self.wa if m["to"] == number and m["template"]["name"] == event_template]

    def sent(self, template: str) -> list[dict]:
        return [m for m in self.wa if m["template"]["name"] == template]


@pytest_asyncio.fixture
async def e(monkeypatch):
    for c in await _db.db.list_collection_names():
        await _db.db[c].drop()
    for k in list(os.environ):
        if k.startswith(("WHATSAPP_", "RAZORPAY_", "OWNER_", "SITE_URL", "LOW_STOCK", "CRON_")):
            monkeypatch.delenv(k)
    _settings._cache.clear(); _settings._loaded_at = 0.0
    monkeypatch.setattr(_shop, "ONLINE_ONLY", False)   # older tests place cash orders; the online-only rule has its own tests
    fakes = Fakes()
    real = httpx.AsyncClient
    monkeypatch.setattr(whatsapp.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(fakes.handler), **{k: v for k, v in kw.items() if k != "transport"}))
    monkeypatch.setattr(razorpay.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(fakes.handler), **{k: v for k, v in kw.items() if k != "transport"}))
    async with real(transport=httpx.ASGITransport(app=app), base_url="http://t/api") as c:
        fakes.client = c
        fakes.set = lambda **kv: [monkeypatch.setenv(k, v) for k, v in kv.items()]
        fakes.db = _db.db
        yield fakes


def sign(order_id: str, payment_id: str, secret="secret") -> str:
    return hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def webhook_sig(raw: bytes, secret="whsec") -> str:
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
