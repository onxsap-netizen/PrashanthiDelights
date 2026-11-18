import { Link } from "react-router-dom";
import { artKind, categoryList } from "@/lib/catalog";
import { usePageTitle, useProducts } from "@/lib/hooks";
import { SweetArt } from "@/components/store/Art";
import { ChevronRight } from "@/components/store/Icons";
import { SITE } from "@/config/site";

export default function Categories() {
  usePageTitle(`Categories · ${SITE.name}`, "Browse sweets, savouries and festive specials.");
  const { items, isLoading } = useProducts();
  const cats = categoryList(items);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 md:px-6">
      <h1 className="font-display text-[32px] font-semibold text-maroon-800 md:text-4xl">Categories</h1>
      <p className="mt-1 text-ink-soft">Everything we make, by kind.</p>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        <li><Link to="/menu" className="flex min-h-24 items-center gap-4 rounded-3xl bg-maroon-800 p-3 pr-5 text-white shadow-card active:scale-[.99]"><span className="kolam grid size-[72px] shrink-0 place-items-center rounded-2xl bg-maroon-900 font-display text-2xl text-gold-300">All</span><span className="flex-1"><b className="block font-display text-xl">Everything</b><span className="text-sm text-gold-100/80">{items.length} items</span></span><ChevronRight className="text-gold-300" /></Link></li>
        {isLoading && Array.from({ length: 3 }, (_, i) => <li key={i} className="skeleton h-24 rounded-3xl" />)}
        {cats.map((c, i) => {
          const sample = items.find((x) => x.category === c.name);
          return (
            <li key={c.name}><Link to={`/menu?cat=${encodeURIComponent(c.name)}`} className="flex min-h-24 items-center gap-4 rounded-3xl bg-white p-3 pr-5 shadow-card active:scale-[.99]">
              <span className="size-[72px] shrink-0 overflow-hidden rounded-2xl bg-beige">{c.sample ? <img src={c.sample} alt="" loading="lazy" className="size-full object-cover" /> : <SweetArt kind={artKind(sample?.base ?? "", c.name)} seed={i + 1} className="size-full" />}</span>
              <span className="flex-1"><b className="block font-display text-xl text-maroon-800">{c.name}</b><span className="text-sm text-ink-soft">{c.count} {c.count === 1 ? "item" : "items"}</span></span>
              <ChevronRight className="text-maroon-700" />
            </Link></li>
          );
        })}
      </ul>
    </div>
  );
}
