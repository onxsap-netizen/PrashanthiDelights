import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import type { Order } from "@/lib/shop";

/** The customer messages, in the order a customer would receive them. `when` explains what triggers each one. */
export const WA_EVENTS: { id: string; label: string; when: string }[] = [
  { id: "order_confirmed", label: "Thanks / order confirmed", when: "Sent automatically when the order is placed (online orders: once paid)" },
  { id: "payment_received", label: "Payment received", when: "Sent when you mark a UPI order Paid" },
  { id: "order_ready", label: "Ready / packed", when: "Sent when status becomes Fulfilled" },
  { id: "order_dispatched", label: "Out for delivery", when: "Sent when status becomes Out for delivery" },
  { id: "order_delivered", label: "Delivered / collected", when: "Sent when status becomes Delivered" },
  { id: "order_cancelled", label: "Cancelled", when: "Sent when the order is cancelled" },
];
const CHIP: Record<string, string> = { sent: "bg-green-100 text-green-800", failed: "bg-red-100 text-red-700", skipped: "bg-gray-100 text-gray-600", sending: "bg-yellow-100 text-yellow-900" };
const CHIP_TXT: Record<string, string> = { sent: "sent", failed: "failed", skipped: "not sent", sending: "sending" };

/** Per-order WhatsApp panel: what was sent, plus "send now" (API) and "open in WhatsApp" (works without the API). */
export function WaCell({ order }: { order: Order }) {
  const qc = useQueryClient();
  const n = order.notified ?? {};
  const sent = Object.values(n).filter((v) => v === "sent").length;
  const bad = Object.values(n).some((v) => v === "failed");
  const [busy, setBusy] = useState("");

  const send = useMutation({
    mutationFn: (event: string) => apiPost<{ status: string }>(`/admin/orders/${order.id}/notify`, { event }),
    onSuccess: (r) => { r.status === "sent" ? toast.success("WhatsApp message sent") : toast.error(r.status === "skipped" ? "WhatsApp isn’t connected yet. Use “Open in WhatsApp” instead." : "Couldn’t send. Check the setup on the Summary tab."); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: () => toast.error("Couldn’t send that message"),
  });
  const open = async (event: string) => {
    const w = window.open("", "_blank");   // opened synchronously so pop-up blockers allow it
    setBusy(event);
    try {
      const r = await apiGet<{ link: string }>(`/admin/orders/${order.id}/whatsapp?event=${event}`);
      if (!r.link) throw new Error("no number");
      if (w) w.location.href = r.link;
    } catch { w?.close(); toast.error("This order has no valid WhatsApp number"); }
    setBusy("");
  };

  return (
    <details className="text-xs">
      <summary className="cursor-pointer select-none whitespace-nowrap font-semibold text-[#7a231c]">
        WhatsApp {sent > 0 && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-green-800">{sent} sent</span>} {bad && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-700">issue</span>}
      </summary>
      <ul className="mt-2 w-72 space-y-2">
        {WA_EVENTS.map((e) => (
          <li key={e.id} className="rounded-lg border border-[#eadfce] p-2">
            <div className="flex items-center justify-between gap-2"><b>{e.label}</b>{n[e.id] && <span className={`rounded-full px-2 py-0.5 ${CHIP[n[e.id]] ?? CHIP.failed}`}>{CHIP_TXT[n[e.id]] ?? n[e.id]}</span>}</div>
            <div className="mt-0.5 opacity-60">{e.when}</div>
            <div className="mt-1.5 flex gap-1.5">
              <button className="rounded-full border border-[#d9c9ad] px-2.5 py-1 font-semibold disabled:opacity-50" disabled={send.isPending} onClick={() => send.mutate(e.id)}>{n[e.id] === "sent" ? "Send again" : "Send now"}</button>
              <button className="rounded-full border border-[#d9c9ad] px-2.5 py-1 font-semibold disabled:opacity-50" disabled={busy === e.id} onClick={() => open(e.id)}>Open in WhatsApp</button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
