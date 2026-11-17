import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

Status = Literal["Pending", "Fulfilled", "Out for delivery", "Delivered", "Cancelled"]
PayStatus = Literal["Unpaid", "Proof submitted", "Paid", "Failed"]
# Optional storefront badges the owner can switch on per item (all optional, old items have none).
Tag = Literal["Best Seller", "New", "Festive", "Gift"]

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def norm_phone(raw: str) -> str:
    """"+91 98458-28903" -> "9845828903". Anything that is not an Indian mobile is returned trimmed, unchanged."""
    d = "".join(c for c in (raw or "") if c.isdigit())
    if len(d) == 12 and d.startswith("91"):
        d = d[2:]
    elif len(d) == 11 and d.startswith("0"):
        d = d[1:]
    return d if len(d) == 10 else (raw or "").strip()

def _check_image(v):
    if v is None or v == "":
        return v
    ok = v.startswith(("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,", "https://", "http://", "/api/products/"))
    if not ok:
        raise ValueError("Image must be a JPEG/PNG/WebP photo or an http(s) link")
    return v

class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    price: int = Field(ge=0)
    available: bool = True
    image: str = Field(default="", max_length=300_000)
    # Optional details shown on the product page. Empty = the storefront simply hides them.
    description: str = Field(default="", max_length=600)
    ingredients: str = Field(default="", max_length=400)
    original_price: Optional[int] = Field(default=None, ge=0)
    tags: list[Tag] = Field(default_factory=list, max_length=4)
    # Units in stock. None = not tracked (always available). 0 = sold out (hidden from the storefront).
    stock: Optional[int] = Field(default=None, ge=0, le=100_000)

    _img = field_validator("image")(_check_image)

class Product(ProductIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class ProductPatch(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = Field(None, ge=0)
    available: Optional[bool] = None
    image: Optional[str] = Field(None, max_length=300_000)
    description: Optional[str] = Field(None, max_length=600)
    ingredients: Optional[str] = Field(None, max_length=400)
    original_price: Optional[int] = Field(None, ge=0)
    tags: Optional[list[Tag]] = Field(None, max_length=4)
    stock: Optional[int] = Field(None, ge=0, le=100_000)
    stock_tracked: Optional[bool] = None   # false = stop tracking stock for this item
    stock_add: Optional[int] = Field(None, ge=-100_000, le=100_000)  # +/- adjustment, applied atomically

    _img = field_validator("image")(_check_image)

class Line(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=50)

class OrderIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=10)
    mode: Literal["Pickup", "Delivery"]
    slot: str = ""
    address: str = ""
    payment_method: str
    items: list[Line] = Field(min_length=1)

    _phone = field_validator("phone")(lambda v: norm_phone(v))

class OrderItem(BaseModel):
    name: str
    qty: int
    price: int
    product_id: str = ""

class Order(BaseModel):
    id: str
    code: str
    name: str
    phone: str
    mode: str
    slot: str = ""
    address: str = ""
    payment_method: str
    items: list[OrderItem]
    fee: int
    total: int
    paid: bool = False
    payment_status: PayStatus = "Unpaid"
    payment_ref: str = ""
    has_proof: bool = False
    status: Status = "Pending"
    created_at: datetime
    payment_id: str = ""            # gateway (Razorpay) payment id once paid online
    needs_refund: bool = False      # paid online but the order is cancelled
    notified: dict[str, str] = Field(default_factory=dict)  # WhatsApp event -> sent / failed / skipped

    @model_validator(mode="before")
    @classmethod
    def _old_orders(cls, data):
        # orders saved before payment tracking existed only have the paid flag
        if isinstance(data, dict) and "payment_status" not in data:
            data = {**data, "payment_status": "Paid" if data.get("paid") else "Unpaid"}
        return data

class OrderPatch(BaseModel):
    status: Optional[Status] = None
    paid: Optional[bool] = None
    payment_status: Optional[PayStatus] = None
    needs_refund: Optional[bool] = None   # admin ticks this off once an online refund has been made

class PayStart(BaseModel):
    phone: str = Field(min_length=10)
    _phone = field_validator("phone")(lambda v: norm_phone(v))

class PayVerify(PayStart):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class NotifyIn(BaseModel):
    event: str

class ProofIn(BaseModel):
    phone: str = Field(min_length=10)
    _phone = field_validator("phone")(lambda v: norm_phone(v))
    utr: str = Field(default="", max_length=40)
    image: str = Field(default="", max_length=400_000)

    @field_validator("image")
    @classmethod
    def _img(cls, v):
        if v and not v.startswith(("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")):
            raise ValueError("Proof must be a JPEG/PNG/WebP screenshot")
        return v

class Login(BaseModel):
    password: str
