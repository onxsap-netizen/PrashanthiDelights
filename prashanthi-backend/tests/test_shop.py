import json
from datetime import timedelta
import pytest
from conftest import RZP_ENV, WA_ENV, sign, webhook_sig
from models.shop import utcnow

pytestmark = pytest.mark.asyncio
PHONE = "9845828903"
CUST = "919845828903"
OWNER = "919999900000"


async def add_product(e, name="Mysore Pak 250g", price=200, stock=None, category="Sweets"):
    doc = {"id": name, "name": name, "category": category, "price": price, "available": True}
    if stock is not None:
        doc["stock"] = stock
    await e.db.products.insert_one(doc)
    return name


async def login(e):
    r = await e.client.post("/admin/login", json={"password": "pw"})
    assert r.status_code == 200
    e.client.cookies.update(r.cookies)


async def order(e, items, method="Cash on delivery", mode="Delivery", phone="+91 98458-28903"):
    return await e.client.post("/orders", json={"name": "Lakshmi Narayanan", "phone": phone, "mode": mode, "slot": "Today, 5:00 PM" if mode == "Pickup" else "",
                                                "address": "12, 3rd Cross, Malleshwaram 560003" if mode == "Delivery" else "", "payment_method": method,
                                                "items": [{"product_id": i, "qty": q} for i, q in items]})


async def stock_of(e, pid):
    return (await e.db.products.find_one({"id": pid})).get("stock")


# ---------------- WhatsApp ----------------
async def test_whatsapp_not_configured_never_blocks_orders(e):
    await add_product(e)
    r = await order(e, [("Mysore Pak 250g", 1)])
    assert r.status_code == 200
    log = await e.db.notifications.find({}).to_list(10)
    assert {l["status"] for l in log} == {"skipped"}           # logged, not sent, order still placed


async def test_order_confirmed_and_owner_alert(e):
    e.set(**WA_ENV)
    await add_product(e)
    r = await order(e, [("Mysore Pak 250g", 2)])
    o = r.json()
    assert o["phone"] == PHONE                                  # +91 98458-28903 normalised
    c = e.to(CUST, "prs_order_confirmed")
    assert len(c) == 1
    params = [p["text"] for p in c[0]["template"]["components"][0]["parameters"]]
    assert params[0] == "Lakshmi" and params[1] == o["code"] and params[3] == "₹460" and "pay on delivery" in params[4]
    assert params[6] == f"https://shop.test/track?q={o['code']}"
    assert all("\n" not in p and p for p in params)             # WhatsApp rejects empty / multi-line params
    assert len(e.to(OWNER, "prs_owner_new_order")) == 1
    assert (await e.client.get(f"/orders/track?q={o['code']}")).json()[0]["notified"]["order_confirmed"] == "sent"


async def test_status_messages_sent_once_each(e):
    e.set(**WA_ENV)
    await add_product(e)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 1)])).json()
    for status, tpl in [("Fulfilled", "prs_order_ready"), ("Out for delivery", "prs_order_dispatched"), ("Delivered", "prs_order_delivered")]:
        assert (await e.client.patch(f"/admin/orders/{o['id']}", json={"status": status})).status_code == 200
        assert len(e.sent(tpl)) == 1
    await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Fulfilled"})   # flip back: no repeat text
    assert len(e.sent("prs_order_ready")) == 1
    # a manual re-send goes through when the owner asks for it
    assert (await e.client.post(f"/admin/orders/{o['id']}/notify", json={"event": "order_ready"})).json() == {"status": "sent"}
    assert len(e.sent("prs_order_ready")) == 2


async def test_pickup_wording_and_manual_link(e):
    e.set(**WA_ENV)
    await add_product(e)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 1)], mode="Pickup")).json()
    await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Fulfilled"})
    ready = e.sent("prs_order_ready")[0]["template"]["components"][0]["parameters"]
    assert ready[2]["text"] == "ready for pickup at our store"
    m = (await e.client.get(f"/admin/orders/{o['id']}/whatsapp", params={"event": "order_dispatched"})).json()
    assert m["link"].startswith(f"https://wa.me/{CUST}?text=") and o["code"] in m["text"]


async def test_cancel_message_mentions_refund_only_when_paid(e):
    e.set(**WA_ENV, **RZP_ENV)
    await add_product(e)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 1)], method="Online")).json()
    await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})
    await e.client.post(f"/orders/{o['code']}/pay/verify", json={"phone": PHONE, "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1", "razorpay_signature": sign("order_1", "pay_1")})
    r = (await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Cancelled"})).json()
    assert r["needs_refund"] is True
    assert "refund" in e.sent("prs_order_cancelled")[0]["template"]["components"][0]["parameters"][2]["text"]


# ---------------- stock ----------------
async def test_stock_decrements_hides_when_sold_out_and_alerts_low(e):
    e.set(**WA_ENV)
    await add_product(e, stock=7)
    assert (await order(e, [("Mysore Pak 250g", 3)])).status_code == 200
    assert await stock_of(e, "Mysore Pak 250g") == 4
    assert len(e.sent("prs_owner_low_stock")) == 1                # crossed below 5
    shown = (await e.client.get("/products")).json()[0]
    assert shown["stock"] == 4                                    # "Only 4 left"
    assert (await order(e, [("Mysore Pak 250g", 4)])).status_code == 200
    assert len(e.sent("prs_owner_low_stock")) == 1                # already low: no second alert
    assert (await e.client.get("/products")).json() == []         # sold out -> hidden


async def test_cannot_oversell_and_nothing_is_half_taken(e):
    await add_product(e, "A", stock=10)
    await add_product(e, "B", stock=1)
    r = await order(e, [("A", 4), ("B", 2)])
    assert r.status_code == 422 and "Only 1 left of B" in r.json()["detail"]
    assert await stock_of(e, "A") == 10 and await stock_of(e, "B") == 1      # A was rolled back
    assert await e.db.orders.count_documents({}) == 0


async def test_private_stock_level_is_not_exposed_to_customers(e):
    await add_product(e, stock=50)
    assert (await e.client.get("/products")).json()[0]["stock"] is None
    await login(e)
    assert (await e.client.get("/admin/products")).json()[0]["stock"] == 50


async def test_untracked_items_unaffected(e):
    await add_product(e)
    assert (await order(e, [("Mysore Pak 250g", 40)])).status_code == 200
    assert await stock_of(e, "Mysore Pak 250g") is None


async def test_cancel_returns_stock_once_and_reopen_takes_it_again(e):
    await add_product(e, stock=10)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 3)])).json()
    assert await stock_of(e, "Mysore Pak 250g") == 7
    await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Cancelled"})
    await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Cancelled"})
    assert await stock_of(e, "Mysore Pak 250g") == 10
    assert (await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Pending"})).status_code == 200
    assert await stock_of(e, "Mysore Pak 250g") == 7
    await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Cancelled"})
    await e.db.products.update_one({"id": "Mysore Pak 250g"}, {"$set": {"stock": 1}})
    r = await e.client.patch(f"/admin/orders/{o['id']}", json={"status": "Pending"})
    assert r.status_code == 409                                       # not enough stock to reopen


async def test_admin_stock_editing(e):
    await add_product(e)
    await login(e)
    P = "/admin/products/Mysore Pak 250g"
    assert (await e.client.patch(P, json={"stock": 12})).json()["stock"] == 12
    assert (await e.client.patch(P, json={"stock_add": 5})).json()["stock"] == 17
    assert (await e.client.patch(P, json={"stock_add": -20})).json()["stock"] == 17     # can't go below zero
    assert (await e.client.patch(P, json={"stock": 0})).json()["stock"] == 0
    assert (await e.client.patch(P, json={"stock_tracked": False})).json()["stock"] is None
    assert (await e.client.get("/products")).json()[0]["id"] == "Mysore Pak 250g"       # untracked again -> sells


# ---------------- Razorpay ----------------
async def test_online_blocked_until_configured(e):
    await add_product(e)
    r = await order(e, [("Mysore Pak 250g", 1)], method="Online")
    assert r.status_code == 422
    assert (await e.client.get("/config")).json()["online_pay"] is False


async def test_online_payment_flow(e):
    e.set(**WA_ENV, **RZP_ENV)
    await add_product(e, stock=9)
    cfg = (await e.client.get("/config")).json()
    assert cfg["online_pay"] and cfg["razorpay_key"] == "rzp_test_x" and "secret" not in json.dumps(cfg)
    o = (await order(e, [("Mysore Pak 250g", 2)], method="Online")).json()
    assert e.sent("prs_order_confirmed") == []                     # not confirmed until paid
    assert len(e.sent("prs_owner_new_order")) == 1
    p = (await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})).json()
    assert p["amount"] == 460 * 100 and p["order_id"] == "order_1" and p["key"] == "rzp_test_x"
    assert (await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})).json()["order_id"] == "order_1"   # reused
    assert len(e.rzp) == 1
    assert (await e.client.post(f"/orders/{o['code']}/pay", json={"phone": "9000000000"})).status_code == 404       # wrong phone
    bad = await e.client.post(f"/orders/{o['code']}/pay/verify", json={"phone": PHONE, "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1", "razorpay_signature": "nope"})
    assert bad.status_code == 400
    assert (await e.client.get(f"/orders/track?q={o['code']}")).json()[0]["paid"] is False
    good = {"phone": PHONE, "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1", "razorpay_signature": sign("order_1", "pay_1")}
    r = (await e.client.post(f"/orders/{o['code']}/pay/verify", json=good)).json()
    assert r["paid"] and r["payment_status"] == "Paid" and r["payment_id"] == "pay_1"
    await e.client.post(f"/orders/{o['code']}/pay/verify", json=good)  # double submit
    c = e.sent("prs_order_confirmed")
    assert len(c) == 1 and "received" in c[0]["template"]["components"][0]["parameters"][4]["text"]
    assert (await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})).status_code == 409   # already paid


async def test_signature_for_a_different_order_is_rejected(e):
    e.set(**RZP_ENV)
    await add_product(e)
    a = (await order(e, [("Mysore Pak 250g", 1)], method="Online")).json()
    b = (await order(e, [("Mysore Pak 250g", 1)], method="Online")).json()
    await e.client.post(f"/orders/{a['code']}/pay", json={"phone": PHONE})      # order_1
    await e.client.post(f"/orders/{b['code']}/pay", json={"phone": PHONE})      # order_2
    r = await e.client.post(f"/orders/{a['code']}/pay/verify", json={"phone": PHONE, "razorpay_order_id": "order_2", "razorpay_payment_id": "pay_9", "razorpay_signature": sign("order_2", "pay_9")})
    assert r.status_code == 400


async def test_webhook_marks_paid_and_is_verified(e):
    e.set(**WA_ENV, **RZP_ENV)
    await add_product(e)
    o = (await order(e, [("Mysore Pak 250g", 1)], method="Online")).json()
    await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})
    ev = lambda amt: json.dumps({"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_7", "order_id": "order_1", "amount": amt}}}}).encode()
    H = lambda raw, sig: {"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
    raw = ev(26000)
    assert (await e.client.post("/webhooks/razorpay", content=raw, headers=H(raw, "bad"))).status_code == 400
    raw2 = ev(100)                                                                  # wrong amount: ignored
    assert (await e.client.post("/webhooks/razorpay", content=raw2, headers=H(raw2, webhook_sig(raw2)))).status_code == 200
    assert (await e.client.get(f"/orders/track?q={o['code']}")).json()[0]["paid"] is False
    assert (await e.client.post("/webhooks/razorpay", content=raw, headers=H(raw, webhook_sig(raw)))).status_code == 200
    assert (await e.client.get(f"/orders/track?q={o['code']}")).json()[0]["paid"] is True
    await e.client.post("/webhooks/razorpay", content=raw, headers=H(raw, webhook_sig(raw)))    # Razorpay retries
    assert len(e.sent("prs_order_confirmed")) == 1


async def test_abandoned_online_order_expires_and_late_payment_recovers(e):
    e.set(**RZP_ENV)
    await add_product(e, stock=5)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 2)], method="Online")).json()
    await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})
    assert await stock_of(e, "Mysore Pak 250g") == 3
    await e.db.orders.update_one({"id": o["id"]}, {"$set": {"created_at": utcnow() - timedelta(minutes=31)}})
    rows = (await e.client.get("/admin/orders")).json()
    assert rows[0]["status"] == "Cancelled" and await stock_of(e, "Mysore Pak 250g") == 5
    assert (await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})).status_code == 409
    # the customer paid just after the window: order is revived and stock re-taken
    raw = json.dumps({"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_8", "order_id": "order_1", "amount": 46000}}}}).encode()
    await e.client.post("/webhooks/razorpay", content=raw, headers={"X-Razorpay-Signature": webhook_sig(raw)})
    r = (await e.client.get(f"/orders/track?q={o['code']}")).json()[0]
    assert r["status"] == "Pending" and r["paid"] and await stock_of(e, "Mysore Pak 250g") == 3


async def test_late_payment_with_no_stock_flags_refund(e):
    e.set(**RZP_ENV)
    await add_product(e, stock=2)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 2)], method="Online")).json()
    await e.client.post(f"/orders/{o['code']}/pay", json={"phone": PHONE})
    await e.db.orders.update_one({"id": o["id"]}, {"$set": {"created_at": utcnow() - timedelta(minutes=31)}})
    await e.client.get("/admin/orders")                              # expires, stock back to 2
    assert (await order(e, [("Mysore Pak 250g", 2)])).status_code == 200   # someone else buys it
    raw = json.dumps({"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_8", "order_id": "order_1", "amount": 46000}}}}).encode()
    await e.client.post("/webhooks/razorpay", content=raw, headers={"X-Razorpay-Signature": webhook_sig(raw)})
    r = (await e.client.get(f"/orders/track?q={o['code']}")).json()[0]
    assert r["status"] == "Cancelled" and r["paid"] and r["needs_refund"]


async def test_manual_upi_marked_paid_sends_payment_message(e):
    e.set(**WA_ENV)
    await add_product(e)
    await login(e)
    o = (await order(e, [("Mysore Pak 250g", 1)], method="UPI")).json()
    await e.client.patch(f"/admin/orders/{o['id']}", json={"paid": True})
    assert len(e.sent("prs_payment_received")) == 1
    cod = (await order(e, [("Mysore Pak 250g", 1)])).json()
    await e.client.patch(f"/admin/orders/{cod['id']}", json={"paid": True})     # cash collected: no message
    assert len(e.sent("prs_payment_received")) == 1


# ---------------- summary ----------------
async def test_summary_product_wise_and_stock(e):
    e.set(**WA_ENV)
    await add_product(e, "Mysore Pak 250g", 200, stock=20)
    await add_product(e, "Mixture 225g", 135, stock=3, category="Savouries")
    await add_product(e, "Thattai 225g", 135, category="Savouries")
    await login(e)
    a = (await order(e, [("Mysore Pak 250g", 2), ("Mixture 225g", 1)])).json()
    await order(e, [("Mysore Pak 250g", 1)], mode="Pickup")
    c = (await order(e, [("Thattai 225g", 5)])).json()
    await e.client.patch(f"/admin/orders/{c['id']}", json={"status": "Cancelled"})
    await e.client.patch(f"/admin/orders/{a['id']}", json={"paid": True})
    s = (await e.client.get("/admin/summary", params={"days": 1})).json()
    assert s["orders"] == 2 and s["cancelled"] == 1 and s["items_sold"] == 4
    assert s["sales"] == 200 * 3 + 135 + 60 and s["collected"] == 595       # order a (with ₹60 delivery) is paid
    top = {r["name"]: r for r in s["products"]}
    assert top["Mysore Pak 250g"]["qty"] == 3 and top["Mysore Pak 250g"]["orders"] == 2 and top["Mysore Pak 250g"]["amount"] == 600
    assert top["Thattai 225g"]["qty"] == 0                                  # cancelled order not counted
    assert s["products"][0]["name"] == "Mysore Pak 250g"
    assert s["stock"]["low"] == [{"name": "Mixture 225g", "stock": 2}] and s["stock"]["untracked"] == 1
    assert s["by_mode"] == {"Delivery": 2, "Pickup": 1}


async def test_summary_whatsapp_to_owner_and_cron_auth(e):
    e.set(**WA_ENV, CRON_SECRET="s3")
    await add_product(e, stock=2)
    await login(e)
    await order(e, [("Mysore Pak 250g", 1)])
    assert (await e.client.post("/admin/summary/send")).json() == {"status": "sent"}
    msg = e.sent("prs_owner_daily_summary")[0]["template"]["components"][0]["parameters"]
    assert len(msg) == 7 and msg[1]["text"] == "1" and "Mysore Pak 250g x1" in msg[5]["text"] and "Low" in msg[6]["text"]
    e.client.cookies.clear()
    assert (await e.client.get("/cron/daily-summary")).status_code == 401
    assert (await e.client.get("/cron/daily-summary", headers={"Authorization": "Bearer wrong"})).status_code == 401
    assert (await e.client.get("/cron/daily-summary", headers={"Authorization": "Bearer s3"})).json() == {"status": "sent"}


async def test_admin_endpoints_require_login(e):
    for m, u in [("GET", "/admin/summary"), ("GET", "/admin/notifications"), ("GET", "/admin/integrations"), ("POST", "/admin/summary/send")]:
        assert (await e.client.request(m, u)).status_code == 401
