import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand, serif } from "@/components/ShopHeader";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { rupees, STATUSES } from "@/lib/shop";
import { downloadCsv } from "@/lib/csv";
import { shrinkPhoto } from "@/lib/image";
import type { Order, Product } from "@/lib/shop";

const TONE: Record<string, string> = { Pending: "bg-yellow-100 text-yellow-900", Fulfilled: "bg-blue-100 text-blue-800", "Out for delivery": "bg-purple-100 text-purple-800", Delivered: "bg-green-100 text-green-800", Cancelled: "bg-red-100 text-red-700" };
const RANGES: Record<string, number> = { Today: 1, "Last 7 days": 7, "Last 30 days": 30, "All time": 0 };
const sel = "h-9 rounded-full border border-[#e3d5bd] bg-white px-3 text-sm";
const day = (d: string | Date) => new Date(d).toLocaleDateString("en-CA");

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const m = useMutation({ mutationFn: () => apiPost("/admin/login", { password: pw }), onSuccess: onDone, onError: () => toast.error("Wrong password") });
  return (
    <form className="mx-auto mt-16 grid max-w-sm gap-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <h1 className="text-2xl font-bold" style={serif}>Admin sign-in</h1>
      <Input type="password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <Button type="submit">Sign in</Button>
    </form>
  );
}


function Photo({ product, onSet }: { product: Product; onSet: (image: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    try { onSet(await shrinkPhoto(f)); } catch (e) { toast.error((e as Error).message); }
    if (ref.current) ref.current.value = "";
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Change photo for ${product.name}`} onClick={() => ref.current?.click()}
        className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-[#c9b48a] bg-[#f6ecdc] text-xs text-[#7b6a5f]">
        {product.image ? <img src={product.image} alt="" className="size-full object-cover" /> : "+ Photo"}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [range, setRange] = useState("Last 7 days");
  const [st, setSt] = useState("All statuses");
  const [ful, setFul] = useState("All types");
  const [pay, setPay] = useState("All methods");
  const [term, setTerm] = useState("");
  const [nw, setNw] = useState({ name: "", category: "Sweets", price: "", image: "" });
  const newPhoto = useRef<HTMLInputElement>(null);
  const orders = useQuery({ queryKey: ["admin", "orders"], queryFn: () => apiGet<Order[]>("/admin/orders"), refetchInterval: 15000 });
  const menu = useQuery({ queryKey: ["admin", "products"], queryFn: () => apiGet<Product[]>("/admin/products") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const patchOrder = useMutation({ mutationFn: (v: { id: string; body: object }) => apiPatch(`/admin/orders/${v.id}`, v.body), onSuccess: refresh });
  const patchProd = useMutation({ mutationFn: (v: { id: string; body: object }) => apiPatch(`/admin/products/${v.id}`, v.body), onSuccess: () => { refresh(); toast.success("Menu updated"); } });
  const delProd = useMutation({ mutationFn: (id: string) => apiDelete(`/admin/products/${id}`), onSuccess: refresh });
  const addProd = useMutation({ mutationFn: () => apiPost("/admin/products", { name: nw.name, category: nw.category, price: Number(nw.price), available: true, image: nw.image }),
    onSuccess: () => { setNw({ ...nw, name: "", price: "", image: "" }); refresh(); }, onError: () => toast.error("Enter a name and a price") });

  const all = orders.isError ? [] : (orders.data ?? []);
  const days = RANGES[range];
  const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - Math.max(days, 1) + 1);
  const inRange = all.filter((o) => days === 0 || new Date(o.created_at) >= from);
  const rows = inRange.filter((o) => (st === "All statuses" || o.status === st) && (ful === "All types" || o.mode === ful) && (pay === "All methods" || o.payment_method === pay)
    && (!term || [o.name, o.phone, o.code].some((x) => x.toLowerCase().includes(term.toLowerCase()))));
  const live = inRange.filter((o) => o.status !== "Cancelled");
  const sum = (a: Order[]) => a.reduce((s, o) => s + o.total, 0);
  const n = days || 30;
  const chart = Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); const k = day(d); return { d: k.slice(5), orders: all.filter((o) => day(o.created_at) === k).length }; });
  const methods = ["All methods", ...new Set(all.map((o) => o.payment_method))];

  const stamp = day(new Date());
  const exportOrders = () => {
    if (!rows.length) return toast.error("No orders to export for these filters");
    downloadCsv(`prashanthi-orders-${stamp}.csv`,
      ["Order ID", "Date", "Time", "Customer", "Phone", "Type", "Pickup slot", "Delivery address", "Items", "Item count", "Subtotal (INR)", "Delivery fee (INR)", "Total (INR)", "Payment method", "Paid", "Status"],
      rows.map((o) => { const d = new Date(o.created_at); return [o.code, day(d), d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), o.name, o.phone, o.mode,
        o.mode === "Pickup" ? o.slot : "", o.mode === "Delivery" ? o.address : "", o.items.map((i) => `${i.name} x ${i.qty}`).join("; "),
        o.items.reduce((s, i) => s + i.qty, 0), o.total - o.fee, o.fee, o.total, o.payment_method, o.paid ? "Yes" : "No", o.status]; }));
  };
  const exportItems = () => {
    const t = new Map<string, { qty: number; amount: number }>();
    rows.filter((o) => o.status !== "Cancelled").forEach((o) => o.items.forEach((i) => { const c = t.get(i.name) ?? { qty: 0, amount: 0 }; t.set(i.name, { qty: c.qty + i.qty, amount: c.amount + i.qty * i.price }); }));
    if (!t.size) return toast.error("No items to export for these filters");
    downloadCsv(`prashanthi-item-totals-${stamp}.csv`, ["Item", "Quantity sold", "Amount (INR)"],
      [...t.entries()].sort((a, b) => b[1].qty - a[1].qty).map(([k, v]) => [k, v.qty, v.amount]));
  };
  const exportMenu = () => downloadCsv(`prashanthi-menu-${stamp}.csv`, ["Item", "Category", "Price (INR)", "Available", "Has photo"],
    (menu.data ?? []).map((p) => [p.name, p.category, p.price, p.available ? "Yes" : "Hidden", p.image ? "Yes" : "No"]));

  return (
    <>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 pt-6 md:grid-cols-4">
        {([["ORDERS IN RANGE", live.length], ["TODAY’S ORDERS", all.filter((o) => day(o.created_at) === day(new Date()) && o.status !== "Cancelled").length], ["REVENUE (RANGE)", rupees(sum(live))], ["PENDING", inRange.filter((o) => o.status === "Pending").length]] as const).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[#eadfce] bg-white p-5"><div className="text-xs font-semibold tracking-[0.15em] text-[#7b6a5f]">{k}</div><b className="mt-4 block text-4xl text-[#6b1424]" style={serif}>{v}</b></div>
        ))}
      </div>
      <div className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-2 px-5 text-sm">
        {STATUSES.map((s) => <span key={s} className={`rounded-full px-3 py-1 ${TONE[s]}`}>{s} {inRange.filter((o) => o.status === s).length}</span>)}
        <span className="rounded-full border border-[#e3d5bd] bg-white px-3 py-1">{inRange.filter((o) => o.mode === "Delivery").length} delivery · {inRange.filter((o) => o.mode === "Pickup").length} pickup</span>
        <span className="rounded-full border border-green-300 bg-white px-3 py-1 text-green-800">Collected {rupees(sum(live.filter((o) => o.paid)))} of {rupees(sum(live))}</span>
      </div>
      <div className="mx-auto mt-4 flex max-w-6xl gap-2 px-5">
        <Button variant={tab === "orders" ? "default" : "outline"} onClick={() => setTab("orders")}>Orders</Button>
        <Button variant={tab === "menu" ? "default" : "outline"} onClick={() => setTab("menu")}>Menu and prices</Button>
      </div>
      {tab === "orders" ? (
        <div className="mx-auto max-w-6xl space-y-4 px-5 pb-12 pt-4">
          <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-[#eadfce] bg-white p-4">
            <label className="grid gap-1 text-sm">Date range<select className={sel} value={range} onChange={(e) => setRange(e.target.value)}>{Object.keys(RANGES).map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Status<select className={sel} value={st} onChange={(e) => setSt(e.target.value)}>{["All statuses", ...STATUSES].map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Fulfilment<select className={sel} value={ful} onChange={(e) => setFul(e.target.value)}>{["All types", "Delivery", "Pickup"].map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Payment<select className={sel} value={pay} onChange={(e) => setPay(e.target.value)}>{methods.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Search<Input className="h-9 w-56 rounded-full bg-white" placeholder="Name, phone or order ID" value={term} onChange={(e) => setTerm(e.target.value)} /></label>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={exportOrders}>Export orders (CSV)</Button>
              <Button size="sm" variant="outline" onClick={exportItems}>Export item totals</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white p-5">
            <div className="mb-2 text-xs font-semibold tracking-[0.15em] text-[#7b6a5f]">ORDERS PER DAY</div>
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="d" fontSize={11} /><YAxis allowDecimals={false} width={28} fontSize={11} /><Tooltip /><Bar dataKey="orders" fill="#7a1a2b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#eadfce] bg-white">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[#eadfce]">{["Order", "Customer", "Items", "Type", "Payment", "Total", "Status"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center opacity-70">No orders match these filters. New orders appear within 15 seconds.</td></tr>}
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-[#f3e8d8] align-top">
                    <td className="px-4 py-3"><b>{o.code}</b><div className="text-xs opacity-60">{new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div></td>
                    <td className="px-4 py-3">{o.name}<div className="text-xs opacity-60">{o.phone}</div></td>
                    <td className="max-w-56 px-4 py-3 text-xs">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</td>
                    <td className="px-4 py-3">{o.mode}<div className="text-xs opacity-60">{o.mode === "Pickup" ? o.slot : o.address}</div></td>
                    <td className="px-4 py-3">{o.payment_method}<div><button className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${o.paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-900"}`} onClick={() => patchOrder.mutate({ id: o.id, body: { paid: !o.paid } })}>{o.paid ? "Paid" : "Mark paid"}</button></div></td>
                    <td className="px-4 py-3 font-bold">{rupees(o.total)}</td>
                    <td className="px-4 py-3"><select aria-label="Order status" className={`h-8 rounded-full border-0 px-2 text-xs font-semibold ${TONE[o.status]}`} value={o.status} onChange={(e) => patchOrder.mutate({ id: o.id, body: { status: e.target.value } })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl px-5 pb-12 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm opacity-70">Tap a photo box to add or change a photo. Photos are shrunk automatically.</p>
            <Button size="sm" variant="outline" onClick={exportMenu}>Export menu (CSV)</Button>
          </div>
          {(menu.data ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 border-b border-[#eadfce] py-2">
              <Photo product={p} onSet={(image) => patchProd.mutate({ id: p.id, body: { image } })} />
              <div className="min-w-40 flex-1"><div className="font-semibold">{p.name}</div><div className="text-xs opacity-60">{p.category}</div></div>
              <Input type="number" min={0} defaultValue={p.price} aria-label={`Price for ${p.name}`} className="w-24 bg-white"
                onBlur={(e) => Number(e.target.value) !== p.price && patchProd.mutate({ id: p.id, body: { price: Number(e.target.value) } })} />
              {p.image && <Button size="sm" variant="outline" onClick={() => patchProd.mutate({ id: p.id, body: { image: "" } })}>Remove photo</Button>}
              <Button size="sm" variant={p.available ? "default" : "outline"} onClick={() => patchProd.mutate({ id: p.id, body: { available: !p.available } })}>{p.available ? "Available" : "Hidden"}</Button>
              <Button size="sm" variant="destructive" onClick={() => confirm(`Remove ${p.name}?`) && delProd.mutate(p.id)}>Remove</Button>
            </div>
          ))}
          <h2 className="mb-2 mt-6 text-xl font-bold" style={serif}>Add an item</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Item name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
            <Input placeholder="Category" value={nw.category} onChange={(e) => setNw({ ...nw, category: e.target.value })} />
            <Input placeholder="Price in ₹" type="number" value={nw.price} onChange={(e) => setNw({ ...nw, price: e.target.value })} />
            <Button onClick={() => addProd.mutate()}>Add to menu</Button>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <input ref={newPhoto} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setNw({ ...nw, image: await shrinkPhoto(f) }); } catch (er) { toast.error((er as Error).message); } if (newPhoto.current) newPhoto.current.value = ""; }} />
            <Button size="sm" variant="outline" onClick={() => newPhoto.current?.click()}>{nw.image ? "Change photo" : "Add a photo (optional)"}</Button>
            {nw.image && <img src={nw.image} alt="" className="size-12 rounded-lg object-cover" />}
          </div>
        </div>
      )}
    </>
  );
}

export default function Admin() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["admin-me"], queryFn: () => apiGet<{ ok: boolean }>("/admin/me"), retry: false });
  return (
    <div className="min-h-screen bg-[#f8f1ea] text-[#2b1a14]" style={brand}>
      <header className="flex items-center gap-3 bg-[#520e1e] px-5 py-3 text-[#fbeec0]">
        <img src="/prashanthi-logo.png" alt="" className="size-12 rounded-full bg-white p-0.5 ring-2 ring-[#c99a2e]" />
        <div className="leading-tight"><b className="block text-xl text-white" style={serif}>Order Dashboard</b><span className="text-[11px] tracking-[0.18em]">PRASHANTHI DELIGHTS · MALLESHWARAM</span></div>
        <div className="ml-auto flex items-center gap-4 text-sm font-semibold">
          <Link to="/" className="text-[#f2c26b]">View store</Link>
          {me.isSuccess && <button onClick={async () => { await apiPost("/admin/logout", {}); qc.clear(); window.location.reload(); }}>Sign out</button>}
        </div>
      </header>
      {me.isLoading ? <p className="p-6">Checking sign-in…</p> : me.isSuccess ? <Dashboard /> : <Login onDone={() => qc.invalidateQueries({ queryKey: ["admin-me"] })} />}
    </div>
  );
}
