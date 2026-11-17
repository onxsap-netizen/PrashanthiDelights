import { toast } from "sonner";
import type { Product } from "@/lib/shop";
import { MAX_QTY, useStore } from "@/lib/store";
import { MinusIcon, PlusIcon } from "./Icons";

export function Stepper({ n, onChange, label, size = "md", min = 0 }: { n: number; onChange: (n: number) => void; label: string; size?: "md" | "lg"; min?: number }) {
  const b = size === "lg" ? "size-12" : "size-11";
  return (
    <div className="inline-flex items-center rounded-full border border-beige-200 bg-white" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" aria-label={`Remove one ${label}`} onClick={() => onChange(Math.max(min, n - 1))} className={`${b} grid place-items-center rounded-full text-maroon-700 active:bg-maroon-50`}><MinusIcon width={18} height={18} /></button>
      <output aria-live="polite" className="min-w-8 text-center text-base font-bold tabular-nums">{n}</output>
      <button type="button" aria-label={`Add one ${label}`} disabled={n >= MAX_QTY} onClick={() => onChange(n + 1)} className={`${b} grid place-items-center rounded-full text-maroon-700 active:bg-maroon-50 disabled:opacity-40`}><PlusIcon width={18} height={18} /></button>
    </div>
  );
}

/** "Add" turns into a stepper once the item is in the basket. */
export function AddControl({ product, label, className = "" }: { product: Product; label?: string; className?: string }) {
  const { qty, add, setQty } = useStore();
  const n = qty[product.id] ?? 0;
  const name = label ?? product.name;
  if (!product.available) return <button disabled className={`h-11 w-full rounded-full bg-beige text-sm font-semibold text-ink-soft ${className}`}>Unavailable</button>;
  if (!n) {
    return (
      <button type="button" onClick={() => { add(product.id); }} aria-label={`Add ${name} to basket`}
        className={`h-11 w-full rounded-full bg-maroon-700 text-[15px] font-bold text-white shadow-sm transition active:scale-[.97] active:bg-maroon-800 ${className}`}>
        Add
      </button>
    );
  }
  return (
    <div className={`flex h-11 w-full items-center justify-between rounded-full bg-maroon-700 px-1 text-white ${className}`} role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" aria-label={`Remove one ${name}`} onClick={() => setQty(product.id, n - 1)} className="grid size-11 place-items-center rounded-full active:bg-maroon-800"><MinusIcon width={18} height={18} /></button>
      <output aria-live="polite" className="font-bold tabular-nums">{n}</output>
      <button type="button" aria-label={`Add one more ${name}`} disabled={n >= MAX_QTY} onClick={() => { if (n >= MAX_QTY) toast.info("That’s the most we can take for one item online."); else setQty(product.id, n + 1); }} className="grid size-11 place-items-center rounded-full active:bg-maroon-800"><PlusIcon width={18} height={18} /></button>
    </div>
  );
}
