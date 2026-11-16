export type Mode = "Pickup" | "Delivery";
export type Status = "Pending" | "Fulfilled" | "Out for delivery" | "Delivered" | "Cancelled";
export interface Product { id: string; name: string; category: string; price: number; available: boolean; image?: string }
export interface OrderItem { name: string; qty: number; price: number }
export interface Order {
  id: string; code: string; name: string; phone: string; mode: Mode; slot: string; address: string;
  payment_method: string; items: OrderItem[]; fee: number; total: number; paid: boolean; status: Status; created_at: string;
}
export const STATUSES: Status[] = ["Pending", "Fulfilled", "Out for delivery", "Delivered", "Cancelled"];
export const rupees = (n: number) => "₹" + n.toLocaleString("en-IN");
export function slots(): string[] {
  const out: string[] = [];
  for (let m = 660; m <= 1200; m += 30) {
    if (m >= 840 && m < 990) continue;
    const h = Math.floor(m / 60);
    out.push(`${h > 12 ? h - 12 : h}:${String(m % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`);
  }
  return out;
}
