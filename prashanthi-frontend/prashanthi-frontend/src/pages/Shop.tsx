import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ShopHeader, { brand, serif } from "@/components/ShopHeader";
import { apiGet, apiPost } from "@/lib/api";
import { rupees, slots } from "@/lib/shop";
import type { Mode, Order, Product } from "@/lib/shop";

const sel = "h-9 w-full rounded-md border bg-white px-2 text-sm";

export default function Shop() {
  const [mode, setMode] = useState<Mode>("Pickup");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", slot: slots()[0], address: "", pay: "UPI" });
  const [done, setDone] = useState<Order | null>(null);

  const products = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
  const list = products.isError ? [] : (products.data ?? []);
  const cats = ["All", ...new Set(list.map((p) => p.category))];
  const shown = list.filter((p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  const lines = list.filter((p) => cart[p.id]);
  const sub = lines.reduce((s, p) => s + p.price * cart[p.id], 0);
  const fee = mode === "Delivery" && sub > 0 && sub < 1500 ? 60 : 0;
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const bump = (id: string, d: number) =>
    setCart((c) => {
      const n = Math.max(0, (c[id] ?? 0) + d);
      const rest = { ...c };
      delete rest[id];
      return n ? { ...rest, [id]: n } : rest;
    });

  const place = useMutation({
    mutationFn: () => apiPost<Order>("/orders", { name: f.name, phone: f.phone, mode, slot: mode === "Pickup" ? f.slot : "", address: f.address,
      payment_method: f.pay, items: lines.map((p) => ({ product_id: p.id, qty: cart[p.id] })) }),
    onSuccess: (o) => { setDone(o); setCart({}); },
    onError: () => toast.error("Check your name, 10-digit phone and address, then try again."),
  });

  return (
    <div className="min-h-screen bg-[#f8f1ea] text-[#2b1a14]" style={brand}>
      <ShopHeader mode={mode} setMode={setMode} count={count} onBasket={() => { setDone(null); setOpen(true); }} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5">
        <section className="flex items-center justify-between gap-6 rounded-2xl bg-[#520e1e] px-8 py-14 text-[#fbeec0]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.25em] text-[#f2c26b]">MALLESHWARAM · BENGALURU · EST. 1987</p>
            <h1 className="mt-3 text-5xl font-bold text-white" style={serif}>Neelakantan’s <span className="text-[#f2c26b]">Prashanthi</span></h1>
            <p className="mt-1 text-2xl" style={serif}>Sweets &amp; Savouries</p>
            <p className="mt-4 opacity-90">Pure-ghee Mysore Pak, hand-twisted murukku and festive bakshanam, crafted fresh every morning in Malleshwaram since 1987. Order online for home delivery across Bengaluru or store pickup.</p>
            <div className="mt-6 flex items-center gap-4">
              <a href="#menu" className="rounded-lg bg-[#7a1a2b] px-4 py-2.5 font-semibold text-white">Order Now</a>
              <Link to="/track" className="font-semibold text-[#f2c26b]">Track Your Order</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-sm">
              {["FSSAI Certified", "Pure Cow Ghee", "Made Fresh Daily"].map((x) => <span key={x} className="rounded-full border border-[#fbeec066] px-3 py-1">{x}</span>)}
            </div>
          </div>
          <img src="/prashanthi-logo.png" alt="" className="hidden size-64 shrink-0 rounded-full border-4 border-[#a8793a] bg-white p-2 md:block" />
        </section>
        <div id="menu" className="mt-6 flex flex-wrap items-center gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-sm font-semibold ${cat === c ? "bg-[#7a1a2b] text-white" : "bg-[#f1e6d8]"}`}>
              {c} <span className="opacity-60">{c === "All" ? list.length : list.filter((p) => p.category === c).length}</span>
            </button>
          ))}
          <Input className="ml-auto w-full max-w-xs rounded-full bg-white sm:w-72" placeholder="Search mysore pak, murukku" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="h-4" />
        {products.isLoading && <p className="text-sm opacity-70">Loading the menu…</p>}
        {products.isError && <p className="text-sm opacity-70">The menu is unavailable right now. Please try again shortly or call +91 98458 28903.</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {shown.map((p) => (
            <div key={p.id} className="flex flex-col gap-1 rounded-xl border border-[#e8dbb8] bg-white p-4">
              <span className="text-xs opacity-60">{p.category}</span>
              <h3 className="font-semibold">{p.name}</h3>
              <div className="mt-1 flex items-center justify-between">
                <b className="text-lg text-[#7a1a2b]">{rupees(p.price)}</b>
                {cart[p.id] ? (
                  <span className="flex items-center gap-2">
                    <Button size="icon-sm" variant="outline" aria-label="Remove one" onClick={() => bump(p.id, -1)}>−</Button>
                    <b>{cart[p.id]}</b>
                    <Button size="icon-sm" variant="outline" aria-label="Add one" onClick={() => bump(p.id, 1)}>+</Button>
                  </span>
                ) : <Button size="sm" onClick={() => bump(p.id, 1)}>Add</Button>}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm opacity-70">Store pickup: 8th Cross, Malleshwaram, Bengaluru 560003 · Mon–Sat, 11 AM–2 PM and 4:30–8 PM · Free delivery over ₹1,500</p>
      </main>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto p-5">
          {done ? (
            <div className="mt-8 text-center">
              <h2 className="text-2xl" style={serif}>Thank you, {done.name}!</h2>
              <p className="mt-2">Your order <b>{done.code}</b> is placed.</p>
              <p className="mt-1 opacity-80">{done.mode === "Pickup" ? `Pickup at ${done.slot}, Malleshwaram store` : `Delivering to ${done.address}`}</p>
              <p className="mt-2 text-lg font-bold text-[#7a1a2b]">{rupees(done.total)} · {done.payment_method}</p>
              <Button className="mt-4" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
            <>
              <SheetHeader className="p-0"><SheetTitle style={serif}>Your basket</SheetTitle></SheetHeader>
              {lines.map((p) => <div key={p.id} className="flex justify-between text-sm"><span>{p.name} × {cart[p.id]}</span><b>{rupees(p.price * cart[p.id])}</b></div>)}
              <div className="flex justify-between text-sm opacity-70"><span>Delivery fee</span><span>{rupees(fee)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-[#7a1a2b]">{rupees(sub + fee)}</span></div>
              <div className="grid gap-2">
                <div className="flex gap-2">{(["Pickup", "Delivery"] as Mode[]).map((m) => <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>{m}</Button>)}</div>
                <Input placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <Input placeholder="Phone (10 digits)" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                {mode === "Pickup"
                  ? <select className={sel} aria-label="Pickup time" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>{slots().map((s) => <option key={s}>{s}</option>)}</select>
                  : <Input placeholder="Delivery address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />}
                <select className={sel} aria-label="Payment" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
                  <option>UPI</option><option>Card / Net banking</option><option>{mode === "Pickup" ? "Pay at store" : "Cash on delivery"}</option>
                </select>
                <Button className="h-11" disabled={place.isPending || !count} onClick={() => place.mutate()}>Place order · {rupees(sub + fee)}</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
