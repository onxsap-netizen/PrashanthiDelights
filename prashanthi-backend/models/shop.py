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

class OrderItem(BaseModel):
    name: str
    qty: int
    price: int

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

class ProofIn(BaseModel):
    phone: str = Field(min_length=10)
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
