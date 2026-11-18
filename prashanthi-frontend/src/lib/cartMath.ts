import { useMemo } from "react";
import { useProducts } from "@/lib/hooks";
import { deliveryFee } from "@/lib/shop";
import type { Product } from "@/lib/shop";
import { useStore } from "@/lib/store";

export interface Line { id: string; qty: number; product?: Product }

/** Joins the saved basket (ids + quantities) with live product data from the backend. */
export function useCartLines() {
  const { qty, prefs } = useStore();
  const { byId, isLoading, isError } = useProducts();
  return useMemo(() => {
    const lines: Line[] = Object.entries(qty).map(([id, n]) => ({ id, qty: n, product: byId.get(id) }));
    const ready = !isLoading && !isError;
    const missing = ready ? lines.filter((l) => !l.product) : [];
    const valid = lines.filter((l) => l.product);
    const subtotal = valid.reduce((s, l) => s + (l.product as Product).price * l.qty, 0);
    const fee = deliveryFee(prefs.mode, subtotal);
    return { lines, valid, missing, subtotal, fee, total: subtotal + fee, ready, isLoading, isError, mode: prefs.mode };
  }, [qty, byId, prefs.mode, isLoading, isError]);
}
