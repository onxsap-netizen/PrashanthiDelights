import { trackSteps } from "@/lib/shop";
import type { Order } from "@/lib/shop";
import { CheckIcon } from "./Icons";

export function Timeline({ order }: { order: Order }) {
  if (order.status === "Cancelled") return <p role="status" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-800">This order was cancelled. Please call us if you have questions.</p>;
  const steps = trackSteps(order.mode);
  let at = steps.findIndex((s) => s.status === order.status);
  if (at < 0) at = order.status === "Out for delivery" ? steps.findIndex((s) => s.status === "Fulfilled") : 0;
  return (
    <ol className="relative" aria-label="Order progress">
      {steps.map((s, i) => {
        const done = i < at || (i === at && order.status === "Delivered"), cur = i === at && !done;
        return (
          <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={cur ? "step" : undefined}>
            {i < steps.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < at ? "bg-leaf" : "bg-beige-200"}`} aria-hidden />}
            <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${done ? "border-leaf bg-leaf text-white" : cur ? "border-maroon-700 bg-maroon-700 text-white" : "border-beige-200 bg-white text-transparent"}`}>
              {done ? <CheckIcon width={16} height={16} strokeWidth={3} /> : cur ? <span className="size-2 rounded-full bg-gold-300" /> : <CheckIcon width={16} height={16} />}
            </span>
            <div className="pt-0.5 leading-snug"><b className={`block ${i > at ? "text-ink-soft" : "text-ink"}`}>{s.label}</b>{(cur || done) && <span className="text-sm text-ink-soft">{s.hint}</span>}</div>
          </li>
        );
      })}
    </ol>
  );
}
