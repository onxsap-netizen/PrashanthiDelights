import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SITE } from "@/config/site";
import { apiGet, explain } from "@/lib/api";
import { usePageTitle } from "@/lib/hooks";
import { cleanPhone, payLabel, rupees } from "@/lib/shop";
import type { Order } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { SearchIcon } from "@/components/store/Icons";
import { PayPanel, payState } from "@/components/store/PayPanel";
import { Timeline } from "@/components/store/Timeline";

export default function Track() {
  usePageTitle(`Track your order · ${SITE.name}`);
  const [sp, setSp] = useSearchParams();
  const { prefs } = useStore();
  const [input, setInput] = useState(sp.get("q") ?? "");
  const term = (sp.get("q") ?? "").trim();
  useEffect(() => setInput(sp.get("q") ?? ""), [sp]);
  // a phone number is matched exactly by the backend, so send the clean 10 digits
  const query = cleanPhone(term) || term.toUpperCase();
  const res = useQuery({ queryKey: ["track", query], enabled: query.length >= 6, queryFn: () => apiGet<Order[]>(`/orders/track?q=${encodeURIComponent(query)}`), refetchInterval: 30_000 });

  return (
    <div className="mx-auto max-w-xl px-4 pt-5">
      <h1 className="font-display text-[32px] font-semibold text-maroon-800">Track your order</h1>
      <p className="mt-1 text-ink-soft">Enter your order ID (like PRS-1234) or the phone number you ordered with.</p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setSp(input.trim() ? { q: input.trim() } : {}); }}>
        <label htmlFor="trk" className="sr-only">Order ID or phone number</label>
        <input id="trk" value={input} onChange={(e) => setInput(e.target.value)} placeholder="PRS-1234 or phone number" autoComplete="off" enterKeyHint="search"
          className="h-14 min-w-0 flex-1 rounded-full border-2 border-beige-200 bg-white px-5 text-base outline-none focus:border-maroon-700" />
        <button type="submit" aria-label="Find order" className="grid h-14 shrink-0 place-items-center rounded-full bg-maroon-700 px-6 font-extrabold text-white"><span className="hidden sm:inline">Find order</span><SearchIcon className="sm:hidden" /></button>
      </form>
      {!term && prefs.phone && <button onClick={() => setSp({ q: prefs.phone })} className="mt-3 min-h-11 text-sm font-bold text-maroon-700 underline underline-offset-4">Show orders for {prefs.phone}</button>}
      {term && term.length < 6 && <p className="mt-4 text-sm text-ink-soft">Enter at least 6 characters.</p>}

      {res.isLoading && res.fetchStatus !== "idle" && <div className="mt-5 space-y-3"><div className="skeleton h-52 rounded-3xl" /></div>}
      {res.isError && <p role="alert" className="mt-5 rounded-2xl bg-maroon-50 p-4 text-[15px] text-maroon-800">{explain(res.error, "Tracking isn’t available right now.")} You can also call <a className="font-bold underline" href={SITE.phoneHref}>{SITE.phoneDisplay}</a>.</p>}
      {res.data?.length === 0 && <div className="mt-5 rounded-3xl bg-white p-6 text-center shadow-card"><h2 className="font-display text-2xl text-maroon-800">No order found</h2><p className="mt-1 text-ink-soft">Check the ID or number and try again. Order IDs look like PRS-1234.</p></div>}
      <div className="mt-5 space-y-4">
        {res.data?.map((o) => {
          const st = payState(o);
          return (
            <article key={o.id} className="rounded-3xl bg-white p-5 shadow-card">
              <header className="flex items-start justify-between gap-3">
                <div><h2 className="font-display text-2xl text-maroon-800">{o.code}</h2><p className="text-sm text-ink-soft">{new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {o.mode}</p></div>
                <b className="text-lg tabular-nums">{rupees(o.total)}</b>
              </header>
              <div className="mt-5"><Timeline order={o} /></div>
              <p className="mt-5 text-[15px] text-ink-soft">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
              <p className="mt-2 text-sm">{o.mode === "Pickup" ? <>Pickup: <b>{o.slot}</b></> : <>Delivering to: <b>{o.address}</b></>}</p>
              <div className="mt-4 border-t border-dashed border-beige-200 pt-4">
                <p className="mb-2 text-sm font-semibold">Payment: {payLabel(o.payment_method)} · <span className={st === "Paid" ? "text-leaf" : ""}>{st === "Proof submitted" ? "Confirming" : st}</span></p>
                {o.status !== "Cancelled" && (o.payment_method === "UPI" || o.payment_method === "Online") && st !== "Paid" && <PayPanel order={o} />}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-ink-soft">Need help? <a href={SITE.phoneHref} className="font-bold text-maroon-700">Call {SITE.phoneDisplay}</a> or <a href={SITE.whatsappHref()} target="_blank" rel="noopener noreferrer" className="font-bold text-[#188a45]">WhatsApp us</a> · <Link to="/menu" className="font-bold text-maroon-700">Keep shopping</Link></p>
    </div>
  );
}
