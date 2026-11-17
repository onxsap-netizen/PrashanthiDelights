import { SITE } from "@/config/site";

export type Mode = "Pickup" | "Delivery";
export type Status = "Pending" | "Fulfilled" | "Out for delivery" | "Delivered" | "Cancelled";
export type PayStatus = "Unpaid" | "Proof submitted" | "Paid" | "Failed";
export type Tag = "Best Seller" | "New" | "Festive" | "Gift";

export interface Product {
  id: string; name: string; category: string; price: number; available: boolean; image?: string;
  // optional fields (filled by the owner in Admin; the storefront hides whatever is empty)
  description?: string; ingredients?: string; original_price?: number | null; tags?: Tag[];
  /** Units left. Customers only receive it when running low; null/undefined = not tracked. */
  stock?: number | null;
}
export interface OrderItem { name: string; qty: number; price: number }
export interface Order {
  id: string; code: string; name: string; phone: string; mode: Mode; slot: string; address: string;
  payment_method: string; items: OrderItem[]; fee: number; total: number; paid: boolean;
  payment_status?: PayStatus; payment_ref?: string; has_proof?: boolean;
  payment_id?: string; needs_refund?: boolean; notified?: Record<string, string>;
  status: Status; created_at: string;
}
export interface ShopConfig {
  upi_id: string; upi_name: string;
  /** Razorpay is set up on the server (pay by UPI / card / net banking). */
  online_pay?: boolean; razorpay_key?: string;
  /** WhatsApp updates are switched on. */
  whatsapp?: boolean; low_stock_at?: number;
}
export const payLabel = (m: string) => (m === "Online" ? "Online (UPI / Card / Net banking)" : m);

export const STATUSES: Status[] = ["Pending", "Fulfilled", "Out for delivery", "Delivered", "Cancelled"];
export const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Mirrors the backend rule: delivery is ₹60 under ₹1,500, free above. Pickup is always free. */
export const deliveryFee = (mode: Mode, subtotal: number) =>
  mode === "Delivery" && subtotal > 0 && subtotal < SITE.freeDeliveryAbove ? SITE.deliveryFee : 0;

export const discountPct = (p: Pick<Product, "price" | "original_price">) =>
  p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;

/* ---------- phone ---------- */
/** "+91 98458-28903" → "9845828903". Returns "" when it is not a valid Indian mobile number. */
export function cleanPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}

/* ---------- pickup slots (shop is closed on Sundays) ---------- */
export interface SlotDay { label: string; times: string[] }

const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  return `${h > 12 ? h - 12 : h}:${String(m % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
/** 11:00–13:30 and 16:30–20:00, every 30 minutes (same hours as the original storefront). */
const ALL_SLOTS: number[] = [];
for (let m = 660; m <= 1200; m += 30) if (!(m >= 840 && m < 990)) ALL_SLOTS.push(m);

/** Next open days with times that are still at least 45 minutes away. Uses India time. */
export function pickupSlots(now: Date = new Date(), daysAhead = 3): SlotDay[] {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const out: SlotDay[] = [];
  for (let i = 0; out.length < daysAhead && i < 10; i++) {
    const d = new Date(ist); d.setDate(ist.getDate() + i);
    if (d.getDay() === 0) continue; // Sunday closed
    const nowMin = ist.getHours() * 60 + ist.getMinutes();
    const times = ALL_SLOTS.filter((m) => i > 0 || m >= nowMin + 45).map(fmt);
    if (!times.length) continue;
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    out.push({ label, times });
  }
  return out;
}

/* ---------- order tracking ---------- */
export const trackSteps = (mode: Mode): { status: Status; label: string; hint: string }[] =>
  mode === "Pickup"
    ? [
        { status: "Pending", label: "Order received", hint: "We’re getting your order ready" },
        { status: "Fulfilled", label: "Ready for pickup", hint: "Packed fresh at our Malleshwaram store" },
        { status: "Delivered", label: "Collected", hint: "Enjoy your sweets!" },
      ]
    : [
        { status: "Pending", label: "Order received", hint: "We’re getting your order ready" },
        { status: "Fulfilled", label: "Packed", hint: "Packed fresh and ready to go" },
        { status: "Out for delivery", label: "On the way", hint: "Your order is out for delivery" },
        { status: "Delivered", label: "Delivered", hint: "Enjoy your sweets!" },
      ];
