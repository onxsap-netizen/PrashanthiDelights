import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Item } from "@/lib/catalog";
import type { Mode, Order } from "@/lib/shop";

const CART_KEY = "prs-cart-v1";
const PREFS_KEY = "prs-prefs-v1";
const ORDERS_KEY = "prs-orders-v1";
const MAX_QTY = 50; // backend rejects more than 50 of one item

const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: cart still works for this visit */ } };

export interface Prefs { mode: Mode; name: string; phone: string; address: string }
export interface SavedOrder { code: string; phone: string; total: number; at: string }

interface Store {
  qty: Record<string, number>;
  count: number;
  add: (id: string, n?: number) => void;
  setQty: (id: string, n: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  orders: SavedOrder[];
  rememberOrder: (o: Order) => void;
  quick: Item | null;
  openQuick: (i: Item | null) => void;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [qty, setQ] = useState<Record<string, number>>(() => {
    const raw = read<Record<string, number>>(CART_KEY, {});
    return Object.fromEntries(Object.entries(raw).filter(([, n]) => Number.isInteger(n) && n > 0).map(([k, n]) => [k, Math.min(n, MAX_QTY)]));
  });
  const [prefs, setP] = useState<Prefs>(() => ({ mode: "Delivery", name: "", phone: "", address: "", ...read<Partial<Prefs>>(PREFS_KEY, {}) }));
  const [orders, setOrders] = useState<SavedOrder[]>(() => read<SavedOrder[]>(ORDERS_KEY, []));
  const [quick, openQuick] = useState<Item | null>(null);

  useEffect(() => write(CART_KEY, qty), [qty]);
  useEffect(() => write(PREFS_KEY, prefs), [prefs]);
  useEffect(() => write(ORDERS_KEY, orders), [orders]);
  // keep several open tabs in sync
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === CART_KEY) setQ(read(CART_KEY, {})); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const setQty = useCallback((id: string, n: number) => setQ((c) => {
    const { [id]: _drop, ...rest } = c; void _drop;
    return n > 0 ? { ...rest, [id]: Math.min(n, MAX_QTY) } : rest;
  }), []);
  const add = useCallback((id: string, n = 1) => setQ((c) => ({ ...c, [id]: Math.min((c[id] ?? 0) + n, MAX_QTY) })), []);
  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => setQ({}), []);
  const setPrefs = useCallback((p: Partial<Prefs>) => setP((x) => ({ ...x, ...p })), []);
  const rememberOrder = useCallback((o: Order) => setOrders((l) => [{ code: o.code, phone: o.phone, total: o.total, at: o.created_at }, ...l.filter((x) => x.code !== o.code)].slice(0, 8)), []);

  const value = useMemo<Store>(() => ({
    qty, count: Object.values(qty).reduce((a, b) => a + b, 0), add, setQty, remove, clear, prefs, setPrefs, orders, rememberOrder, quick, openQuick,
  }), [qty, add, setQty, remove, clear, prefs, setPrefs, orders, rememberOrder, quick]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
export { MAX_QTY };
