import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field

Status = Literal["Pending", "Fulfilled", "Out for delivery", "Delivered", "Cancelled"]

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    price: int = Field(ge=0)
    available: bool = True

class Product(ProductIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class ProductPatch(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = Field(None, ge=0)
    available: Optional[bool] = None

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
    status: Status = "Pending"
    created_at: datetime

class OrderPatch(BaseModel):
    status: Optional[Status] = None
    paid: Optional[bool] = None

class Login(BaseModel):
    password: str
