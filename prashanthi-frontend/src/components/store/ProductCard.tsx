import { useState } from "react";
import { Link } from "react-router-dom";
import { artKind, fromPrice, hasTag, itemTags, slug } from "@/lib/catalog";
import type { Item } from "@/lib/catalog";
import { discountPct, rupees } from "@/lib/shop";
import type { Product } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { AddControl } from "./AddControl";
import { SweetArt } from "./Art";
import { EyeIcon } from "./Icons";

export function Photo({ product, name, category, eager = false, className = "" }: { product?: { image?: string }; name: string; category: string; eager?: boolean; className?: string }) {
  const [bad, setBad] = useState(false);
  const seed = name.length + category.length;
  if (!product?.image || bad) return <SweetArt kind={artKind(name, category)} seed={seed} className={`size-full ${className}`} />;
  return <img src={product.image} alt={name} width={480} height={480} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setBad(true)} className={`size-full object-cover ${className}`} />;
}

export function ProductCard({ item, eager = false }: { item: Item; eager?: boolean }) {
  const { openQuick } = useStore();
  const p = item.primary;
  const multi = item.variants.length > 1;
  const off = discountPct(p);
  const badge = hasTag(item, "Best Seller") ? "Best seller" : hasTag(item, "New") ? "New" : hasTag(item, "Gift") ? "Gift" : hasTag(item, "Festive") ? "Festive" : "";
  const to = `/product/${p.id}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-white shadow-card">
      <div className="relative aspect-square overflow-hidden bg-beige">
        <Link to={to} aria-label={`View ${item.base}`} className="block size-full"><Photo product={item.variants.find((v) => v.image) ?? p} name={item.base} category={item.category} eager={eager} /></Link>
        {badge && <span className="absolute left-2.5 top-2.5 rounded-full bg-maroon-800 px-2.5 py-1 text-[11px] font-bold text-gold-100 shadow">{badge}</span>}
        {off > 0 && !multi && <span className="absolute right-2.5 top-2.5 rounded-full bg-gold px-2.5 py-1 text-[11px] font-extrabold text-maroon-950 shadow">{off}% off</span>}
        <button type="button" onClick={() => openQuick(item)} aria-label={`Quick view ${item.base}`}
          className="absolute bottom-2.5 right-2.5 grid size-10 place-items-center rounded-full bg-white/95 text-maroon-700 shadow-card active:scale-95"><EyeIcon width={19} height={19} /></button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 pt-3">
        <Link to={to} className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{item.base}</Link>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          {!multi && typeof p.stock === "number" && p.stock > 0 && <span className="rounded-full bg-gold-100 px-2 py-0.5 font-bold text-maroon-800">Only {p.stock} left</span>}
          {multi ? <span>{item.variants.length} sizes</span> : p.pack ? <span className="rounded-full bg-beige px-2 py-0.5 font-medium">{p.pack}</span> : <span>{item.category}</span>}
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-extrabold tabular-nums text-maroon-800">{multi ? <><span className="mr-1 text-xs font-semibold text-ink-soft">from</span>{rupees(fromPrice(item))}</> : rupees(p.price)}</span>
          {!multi && off > 0 && <s className="text-sm text-ink-soft tabular-nums">{rupees(p.original_price as number)}</s>}
        </div>
        {multi
          ? <button type="button" onClick={() => openQuick(item)} className="h-11 w-full rounded-full border-2 border-maroon-700 text-[15px] font-bold text-maroon-700 active:bg-maroon-50">Choose size</button>
          : <AddControl product={p as Product} label={item.base} />}
      </div>
    </article>
  );
}

export function ProductSkeletons({ n = 4 }: { n?: number }) {
  return <>{Array.from({ length: n }, (_, i) => (
    <div key={i} className="overflow-hidden rounded-[22px] bg-white shadow-card"><div className="skeleton aspect-square" /><div className="space-y-2 p-3"><div className="skeleton h-4 w-4/5 rounded" /><div className="skeleton h-4 w-1/3 rounded" /><div className="skeleton h-11 rounded-full" /></div></div>
  ))}</>;
}

export { itemTags, slug };
