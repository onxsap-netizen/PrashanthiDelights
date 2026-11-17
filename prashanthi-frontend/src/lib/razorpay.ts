import { apiPost } from "@/lib/api";
import type { Order } from "@/lib/shop";

/** What POST /orders/{code}/pay returns: everything Razorpay Checkout needs. The amount is set by OUR server. */
interface PayStart {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  prefill: { name: string; contact: string };
}
interface RzpResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
type RzpCtor = new (o: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global { interface Window { Razorpay?: RzpCtor } }

let loading: Promise<void> | null = null;
/** Razorpay's script is loaded only when a customer actually pays online (keeps the storefront light). */
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("We couldn’t load the payment window. Please check your connection and try again.")); };
    document.head.appendChild(s);
  });
  return loading;
}

export type PayResult = { kind: "paid"; order: Order } | { kind: "dismissed" } | { kind: "failed"; message: string };

/** Opens the Razorpay window for an order and verifies the result with our server. Never throws. */
export async function payOnline(order: Order): Promise<PayResult> {
  try {
    const [start] = await Promise.all([apiPost<PayStart>(`/orders/${order.code}/pay`, { phone: order.phone }), loadScript()]);
    return await new Promise<PayResult>((resolve) => {
      let settled = false;
      const done = (r: PayResult) => { if (!settled) { settled = true; resolve(r); } };
      const rzp = new window.Razorpay!({
        key: start.key, order_id: start.order_id, amount: start.amount, currency: start.currency,
        name: start.name, description: start.description, prefill: start.prefill, theme: { color: "#7a231c" },
        modal: { ondismiss: () => done({ kind: "dismissed" }) },
        handler: (r: RzpResponse) => {
          apiPost<Order>(`/orders/${order.code}/pay/verify`, { phone: order.phone, ...r })
            .then((o) => done({ kind: "paid", order: o }))
            .catch(() => done({ kind: "failed", message: "We couldn’t confirm your payment yet. If money was deducted, your order will update automatically within a few minutes." }));
        },
      });
      rzp.on("payment.failed", (r) => done({ kind: "failed", message: r.error?.description || "The payment didn’t go through. You can try again." }));
      rzp.open();
    });
  } catch (e) {
    const status = (e as { status?: number }).status;
    return { kind: "failed", message: status === 409 ? "This order is already paid or has expired." : (e as Error).message?.startsWith("API error") ? "We couldn’t start the payment. Please try again." : (e as Error).message };
  }
}
