import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SITE } from "@/config/site";
import { apiGet } from "@/lib/api";
import { usePageTitle } from "@/lib/hooks";
import { payLabel, rupees } from "@/lib/shop";
import type { Order } from "@/lib/shop";
import { CopyIcon, PhoneIcon } from "@/components/store/Icons";
import { OnlinePay, PayPanel, payState } from "@/components/store/PayPanel";
import { Timeline } from "@/components/store/Timeline";

function initial(code: string, state: unknown): Order | undefined {
  const o = (state as { order?: Order } | null)?.order;
  if (o?.code === code) return o;
  try { const s = JSON.parse(sessionStorage.getItem("prs-last-order") ?? "null") as Order | null; if (s?.code === code) return s; } catch { /* ignore */ }
}

export default function OrderPage() {
  const { code = "" } = useParams();
  const loc = useLocation();
  const seed = initial(code, loc.state);
  const [local, setLocal] = useState<Order | undefined>(seed);
  usePageTitle(`Order ${code} · ${SITE.name}`);
  const q = useQuery({
    queryKey: ["track", code], queryFn: () => apiGet<Order[]>(`/orders/track?q=${encodeURIComponent(code)}`),
    select: (l) => l.find((o) => o.code === code), refetchInterval: 30_000, initialData: seed ? [seed] : undefined,
  });
  const order = q.data ?? local;

  if (!order && q.isLoading) return <div className="mx-auto max-w-xl px-4 pt-8"><div className="skeleton h-64 rounded-3xl" /></div>;
  if (!order) return (
    <div className="mx-auto max-w-sm px-4 pt-12 text-center">
      <h2 className="font-display text-3xl text-maroon-800">We can’t find that order</h2>
      <p className="mt-2 text-ink-soft">{q.isError ? "We couldn’t reach the shop. Please check your connection." : "Double-check the order ID, or track it with your phone number."}</p>
      <Link to="/track" className="mt-5 inline-grid h-12 place-items-center rounded-full bg-maroon-700 px-8 font-bold text-white">Track an order</Link>
    </div>
  );
  const fresh = (loc.state as { fresh?: boolean } | null)?.fresh;
  const st = payState(order);
  const online = order.payment_method === "Online";
  const awaitingOnline = online && st !== "Paid" && order.status !== "Cancelled";

  return (
    <div className="mx-auto max-w-xl px-4 pt-4">
      <section className="relative overflow-hidden rounded-[28px] bg-maroon-800 p-6 pb-7 text-center text-white">
        <div className="kolam pointer-events-none absolute inset-0 opacity-25" aria-hidden />
        <div className="relative">
          <span className="anim-pop mx-auto grid size-16 place-items-center rounded-full bg-gold text-maroon-950"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path className="draw-check" d="m5 12.500 4.500 4.500L19 7.500" /></svg></span>
          <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight">{fresh ? `Thank you, ${order.name.split(" ")[0]}!` : "Here’s your order"}</h2>
          <p className="mt-1 text-gold-100/90">{awaitingOnline ? "Almost done! Complete your payment to confirm your order." : fresh ? "Your order is placed. We’ve started preparing it." : `Placed for ${order.name}`}</p>
          <button onClick={() => navigator.clipboard?.writeText(order.code).then(() => toast.success("Order ID copied"), () => {})} className="mx-auto mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-black/25 px-5 text-lg font-extrabold tracking-wide" aria-label={`Order ID ${order.code}. Tap to copy`}>{order.code}<CopyIcon width={18} height={18} className="text-gold-300" /></button>
          <p className="mt-2 text-sm text-gold-100/80">Save this ID to track your order.</p>
        </div>
      </section>

      {awaitingOnline && (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-card" aria-label="Payment">
          <h2 className="mb-3 font-display text-xl text-maroon-800">Complete your payment</h2>
          <OnlinePay order={order} auto={!!fresh} onPaid={setLocal} />
          <p className="mt-3 text-xs text-ink-soft">Not paid within 30 minutes? The order is released automatically.</p>
        </section>
      )}
      {online && st === "Paid" && (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white p-4 font-semibold text-leaf shadow-card">Payment received. Your order is confirmed. We’ve sent the details on WhatsApp.</p>
      )}
      {order.payment_method === "UPI" && st !== "Paid" && (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-card" aria-label="Payment">
          <h2 className="mb-3 font-display text-xl text-maroon-800">{st === "Proof submitted" ? "Payment" : "Complete your payment"}</h2>
          <PayPanel order={order} onUpdated={setLocal} />
        </section>
      )}

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-card" aria-label="Order status">
        <h2 className="mb-4 font-display text-xl text-maroon-800">Order status</h2>
        <Timeline order={order} />
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-card" aria-label="Order details">
        <h2 className="mb-3 font-display text-xl text-maroon-800">Your order</h2>
        <ul className="space-y-2 text-[15px]">{order.items.map((i, n) => <li key={n} className="flex justify-between gap-3"><span>{i.name} <span className="text-ink-soft">× {i.qty}</span></span><b className="tabular-nums">{rupees(i.price * i.qty)}</b></li>)}</ul>
        <dl className="mt-3 space-y-1.5 border-t border-dashed border-beige-200 pt-3 text-[15px]">
          <div className="flex justify-between"><dt className="text-ink-soft">{order.mode === "Delivery" ? "Delivery" : "Pickup"}</dt><dd className="font-semibold">{order.fee ? rupees(order.fee) : "Free"}</dd></div>
          <div className="flex justify-between text-lg"><dt className="font-bold">Total</dt><dd className="font-extrabold tabular-nums text-maroon-800">{rupees(order.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Payment</dt><dd className="font-semibold text-right">{payLabel(order.payment_method)} · {st === "Paid" ? "Paid" : st === "Proof submitted" ? "Confirming" : "Pending"}</dd></div>
        </dl>
        <div className="mt-4 rounded-2xl bg-cream p-3.5 text-[15px]">
          {order.mode === "Pickup" ? <><b>Pickup:</b> {order.slot}<br /><span className="text-ink-soft">{SITE.addressLines.join(", ")}</span></> : <><b>Delivering to:</b><br /><span className="text-ink-soft">{order.address}</span></>}
        </div>
        {order.payment_method !== "UPI" && !online && st !== "Paid" && <div className="mt-3"><PayPanel order={order} /></div>}
      </section>

      <div className="mt-5 grid gap-3">
        <Link to={`/track?q=${encodeURIComponent(order.code)}`} className="grid h-14 place-items-center rounded-full bg-maroon-700 text-lg font-extrabold text-white shadow-lift">Track this order</Link>
        <Link to="/menu" className="grid h-14 place-items-center rounded-full border-2 border-maroon-700 text-lg font-bold text-maroon-700">Continue shopping</Link>
        <a href={SITE.phoneHref} className="inline-flex min-h-12 items-center justify-center gap-2 text-[15px] font-bold text-maroon-700"><PhoneIcon width={18} height={18} />Questions? Call {SITE.phoneDisplay}</a>
      </div>
    </div>
  );
}
