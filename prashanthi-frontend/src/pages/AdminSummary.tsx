import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { serif } from "@/lib/brand";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { rupees } from "@/lib/shop";

interface Row { id: string; name: string; category: string; qty: number; orders: number; amount: number; stock: number | null; available: boolean }
interface Summary {
  days: number; label: string; date: string; orders: number; cancelled: number; items_sold: number; sales: number; collected: number; pending: number;
  by_status: Record<string, number>; by_mode: Record<string, number>; by_payment: Record<string, number>; products: Row[];
  stock: { tracked: number; untracked: number; low_at: number; out: string[]; low: { name: string; stock: number }[] };
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
      <Input type="number" min={0} placeholder="Off" aria-label={`Stock for ${row.name}`} key={String(s)} defaultValue={s ?? ""} className={`h-8 w-20 bg-white text-right ${tone}`}
        onBlur={(e) => { const v = e.target.value.trim(); if (v === "") { if (s !== null) onChange({ stock_tracked: false }); } else if (Number(v) !== s) onChange({ stock: Math.max(0, Math.floor(Number(v))) }); }} />
      <button type="button" aria-label={`Add 10 to ${row.name}`} className="h-8 rounded-full border border-[#d9c9ad] px-2 text-xs font-semibold disabled:opacity-40" disabled={s === null} onClick={() => onChange({ stock_add: 10 })}>+10</button>
    </div>
  );
}

function Setup({ i }: { i: Integrations }) {
  const rows: [boolean, string, string][] = [
    [i.razorpay, "Online payment (Razorpay)", "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server"],
    [i.razorpay_webhook, "Payment safety net (webhook)", "Add RAZORPAY_WEBHOOK_SECRET so paid orders are confirmed even if the customer closes the page"],
    [i.whatsapp, "WhatsApp messages to customers", "Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID, and approve the message templates"],
    [i.owner_whatsapp, "WhatsApp alerts to you", "Add OWNER_WHATSAPP (your number) for new-order, low-stock and daily summary alerts"],
    [i.site_url, "Tracking link in messages", "Add SITE_URL (your shop web address)"],
    [i.cron, "Automatic daily summary", "Add CRON_SECRET and schedule /api/cron/daily-summary once a day"],
  ];
  const done = rows.filter((r) => r[0]).length;
  return (
    <details className={card} open={done < rows.length}>
      <summary className="cursor-pointer select-none font-semibold">Setup checklist <span className="ml-1 rounded-full bg-[#f3e8d8] px-2 py-0.5 text-xs">{done} of {rows.length} ready</span></summary>
      <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {rows.map(([ok, t, hint]) => <li key={t} className="flex gap-2"><span aria-hidden className={ok ? "text-green-700" : "text-[#b08a2e]"}>{ok ? "✓" : "○"}</span><span><b>{t}</b>{!ok && <span className="block text-xs opacity-70">{hint}</span>}</span></li>)}
      </ul>
      <p className="mt-3 text-xs opacity-70">Step-by-step instructions are in WHATSAPP_SETUP.md in your project.</p>
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

export function SummaryTab() {
  const qc = useQueryClient();
  const [days, setDays] = useState(1);
  const [term, setTerm] = useState("");
  const [only, setOnly] = useState<"all" | "attention" | "sold">("all");
  const q = useQuery({ queryKey: ["admin", "summary", days], queryFn: () => apiGet<Summary>(`/admin/summary?days=${days}`), refetchInterval: 30000 });
  const setup = useQuery({ queryKey: ["admin", "integrations"], queryFn: () => apiGet<Integrations>("/admin/integrations") });
  const patch = useMutation({ mutationFn: (v: { id: string; body: object }) => apiPatch(`/admin/products/${v.id}`, v.body), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Stock updated"); }, onError: () => toast.error("Couldn’t update stock") });
  const send = useMutation({
    mutationFn: () => apiPost<{ status: string }>(`/admin/summary/send?days=${days}`),
    onSuccess: (r) => r.status === "sent" ? toast.success("Summary sent to your WhatsApp") : toast.error(r.status === "skipped" ? "Add OWNER_WHATSAPP and the WhatsApp keys to send summaries (see the checklist)." : "Couldn’t send. Check the WhatsApp setup."),
    onError: () => toast.error("Couldn’t send the summary"),
  });

  const s = q.data;
  if (q.isError) return <p className="mx-auto max-w-6xl px-5 py-8">Couldn’t load the summary. It will retry shortly.</p>;
  if (!s) return <p className="mx-auto max-w-6xl px-5 py-8">Loading summary…</p>;
  const low = s.stock.low_at;
  const attention = (r: Row) => r.stock !== null && r.stock <= low;
  const rows = s.products.filter((r) => (!term || r.name.toLowerCase().includes(term.toLowerCase()) || r.category.toLowerCase().includes(term.toLowerCase())) && (only === "all" || (only === "sold" ? r.qty > 0 : attention(r))));
  const cats = [...new Set(rows.map((r) => r.category))];
  const exportCsv = () => downloadCsv(`prashanthi-product-summary-${new Date().toLocaleDateString("en-CA")}.csv`, ["Product", "Category", "Orders", "Quantity sold", "Sales (INR)", "In stock"],
    s.products.map((r) => [r.name, r.category, r.orders, r.qty, r.amount, r.stock === null ? "Not tracked" : r.stock]));

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

      {(s.stock.out.length > 0 || s.stock.low.length > 0) && (
        <div role="status" className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm">
          {s.stock.out.length > 0 && <p><b className="text-red-700">Sold out (hidden from the shop):</b> {s.stock.out.join(", ")}</p>}
          {s.stock.low.length > 0 && <p className={s.stock.out.length ? "mt-1" : ""}><b>Running low (≤ {low}):</b> {s.stock.low.map((p) => `${p.name} (${p.stock})`).join(", ")}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#eadfce] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eadfce] p-4">
          <h2 className="text-lg font-bold" style={serif}>Product-wise orders & stock <span className="text-sm font-normal opacity-60">· {s.label}</span></h2>
          <Input className="ml-auto h-9 w-48 rounded-full bg-white" placeholder="Search product" value={term} onChange={(e) => setTerm(e.target.value)} />
          <select aria-label="Show" className="h-9 rounded-full border border-[#e3d5bd] bg-white px-3 text-sm" value={only} onChange={(e) => setOnly(e.target.value as typeof only)}><option value="all">All products</option><option value="sold">Sold in this period</option><option value="attention">Low or sold out</option></select>
        </div>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-[#eadfce]">{["Product", "Orders", "Qty sold", "Sales", "In stock (blank = not tracked)"].map((h, k) => <th key={h} className={`px-4 py-2.5 font-semibold ${k > 0 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center opacity-70">Nothing matches.</td></tr>}
            {cats.map((c) => (
              <Fragment key={c}>
                <tr className="bg-[#f8f1ea]"><td colSpan={5} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#7b6a5f]">{c}</td></tr>
                {rows.filter((r) => r.category === c).map((r) => (
                  <tr key={r.name} className="border-b border-[#f3e8d8]">
                    <td className="px-4 py-2.5">{r.name}{r.stock === 0 && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Sold out</span>}{r.stock !== null && r.stock > 0 && r.stock <= low && <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">Low</span>}{!r.id && <span className="ml-2 text-xs opacity-60">(no longer on menu)</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.orders}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{r.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{rupees(r.amount)}</td>
                    <td className="px-4 py-2">{r.id ? <Stock row={r} low={low} onChange={(body) => patch.mutate({ id: r.id, body })} /> : <span className="block text-right opacity-40">-</span>}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#eadfce] p-3 text-xs opacity-70">Stock goes down automatically when an order is placed and comes back if the order is cancelled. Items at 0 are hidden from the shop; customers see “Only N left” when stock is {low} or fewer. Leave it blank to stop tracking an item.</p>
      </div>

      {setup.data && <Setup i={setup.data} />}
      <MessageLog />
    </div>
  );
}
