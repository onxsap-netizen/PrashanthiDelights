import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SITE } from "@/config/site";
import { useProducts } from "@/lib/hooks";
import { baseName } from "@/lib/catalog";
import { rupees } from "@/lib/shop";
import type { Mode } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { BackIcon, BagIcon, SearchIcon, StoreIcon, TruckIcon } from "./Icons";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-h-11 items-center gap-2.5" aria-label={`${SITE.name} home`}>
      <img src="/prashanthi-logo.png" alt="" width={44} height={42} className="size-11 shrink-0 rounded-full bg-white object-contain p-0.5 ring-2 ring-gold" />
      <span className="leading-none">
        <b className="block font-display text-[21px] font-semibold text-maroon-800 md:text-2xl">Prashanthi</b>
        {!compact && <span className="mt-0.5 block text-[11px] font-semibold text-gold-700">Sweets &amp; Savouries · Since {SITE.since}</span>}
      </span>
    </Link>
  );
}

export function CartButton() {
  const { count } = useStore();
  return (
    <Link to="/cart" aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`} className="relative grid size-11 place-items-center rounded-full bg-maroon-700 text-white shadow-sm active:scale-95">
      <BagIcon />
      {count > 0 && <span key={count} className="anim-pop absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-extrabold leading-5 text-maroon-950 ring-2 ring-cream">{count}</span>}
    </Link>
  );
}

function SearchBox() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { pathname } = useLocation();
  const [q, setQ] = useState(pathname === "/menu" ? sp.get("q") ?? "" : "");
  const [focus, setFocus] = useState(false);
  const { items } = useProducts();
  const box = useRef<HTMLFormElement>(null);
  useEffect(() => { if (pathname !== "/menu") setQ(""); }, [pathname]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setFocus(false); };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);
  const hits = useMemo(() => q.trim().length < 2 ? [] : items.filter((i) => i.base.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5), [items, q]);
  const go = () => { setFocus(false); nav(q.trim() ? `/menu?q=${encodeURIComponent(q.trim())}` : "/menu"); };
  return (
    <form ref={box} role="search" onSubmit={(e) => { e.preventDefault(); go(); (document.activeElement as HTMLElement | null)?.blur(); }} className="relative">
      <label className="sr-only" htmlFor="site-search">Search sweets and savouries</label>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-maroon-700" width={20} height={20} />
      <input id="site-search" type="search" enterKeyHint="search" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setFocus(true); }} onFocus={() => setFocus(true)}
        placeholder="Search Mysore Pak, murukku, laddu…" className="h-12 w-full rounded-full border border-beige-200 bg-white pl-11 pr-4 text-base text-ink shadow-sm outline-none placeholder:text-ink-soft/70 focus:border-maroon-700" />
      {focus && hits.length > 0 && (
        <ul className="absolute inset-x-0 top-14 z-40 overflow-hidden rounded-3xl bg-white py-2 shadow-lift">
          {hits.map((h) => (
            <li key={h.key}><Link to={`/product/${h.primary.id}`} onClick={() => setFocus(false)} className="flex min-h-12 items-center justify-between gap-3 px-5 text-[15px] active:bg-maroon-50"><span>{h.base}</span><span className="text-xs text-ink-soft">{h.category}</span></Link></li>
          ))}
          <li><button type="submit" className="min-h-12 w-full px-5 text-left text-sm font-bold text-maroon-700">See all results for “{q.trim()}”</button></li>
        </ul>
      )}
    </form>
  );
}

export function ModeSwitch({ className = "" }: { className?: string }) {
  const { prefs, setPrefs } = useStore();
  const opt: [Mode, string, typeof TruckIcon][] = [["Delivery", "Delivery", TruckIcon], ["Pickup", "Pickup", StoreIcon]];
  return (
    <div role="radiogroup" aria-label="How would you like to receive your order" className={`inline-flex rounded-full bg-beige p-1 ${className}`}>
      {opt.map(([m, l, Ic]) => (
        <button key={m} type="button" role="radio" aria-checked={prefs.mode === m} onClick={() => setPrefs({ mode: m })}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${prefs.mode === m ? "bg-maroon-700 text-white shadow" : "text-maroon-800"}`}><Ic width={17} height={17} />{l}</button>
      ))}
    </div>
  );
}

const FOCUS_TITLES: [RegExp, string][] = [[/^\/cart/, "Your basket"], [/^\/checkout/, "Checkout"], [/^\/order\//, "Order placed"], [/^\/product\//, ""]];

export function Header({ focus }: { focus: boolean }) {
  const nav = useNavigate();
  const ref = useRef<HTMLElement>(null);
  // publish the header height so sticky sub-bars (category chips) sit right under it
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => document.documentElement.style.setProperty("--hdr", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, [focus]);
  const { pathname } = useLocation();
  const { count } = useStore();
  if (focus) {
    const title = FOCUS_TITLES.find(([r]) => r.test(pathname))?.[1] ?? "";
    return (
      <header ref={ref} className="sticky top-0 z-30 border-b border-beige-200/70 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 md:px-6">
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))} aria-label="Go back" className="grid size-11 place-items-center rounded-full text-maroon-800 active:bg-beige"><BackIcon /></button>
          {title ? <h1 className="flex-1 truncate font-display text-xl font-semibold text-maroon-800">{title}</h1> : <span className="flex-1" />}
          <div className="hidden md:block"><Logo compact /></div>
          {!/^\/(cart|checkout|order)/.test(pathname) || count > 0 ? <CartButton /> : null}
        </div>
      </header>
    );
  }
  return (
    <header ref={ref} className="sticky top-0 z-30 bg-cream/95 shadow-[0_1px_0_var(--color-beige-200)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2.5 px-4 pb-3 pt-2.5 md:flex-nowrap md:px-6 md:py-3">
        <Logo />
        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
          {([["/menu", "Shop all"], ["/categories", "Categories"], ["/track", "Track order"], ["/account", "Account"]] as const).map(([to, l]) => (
            <Link key={to} to={to} className={`rounded-full px-3.5 py-2 text-[15px] font-semibold ${pathname === to ? "bg-beige text-maroon-800" : "text-ink hover:bg-beige/70"}`}>{l}</Link>
          ))}
        </nav>
        <div className="order-3 w-full md:order-none md:ml-auto md:max-w-sm md:flex-1"><SearchBox /></div>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <span className="hidden text-sm font-semibold text-maroon-800 lg:block">{count > 0 && <CartTotal />}</span>
          <CartButton />
        </div>
      </div>
    </header>
  );
}

function CartTotal() {
  const { qty } = useStore();
  const { byId } = useProducts();
  const total = Object.entries(qty).reduce((s, [id, n]) => s + (byId.get(id)?.price ?? 0) * n, 0);
  return <>{rupees(total)}</>;
}

export { baseName };
