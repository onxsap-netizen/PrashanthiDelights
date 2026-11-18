import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SITE } from "@/config/site";
import { categoryList, fromPrice, itemTags } from "@/lib/catalog";
import { usePageTitle, useProducts } from "@/lib/hooks";
import { ProductCard, ProductSkeletons } from "@/components/store/ProductCard";
import { SearchIcon } from "@/components/store/Icons";
import { SweetArt } from "@/components/store/Art";
import { artKind } from "@/lib/catalog";

const SORTS = { rec: "Recommended", low: "Price: low to high", high: "Price: high to low", az: "Name: A to Z" } as const;
type Sort = keyof typeof SORTS;

export default function Menu() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("cat") ?? "All";
  const q = (sp.get("q") ?? "").trim();
  const sort = (sp.get("sort") as Sort) in SORTS ? (sp.get("sort") as Sort) : "rec";
  const { items, isLoading, isError, refetch } = useProducts();
  const cats = useMemo(() => categoryList(items), [items]);
  usePageTitle(`${cat === "All" ? "Shop sweets & savouries" : cat} · ${SITE.name}`, `Order ${cat === "All" ? "sweets and savouries" : cat} online from ${SITE.name}, ${SITE.area}.`);

  const shown = useMemo(() => {
    let l = items.filter((i) => (cat === "All" || i.category === cat) && (!q || `${i.base} ${i.category}`.toLowerCase().includes(q.toLowerCase())));
    if (sort === "low") l = [...l].sort((a, b) => fromPrice(a) - fromPrice(b));
    else if (sort === "high") l = [...l].sort((a, b) => fromPrice(b) - fromPrice(a));
    else if (sort === "az") l = [...l].sort((a, b) => a.base.localeCompare(b.base));
    else l = [...l].sort((a, b) => itemTags(b).length - itemTags(a).length); // owner-tagged items first (stable otherwise)
    return l;
  }, [items, cat, q, sort]);

  const chips = useRef<HTMLDivElement>(null);
  // keep the selected category chip visible (it may be off-screen on a phone)
  useEffect(() => { chips.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" }); }, [cat, cats.length]);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v && v !== "All" && v !== "rec") n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-[32px] font-semibold leading-tight text-maroon-800 md:text-4xl">{q ? <>Results for “{q}”</> : cat === "All" ? "All sweets & savouries" : cat}</h1>
        <p className="text-sm text-ink-soft" aria-live="polite">{isLoading ? "Loading…" : `${shown.length} ${shown.length === 1 ? "item" : "items"}`}</p>
      </div>
      <div className="sticky top-[var(--hdr,0px)] z-20 -mx-4 mt-4 bg-cream/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0">
        <div ref={chips} className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Categories">
          {["All", ...cats.map((c) => c.name)].map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => set("cat", c)}
              className={`min-h-11 shrink-0 rounded-full px-5 text-[15px] font-bold transition ${cat === c ? "bg-maroon-700 text-white shadow" : "bg-white text-maroon-800 shadow-card"}`}>
              {c}{c !== "All" && <span className="ml-1.5 text-xs opacity-70">{cats.find((x) => x.name === c)?.count}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <label htmlFor="sort" className="text-ink-soft">Sort</label>
        <select id="sort" value={sort} onChange={(e) => set("sort", e.target.value)} className="h-11 rounded-full border border-beige-200 bg-white px-4 text-base font-semibold text-maroon-800">
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {isLoading && <ProductSkeletons n={8} />}
        {shown.map((i, n) => <ProductCard key={i.key} item={i} eager={n < 4} />)}
      </div>

      {isError && (
        <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-white p-6 text-center shadow-card">
          <h2 className="font-display text-2xl text-maroon-800">The menu didn’t load</h2>
          <p className="mt-2 text-ink-soft">Check your connection, or call {SITE.phoneDisplay} to order.</p>
          <button onClick={() => refetch()} className="mt-4 h-12 rounded-full bg-maroon-700 px-8 font-bold text-white">Try again</button>
        </div>
      )}
      {!isLoading && !isError && shown.length === 0 && (
        <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-3 size-24 overflow-hidden rounded-full"><SweetArt kind={artKind("", cat)} /></div>
          <SearchIcon className="mx-auto text-maroon-700" />
          <h2 className="mt-2 font-display text-2xl text-maroon-800">Nothing matches that</h2>
          <p className="mt-1 text-ink-soft">Try a different word, or browse everything we make.</p>
          <Link to="/menu" className="mt-4 inline-grid h-12 place-items-center rounded-full bg-maroon-700 px-8 font-bold text-white">See all items</Link>
        </div>
      )}
    </div>
  );
}
