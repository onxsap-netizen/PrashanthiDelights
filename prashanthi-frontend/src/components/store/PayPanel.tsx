import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SITE } from "@/config/site";
import { apiPost, explain } from "@/lib/api";
import { useShopConfig } from "@/lib/hooks";
import { shrinkPhoto } from "@/lib/image";
import { payOnline } from "@/lib/razorpay";
import { rupees } from "@/lib/shop";
import type { Order } from "@/lib/shop";
import { CameraIcon, CheckIcon, CopyIcon } from "./Icons";
import { Field } from "./Field";

export const payState = (o: Order) => o.payment_status ?? (o.paid ? "Paid" : "Unpaid");

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    import("qrcode").then((m) => m.toDataURL(value, { margin: 1, width: 360, color: { dark: "#430f0c", light: "#ffffff" } })).then((u) => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [value]);
  return src ? <img src={src} alt="UPI QR code for this payment" width={180} height={180} className="size-44 rounded-2xl border-2 border-beige-200 bg-white p-2" /> : <div className="skeleton size-44 rounded-2xl" />;
}

/** Everything a customer needs to pay an order, and to tell us they've paid. Works with the backend's /config and /orders/{code}/proof. */
export function PayPanel({ order, onUpdated }: { order: Order; onUpdated?: (o: Order) => void }) {
  const cfg = useShopConfig();
  const qc = useQueryClient();
  const [utr, setUtr] = useState("");
  const [shot, setShot] = useState("");
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const state = payState(order);

  const proof = useMutation({
    mutationFn: () => apiPost<Order>(`/orders/${order.code}/proof`, { phone: order.phone, utr: utr.trim(), image: shot }),
    onSuccess: (o) => { toast.success("Thanks! We’ll confirm your payment shortly."); onUpdated?.(o); qc.invalidateQueries({ queryKey: ["track"] }); },
    onError: (e) => setErr(explain(e, "We couldn’t save that. Please try again.")),
  });

  if (order.payment_method === "Online") {
    return state === "Paid" ? <p className="flex items-center gap-2 font-semibold text-leaf"><CheckIcon width={20} height={20} />Payment received. Thank you!</p>
      : <OnlinePay order={order} onPaid={(o) => onUpdated?.(o)} />;
  }
  if (order.payment_method !== "UPI") {
    return state === "Paid"
      ? <p className="flex items-center gap-2 font-semibold text-leaf"><CheckIcon width={20} height={20} />Payment received</p>
      : <p className="text-[15px]">Please pay <b>{rupees(order.total)}</b> {order.mode === "Pickup" ? "when you collect your order." : "when your order arrives."}</p>;
  }
  if (state === "Paid") return <p className="flex items-center gap-2 font-semibold text-leaf"><CheckIcon width={20} height={20} />Payment received. Thank you!</p>;
  if (state === "Proof submitted") return (
    <div className="rounded-2xl bg-gold-100 p-4 text-[15px]"><b>Payment details received.</b> We’re confirming your payment and will update your order shortly.{order.payment_ref && <p className="mt-1 text-sm text-ink-soft">Transaction ID: {order.payment_ref}</p>}</div>
  );

  const upi = cfg.data?.upi_id;
  const link = upi ? `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(cfg.data?.upi_name || SITE.name)}&am=${order.total}&cu=INR&tn=${encodeURIComponent(order.code)}` : "";

  const pick = async (f?: File) => {
    if (!f) return;
    try { setShot(await shrinkPhoto(f, 1000, 380_000)); setErr(""); } catch (e) { setErr((e as Error).message); }
    if (file.current) file.current.value = "";
  };
  const send = () => {
    if (!utr.trim() && !shot) return setErr("Add the UPI transaction ID or a screenshot of the payment.");
    setErr(""); proof.mutate();
  };

  return (
    <div className="grid gap-5">
      {upi ? (
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <div className="hidden justify-self-center md:block"><Qr value={link} /></div>
          <div className="grid gap-3">
            <p className="text-[15px]">Pay <b className="text-lg text-maroon-800">{rupees(order.total)}</b> to <b>{cfg.data?.upi_name || SITE.name}</b></p>
            <a href={link} className="grid h-14 place-items-center rounded-full bg-maroon-700 px-6 text-[17px] font-extrabold text-white shadow-lift active:scale-[.98] md:hidden">Pay {rupees(order.total)} in UPI app</a>
            <p className="hidden text-sm text-ink-soft md:block">Scan the QR with any UPI app on your phone.</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-soft">UPI ID</span><code className="rounded-lg bg-beige px-2.5 py-1.5 font-semibold">{upi}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(upi).then(() => toast.success("UPI ID copied"), () => toast.error("Couldn’t copy. Please select and copy it."))} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-bold text-maroon-700"><CopyIcon width={17} height={17} />Copy</button>
            </div>
            <p className="text-xs text-ink-soft">Add “{order.code}” as the payment note if your app lets you.</p>
          </div>
        </div>
      ) : <p className="rounded-2xl bg-gold-100 p-4 text-[15px]">UPI details aren’t available right now. Please call <a className="font-bold underline" href={SITE.phoneHref}>{SITE.phoneDisplay}</a> to pay.</p>}

      <div className="grid gap-3 rounded-2xl bg-cream p-4">
        <h3 className="font-display text-lg text-maroon-800">Already paid? Tell us</h3>
        <Field label="UPI transaction ID (UTR)" value={utr} onChange={(e) => setUtr(e.target.value)} inputMode="text" autoCapitalize="characters" placeholder="e.g. 4123 4567 8901" />
        <div>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" onClick={() => file.current?.click()} className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-dashed border-maroon-700/50 px-5 font-bold text-maroon-700"><CameraIcon width={20} height={20} />{shot ? "Change screenshot" : "Add payment screenshot"}</button>
          {shot && <img src={shot} alt="Your payment screenshot" className="mt-3 h-24 rounded-xl border border-beige-200" />}
        </div>
        {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
        <button type="button" onClick={send} disabled={proof.isPending} className="h-12 rounded-full bg-maroon-800 px-6 font-bold text-white disabled:opacity-60">{proof.isPending ? "Sending…" : "Send payment details"}</button>
      </div>
    </div>
  );
}

/** "Pay online" (Razorpay: UPI, cards, net banking). Opens automatically right after the order is placed. */
export function OnlinePay({ order, auto = false, onPaid }: { order: Order; auto?: boolean; onPaid: (o: Order) => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const started = useRef(false);

  const pay = async () => {
    if (busy) return;
    setBusy(true); setMsg("");
    const r = await payOnline(order);
    setBusy(false);
    if (r.kind === "paid") { toast.success("Payment received. Thank you!"); onPaid(r.order); qc.invalidateQueries({ queryKey: ["track"] }); }
    else if (r.kind === "failed") setMsg(r.message);
    else setMsg("Payment not completed yet. Your order is saved. Pay now to confirm it.");
  };
  useEffect(() => { if (auto && !started.current) { started.current = true; void pay(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="grid gap-3">
      <p className="text-[15px]">Pay <b className="text-lg text-maroon-800">{rupees(order.total)}</b> securely with UPI, card or net banking.</p>
      <button type="button" onClick={pay} disabled={busy} className="h-14 rounded-full bg-maroon-700 px-6 text-[17px] font-extrabold text-white shadow-lift active:scale-[.98] disabled:opacity-60">{busy ? "Opening payment…" : `Pay ${rupees(order.total)} now`}</button>
      {msg && <p role="alert" className="rounded-xl bg-gold-100 p-3 text-sm font-medium text-maroon-900">{msg}</p>}
      <p className="text-xs text-ink-soft">Payments are handled by Razorpay. We never see your card or bank details. Your order is confirmed on WhatsApp once payment succeeds.</p>
    </div>
  );
}
