import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ShopHeader, { brand, serif } from "@/components/ShopHeader";
import { apiGet } from "@/lib/api";
import { rupees } from "@/lib/shop";
import type { Order } from "@/lib/shop";

const STEPS = ["Pending", "Fulfilled", "Out for delivery", "Delivered"];

export default function Track() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const res = useQuery({ queryKey: ["track", term], enabled: term.length >= 6, queryFn: () => apiGet<Order[]>(`/orders/track?q=${encodeURIComponent(term)}`) });
  return (
    <div className="min-h-screen bg-[#f8f1ea] text-[#2b1a14]" style={brand}>
      <ShopHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-3 text-3xl" style={serif}>Track your order</h1>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(input.trim()); }}>
          <Input className="bg-white" placeholder="Order ID (PRS-1234) or phone number" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit">Find order</Button>
        </form>
        {res.isError && <p className="mt-4 text-sm">Tracking is unavailable right now. Call +91 98458 28903.</p>}
        {!res.isError && res.data?.length === 0 && <p className="mt-4 text-sm">No order matches that ID or phone number.</p>}
        {!res.isError && res.data?.map((o) => (
          <div key={o.id} className="mt-4 rounded-xl border border-[#e8dbb8] bg-white p-4">
            <div className="flex items-center justify-between"><b>{o.code}</b><Badge variant={o.status === "Cancelled" ? "destructive" : "secondary"}>{o.status}</Badge></div>
            <div className="my-3 flex gap-1.5">{STEPS.map((s, i) => <i key={s} className={`h-1.5 flex-1 rounded ${i <= STEPS.indexOf(o.status) ? "bg-green-700" : "bg-[#e8dbb8]"}`} />)}</div>
            <p className="text-sm">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
            <p className="mt-2 flex justify-between text-sm"><span>{o.mode}{o.slot ? ` · ${o.slot}` : ""}</span><b>{rupees(o.total)} · {o.paid ? "Paid" : "Payment pending"}</b></p>
          </div>
        ))}
      </main>
    </div>
  );
}
