import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { serif } from "@/lib/brand";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { rupees } from "@/lib/shop";

type Level = "out" | "low" | "soon" | "ok" | "untracked";
interface Row { id: string; name: string; category: string; qty: number; orders: number; amount: number; stock: number | null; available: boolean; open_qty: number; sold_7d: number; restock: number; level: Level }
interface Summary {
  days: number; label: string; date: string; orders: number; cancelled: number; items_sold: number; sales: number; collected: number; pending: number;
  by_status: Record<string, number>; by_mode: Record<string, number>; by_payment: Record<string, number>; products: Row[];
  stock: { tracked: number; untracked: number; low_at: number; open_units: number; out: string[]; low: { name: string; stock: number }[]; restock: { name: string; category: string; stock: number; sold_7d: number; need: number; level: Level }[] };
}
interface Integrations { razorpay: boolean; razorpay_webhook: boolean; whatsapp: boolean; owner_whatsapp: boolean; site_url: boolean; cron: boolean; low_stock_at: number }
interface Log { event: string; to: string; order_code: string; status: string; detail: string; text: string; created_at: string }

const RANGES: [string, number][] = [["Today", 1], ["Last 7 days", 7], ["Last 30 days", 30], ["All time", 0]];
const card = "rounded-2xl border border-[#eadfce] bg-white p-4";
const label = "text-xs font-semibold tracking-[0.15em] text-[#7b6a5f]";

function Stock({ row, low, onChange }: { row: Row; low: number; onChange: (body: object) => void }) {
  const s = row.stock;
  const tone = s === null ? "" : s === 0 ? "border-red-300 bg-red-50" : s <= low ? "border-yellow-400 bg-yellow-50" : "";
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input type="number" min={0} placeholder="Off" aria-label={`Set stock for ${row.name}`} key={String(s)} defaultValue={s ?? ""} className={`h-8 w-20 bg-white text-right ${tone}`}
        onBlur={(e) => { const v = e.target.value.trim(); if (v === "") { if (s !== null) onChange({ stock_tracked: false }); } else if (Number(v) !== s) onChange({ stock: Math.max(0, Math.floor(Number(v))) }); }} />
      <button type="button" aria-label={`Add 10 to ${row.name}`} className="h-8 rounded-full border border-[#d9c9ad] px-2 text-xs font-semibold disabled:opacity-40" disabled={s === null} onClick={() => onChange({ stock_add: 10 })}>+10</button>
    </div>
  );
}

function Setup({ i, onOpenSettings }: { i: Integrations; onOpenSettings?: () => void }) {
  const rows: [boolean, string, string][] = [
    [i.razorpay, "Online payment (Razorpay)", "Add the Razorpay Key ID and Key Secret in the Settings tab"],
    [i.razorpay_webhook, "Payment safety net (webhook)", "Add the Razorpay Webhook Secret in Settings so paid orders are confirmed even if the customer closes the page"],
    [i.whatsapp, "WhatsApp messages to customers", "Add the WhatsApp token and phone number ID in Settings, and approve the message templates"],
    [i.owner_whatsapp, "WhatsApp alerts to you", "Add your WhatsApp number in Settings for new-order, low-stock and daily summary alerts"],
    [i.site_url, "Tracking link in messages", "Add your shop web address in Settings"],
    [i.cron, "Automatic daily summary", "Add a daily summary secret in Settings and schedule /api/cron/daily-summary once a day"],
  ];
  const done = rows.filter((r) => r[0]).length;
  return (
    <details className={card} open={done < rows.length}>
      <summary className="cursor-pointer select-none font-semibold">Setup checklist <span className="ml-1 rounded-full bg-[#f3e8d8] px-2 py-0.5 text-xs">{done} of {rows.length} ready</span></summary>
      <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {rows.map(([ok, t, hint]) => <li key={t} className="flex gap-2"><span aria-hidden className={ok ? "text-green-700" : "text-[#b08a2e]"}>{ok ? "✓" : "○"}</span><span><b>{t}</b>{!ok && <span className="block text-xs opacity-70">{hint}</span>}</span></li>)}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs opacity-80">{onOpenSettings && <Button size="sm" onClick={onOpenSettings}>Add keys in Settings</Button>}<span>Step-by-step instructions are in WHATSAPP_SETUP.md in your project.</span></div>
    </details>
  );
}

function MessageLog() {
  const log = useQuery({ queryKey: ["admin", "notifications"], queryFn: () => apiGet<Log[]>("/admin/notifications?limit=40") });
  const rows = log.data ?? [];
  return (
    <details className={card}>
      <summary className="cursor-pointer select-none font-semibold">Recent WhatsApp messages <span className="ml-1 text-xs opacity-60">({rows.length})</span></summary>
      <div className="mt-3 max-h-80 overflow-auto text-xs">
        {rows.length === 0 && <p className="opacity-60">Nothing sent yet.</p>}
        {rows.map((l, k) => (
          <div key={k} className="border-b border-[#f3e8d8] py-2">
            <div className="flex flex-wrap items-center gap-2"><b>{l.event.replaceAll("_", " ")}</b><span className="opacity-60">{l.order_code} · {l.to}</span>
              <span className={`rounded-full px-2 py-0.5 ${l.status === "sent" ? "bg-green-100 text-green-800" : l.status === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{l.status === "skipped" ? "not sent" : l.status}</span>
              <span className="ml-auto opacity-60">{new Date(l.created_at + (l.created_at.endsWith("Z") ? "" : "Z")).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div>
            {l.status !== "sent" && l.detail && <div className="mt-0.5 text-red-700/80">{l.detail}</div>}
          </div>
        ))}
      </div>
    </details>
  );
}

const LEVEL: Record<Level, { text: string; chip: string; row: string }> = {
  out: { text: "Sold out", chip: "bg-red-100 text-red-700", row: "bg-red-50/70" },
  low: { text: "Restock now", chip: "bg-yellow-100 text-yellow-900", row: "bg-yellow-50/80" },
  soon: { text: "Will run short", chip: "bg-orange-100 text-orange-800", row: "bg-orange-50/60" },
  ok: { text: "OK", chip: "bg-green-100 text-green-800", row: "" },
  untracked: { text: "Not tracked", chip: "bg-gray-100 text-gray-600", row: "" },
};

/** What to make / buy next: sold-out and low items first, with how many to add. */
function RestockList({ s }: { s: Summary }) {
  const list = s.stock.restock;
  const copy = () => navigator.clipboard?.writeText(`Restock list ${s.date}\n` + list.map((r) => `${r.name}: ${r.need}`).join("\n")).then(() => toast.success("Restock list copied"), () => toast.error("Couldn’t copy"));
  if (s.stock.tracked === 0) return <div className={`${card} text-sm`}><b>Stock isn’t tracked yet.</b> Type a quantity in the “In hand” box next to an item below and it will start counting down with every order.</div>;
  if (list.length === 0) return <div className={`${card} text-sm`}><b className="text-green-800">Stock looks good.</b> Nothing needs restocking right now.</div>;
  return (
    <div className="rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-4">
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold" style={serif}>Restock list <span className="ml-1 rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-semibold">{list.length} item{list.length > 1 ? "s" : ""}</span></h2>
        <Button size="sm" variant="outline" className="ml-auto" onClick={copy}>Copy list</Button></div>
      <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {list.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
            <span><b>{r.name}</b><span className="block text-xs opacity-70">{r.stock} in hand · {r.sold_7d} sold in 7 days</span></span>
            <span className="shrink-0 text-right"><b className="text-lg text-[#6b1424]">+{r.need}</b><span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${LEVEL[r.level].chip}`}>{LEVEL[r.level].text}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SummaryTab({ onOpenSettings }: { onOpenSettings?: () => void } = {}) {
  const qc = useQueryClient();
  const [days, setDays] = useState(1);
  const [term, setTerm] = useState("");
  const [only, setOnly] = useState<"all" | "attention" | "sold" | "pending">("all");
  const q = useQuery({ queryKey: ["admin", "summary", days], queryFn: () => apiGet<Summary>(`/admin/summary?days=${days}`), refetchInterval: 30000 });
  const setup = useQuery({ queryKey: ["admin", "integrations"], queryFn: () => apiGet<Integrations>("/admin/integrations") });
  const patch = useMutation({ mutationFn: (v: { id: string; body: object }) => apiPatch(`/admin/products/${v.id}`, v.body), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Stock updated"); }, onError: () => toast.error("Couldn’t update stock") });
  const send = useMutation({
    mutationFn: () => apiPost<{ status: string }>(`/admin/summary/send?days=${days}`),
    onSuccess: (r) => r.status === "sent" ? toast.success("Summary sent to your WhatsApp") : toast.error(r.status === "skipped" ? "Add your WhatsApp number and the WhatsApp keys in Settings to send summaries." : "Couldn’t send. Check the WhatsApp setup."),
    onError: () => toast.error("Couldn’t send the summary"),
  });

  const s = q.data;
  if (q.isError) return <p className="mx-auto max-w-6xl px-5 py-8">Couldn’t load the summary. It will retry shortly.</p>;
  if (!s) return <p className="mx-auto max-w-6xl px-5 py-8">Loading summary…</p>;
  const low = s.stock.low_at;
  const attention = (r: Row) => r.level === "out" || r.level === "low" || r.level === "soon";
  const rows = s.products.filter((r) => (!term || r.name.toLowerCase().includes(term.toLowerCase()) || r.category.toLowerCase().includes(term.toLowerCase())) && (only === "all" || (only === "sold" ? r.qty > 0 : only === "pending" ? r.open_qty > 0 : attention(r))));
  const cats = [...new Set(rows.map((r) => r.category))];
  const rank = (r: Row) => ["out", "low", "soon", "ok", "untracked"].indexOf(r.level);
  const exportCsv = () => downloadCsv(`prashanthi-product-summary-${new Date().toLocaleDateString("en-CA")}.csv`, ["Product", "Category", "In hand", "Sold (" + s.label + ")", "Pending delivery (qty)", "Sold last 7 days", "Suggested restock", "Status", "Orders", "Sales (INR)"],
    s.products.map((r) => [r.name, r.category, r.stock === null ? "Not tracked" : r.stock, r.qty, r.open_qty, r.sold_7d, r.restock, LEVEL[r.level].text, r.orders, r.amount]));

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-5 pb-12 pt-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#eadfce] bg-white p-4">
        <label className="grid gap-1 text-sm">Period<select className="h-9 rounded-full border border-[#e3d5bd] bg-white px-3 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>{RANGES.map(([l, d]) => <option key={d} value={d}>{l}</option>)}</select></label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>Download product summary (CSV)</Button>
          <Button size="sm" onClick={() => send.mutate()} disabled={send.isPending}>{send.isPending ? "Sending…" : "Send this summary to my WhatsApp"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {([["ORDERS", s.orders, `${s.cancelled} cancelled`], ["ITEMS SOLD", s.items_sold, `${s.products.filter((r) => r.qty > 0).length} different products`], ["SALES", rupees(s.sales), "excl. cancelled"], ["COLLECTED", rupees(s.collected), "paid"], ["TO COLLECT", rupees(s.pending), "unpaid"]] as const).map(([k, v, sub]) => (
          <div key={k} className={card}><div className={label}>{k}</div><b className="mt-2 block text-3xl text-[#6b1424]" style={serif}>{v}</b><div className="text-xs opacity-60">{sub}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {Object.entries(s.by_status).map(([k, v]) => <span key={k} className="rounded-full border border-[#e3d5bd] bg-white px-3 py-1">{k} {v}</span>)}
        {Object.entries(s.by_mode).map(([k, v]) => <span key={k} className="rounded-full border border-[#e3d5bd] bg-white px-3 py-1">{k} {v}</span>)}
        {Object.entries(s.by_payment).map(([k, v]) => <span key={k} className="rounded-full border border-[#e3d5bd] bg-white px-3 py-1">{k} {v}</span>)}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["UNITS IN HAND", s.products.reduce((t, r) => t + (r.id && r.stock !== null ? r.stock : 0), 0), `${s.stock.tracked} items tracked`],
           ["PENDING DELIVERY", s.stock.open_units, "units in open orders"],
           ["TO RESTOCK", s.stock.restock.length, "items need more"],
           ["SOLD OUT", s.stock.out.length, "hidden from the shop"]] as const).map(([k, v, sub]) => (
          <div key={k} className={card}><div className={label}>{k}</div><b className="mt-2 block text-3xl text-[#6b1424]" style={serif}>{v}</b><div className="text-xs opacity-60">{sub}</div></div>
        ))}
      </div>

      <RestockList s={s} />

      <div className="overflow-x-auto rounded-2xl border border-[#eadfce] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eadfce] p-4">
          <h2 className="text-lg font-bold" style={serif}>Product-wise orders & stock <span className="text-sm font-normal opacity-60">· {s.label}</span></h2>
          <Input className="ml-auto h-9 w-48 rounded-full bg-white" placeholder="Search product" value={term} onChange={(e) => setTerm(e.target.value)} />
          <select aria-label="Show" className="h-9 rounded-full border border-[#e3d5bd] bg-white px-3 text-sm" value={only} onChange={(e) => setOnly(e.target.value as typeof only)}><option value="all">All products</option><option value="sold">Sold in this period</option><option value="pending">Pending delivery</option><option value="attention">Needs restock</option></select>
        </div>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-[#eadfce]">{[["Product", ""], ["In hand", "Left to sell now"], ["Sold", s.label], ["Pending", "In orders not yet delivered"], ["Restock", "Suggested to add"], ["Set stock", "blank = not tracked"]].map(([h, sub], k) => <th key={h} className={`px-4 py-2.5 font-semibold ${k > 0 ? "text-right" : ""}`}>{h}{sub && <span className="block text-[11px] font-normal opacity-60">{sub}</span>}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center opacity-70">Nothing matches.</td></tr>}
            {cats.map((c) => (
              <Fragment key={c}>
                <tr className="bg-[#f8f1ea]"><td colSpan={6} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#7b6a5f]">{c}</td></tr>
                {rows.filter((r) => r.category === c).sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name)).map((r) => (
                  <tr key={r.name} className={`border-b border-[#f3e8d8] ${LEVEL[r.level].row}`}>
                    <td className="px-4 py-2.5">{r.name}{(r.level === "out" || r.level === "low" || r.level === "soon") && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${LEVEL[r.level].chip}`}>{LEVEL[r.level].text}</span>}{!r.id && <span className="ml-2 text-xs opacity-60">(no longer on menu)</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.stock === null || !r.id ? <span className="opacity-40">-</span> : <b className={r.stock === 0 ? "text-red-700" : ""}>{r.stock}</b>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.qty}<span className="block text-[11px] opacity-60">{rupees(r.amount)}</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.open_qty || <span className="opacity-40">0</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.restock > 0 ? <b className="text-[#6b1424]">+{r.restock}</b> : <span className="opacity-40">-</span>}</td>
                    <td className="px-4 py-2">{r.id ? <Stock row={r} low={low} onChange={(body) => patch.mutate({ id: r.id, body })} /> : <span className="block text-right opacity-40">-</span>}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#eadfce] p-3 text-xs opacity-70"><b>In hand</b> = what you can still sell (it drops the moment an order is placed and returns if the order is cancelled). <b>Pending</b> = units already taken by orders that aren’t delivered yet, so they still need to be packed or delivered. <b>Restock</b> = enough for the last 7 days of sales (at least {low * 2}), minus what is in hand. Items at 0 are hidden from the shop; customers see “Only N left” at {low} or fewer. Leave “Set stock” blank to stop tracking an item.</p>
      </div>

      {setup.data && <Setup i={setup.data} onOpenSettings={onOpenSettings} />}
      <MessageLog />
    </div>
  );
}
