import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SITE } from "@/config/site";
import { apiPost, explain } from "@/lib/api";
import { baseName } from "@/lib/catalog";
import { useCartLines } from "@/lib/cartMath";
import { usePageTitle, useShopConfig } from "@/lib/hooks";
import { cleanPhone, pickupSlots, rupees } from "@/lib/shop";
import type { Mode, Order } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { ModeSwitch } from "@/components/store/Header";
import { Field, selectCls } from "@/components/store/Field";
import { Summary } from "@/pages/Cart";
import { CheckIcon, ShieldIcon, StoreIcon, TruckIcon } from "@/components/store/Icons";

type Errs = Partial<Record<"name" | "phone" | "address" | "slot", string>>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-white p-4 shadow-card md:p-6"><h2 className="mb-4 font-display text-[22px] font-semibold text-maroon-800">{title}</h2><div className="grid gap-4">{children}</div></section>;
}

export default function Checkout() {
  usePageTitle(`Checkout · ${SITE.name}`);
  const nav = useNavigate();
  const { prefs, setPrefs, clear, rememberOrder } = useStore();
  const { valid, missing, subtotal, fee, total, mode, ready, isError, isLoading } = useCartLines();
  const cfg = useShopConfig();
  const onlineOn = !!cfg.data?.online_pay;   // payment is online-only: no cash on delivery, no pay at store
  const waOn = !!cfg.data?.whatsapp;
  const days = useMemo(() => pickupSlots(), []);

  const [name, setName] = useState(prefs.name);
  const [phone, setPhone] = useState(prefs.phone);
  const [address, setAddress] = useState(prefs.address);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("");
  const [errs, setErrs] = useState<Errs>({});
  const placed = useRef(false);

  const pay = "Online";
  useEffect(() => { setTime(days[day]?.times[0] ?? ""); }, [day, days]);

  const place = useMutation({
    mutationFn: () => apiPost<Order>("/orders", {
      name: name.trim(), phone: cleanPhone(phone), mode, slot: mode === "Pickup" ? `${days[day].label}, ${time}` : "",
      address: mode === "Delivery" ? address.trim() : "", payment_method: pay,
      items: valid.map((l) => ({ product_id: l.id, qty: l.qty })),
    }),
    onSuccess: (o) => {
      placed.current = true;
      rememberOrder(o);
      setPrefs({ name: name.trim(), phone: cleanPhone(phone), address: address.trim() });
      try { sessionStorage.setItem("prs-last-order", JSON.stringify(o)); } catch { /* ignore */ }
      // online orders go straight to the secure payment window on the order page
      nav(`/order/${o.code}`, { replace: true, state: { order: o, fresh: true } });
      clear();
    },
    onError: (e) => toast.error(explain(e, "We couldn’t place your order. Your basket is saved, so please try again."), { duration: 7000 }),
  });

  if (!placed.current && !isLoading && valid.length === 0 && missing.length === 0) return <Navigate to="/cart" replace />;

  const submit = () => {
    const e: Errs = {};
    if (name.trim().length < 2) e.name = "Please enter your name.";
    if (!cleanPhone(phone)) e.phone = "Enter a valid 10-digit mobile number.";
    if (mode === "Delivery" && address.trim().length < 10) e.address = "Please add your full address with area and pincode.";
    if (mode === "Pickup" && !time) e.slot = "Choose a pickup time.";
    setErrs(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (missing.length) return toast.error("An item in your basket is no longer available. Please review your basket.");
    if (!onlineOn) return toast.error("Online payment isn’t available right now. Please try again shortly.");
    place.mutate();
  };

  const blocked = place.isPending || !ready || valid.length === 0 || missing.length > 0 || !onlineOn;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 md:px-6">
      {(isError || missing.length > 0) && (
        <div role="alert" className="mb-4 rounded-2xl bg-maroon-50 p-4 text-[15px] text-maroon-800">
          {isError ? "We couldn’t load current prices. Check your connection and refresh." : <>Some items in your basket are no longer available. <Link to="/cart" className="font-bold underline">Review basket</Link></>}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-[1fr_360px]">
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid content-start gap-4">
          <Section title="How would you like it?">
            <ModeSwitch className="w-full [&>button]:min-h-12 [&>button]:flex-1 [&>button]:justify-center" />
            <p className="flex items-start gap-2.5 text-sm text-ink-soft">
              {mode === "Delivery" ? <><TruckIcon width={18} height={18} className="mt-0.5 shrink-0 text-maroon-700" />Delivered across Bengaluru. {fee === 0 ? "Free on this order." : `${rupees(SITE.deliveryFee)} fee, free above ${rupees(SITE.freeDeliveryAbove)}.`}</>
                : <><StoreIcon width={18} height={18} className="mt-0.5 shrink-0 text-maroon-700" />Collect from {SITE.addressLines.join(", ")}. Free. We’re closed on Sundays.</>}
            </p>
          </Section>

          <Section title="Your details">
            <Field label="Full name" name="name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setErrs((x) => ({ ...x, name: undefined })); }} error={errs.name} placeholder="e.g. Lakshmi Narayanan" />
            <Field label="Mobile number" name="tel" type="tel" inputMode="tel" autoComplete="tel" prefix="+91" value={phone} onChange={(e) => { setPhone(e.target.value); setErrs((x) => ({ ...x, phone: undefined })); }} error={errs.phone} hint="We’ll use this to confirm and for tracking your order." placeholder="98765 43210" />
            {mode === "Delivery"
              ? <Field multiline label="Delivery address" name="address" autoComplete="street-address" value={address} onChange={(e) => { setAddress(e.target.value); setErrs((x) => ({ ...x, address: undefined })); }} error={errs.address} placeholder="House / flat no., street, area, landmark, pincode" />
              : (
                <div className="grid grid-cols-2 gap-3">
                  <div><label htmlFor="pk-day" className="mb-1.5 block text-sm font-semibold">Pickup day</label>
                    <select id="pk-day" className={selectCls} value={day} onChange={(e) => setDay(Number(e.target.value))}>{days.map((d, i) => <option key={d.label} value={i}>{d.label}</option>)}</select></div>
                  <div><label htmlFor="pk-time" className="mb-1.5 block text-sm font-semibold">Time</label>
                    <select id="pk-time" aria-invalid={!!errs.slot} className={selectCls} value={time} onChange={(e) => setTime(e.target.value)}>{(days[day]?.times ?? []).map((t) => <option key={t}>{t}</option>)}</select></div>
                  {errs.slot && <p role="alert" className="col-span-2 text-sm font-medium text-red-700">{errs.slot}</p>}
                </div>
              )}
          </Section>

          <Section title="Payment">
            {cfg.isLoading ? <div className="skeleton h-20 rounded-2xl" /> : onlineOn ? (
              <div className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-maroon-700 bg-maroon-50 p-4">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-maroon-700 bg-maroon-700 text-white"><CheckIcon width={14} height={14} strokeWidth={3} /></span>
                <span className="leading-snug"><b className="block text-[16px]">Pay online</b><span className="text-sm text-ink-soft">UPI, debit / credit card or net banking. Your order is confirmed as soon as the payment goes through.</span></span>
              </div>
            ) : (
              <div role="alert" className="rounded-2xl bg-gold-100 p-4 text-[15px] font-medium text-maroon-900">Online payment isn’t available right now, so we can’t take new orders at this moment. Please try again shortly or call us on <b>{SITE.phoneDisplay}</b>.</div>
            )}
            <p className="flex items-center gap-2 text-sm text-ink-soft"><ShieldIcon width={18} height={18} className="shrink-0 text-leaf" />Card and UPI details are entered in Razorpay’s secure window. We never see them. We don’t take cash on delivery.</p>
            {waOn && <p className="text-sm text-ink-soft">We’ll send your order confirmation and updates on WhatsApp to the mobile number above.</p>}
          </Section>
        </form>

        <aside className="md:sticky md:top-24 md:self-start">
          <details className="group rounded-3xl bg-white p-4 shadow-card md:p-5" open={typeof window !== "undefined" && window.innerWidth >= 768}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-display text-xl text-maroon-800 md:pointer-events-none">
              <span>Order summary <span className="text-sm font-sans font-semibold text-ink-soft">({valid.reduce((s, l) => s + l.qty, 0)} items)</span></span>
              <span className="font-sans text-base font-extrabold tabular-nums md:hidden">{rupees(total)}</span>
            </summary>
            <ul className="mt-3 space-y-2 border-b border-dashed border-beige-200 pb-3 text-[15px]">
              {valid.map((l) => <li key={l.id} className="flex justify-between gap-3"><span>{baseName(l.product!.name)}{l.product!.name !== baseName(l.product!.name) && <span className="text-ink-soft"> · {l.product!.name.slice(baseName(l.product!.name).length).replace(/[()]/g, "").trim()}</span>} <span className="text-ink-soft">× {l.qty}</span></span><b className="tabular-nums">{rupees(l.product!.price * l.qty)}</b></li>)}
            </ul>
            <div className="mt-3"><Summary subtotal={subtotal} fee={fee} total={total} mode={mode} /></div>
            <button onClick={submit} disabled={blocked} className="mt-5 hidden h-14 w-full rounded-full bg-maroon-700 text-lg font-extrabold text-white shadow-lift active:scale-[.98] disabled:opacity-60 md:block">{place.isPending ? "Placing order…" : `Pay & place order · ${rupees(total)}`}</button>
          </details>
          <Link to="/cart" className="mt-3 block min-h-11 py-2 text-center text-sm font-bold text-maroon-700 underline underline-offset-4">Edit basket</Link>
        </aside>
      </div>

      <div className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-cream-50/97 px-4 pt-3 shadow-[0_-10px_30px_-14px_rgb(67_15_12/.35)] backdrop-blur md:hidden">
        <button onClick={submit} disabled={blocked} className="mb-3 flex h-14 w-full items-center justify-between rounded-full bg-maroon-700 px-6 text-white shadow-lift active:scale-[.98] disabled:opacity-60">
          <span className="text-[17px] font-extrabold">{place.isPending ? "Placing order…" : "Pay & place order"}</span><span className="text-[17px] font-extrabold tabular-nums">{rupees(total)}</span>
        </button>
      </div>
    </div>
  );
}
export type { Mode };
