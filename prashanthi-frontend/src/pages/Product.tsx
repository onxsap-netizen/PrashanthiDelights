import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageTitle, useProducts } from "@/lib/hooks";
import { discountPct, rupees } from "@/lib/shop";
import { SITE } from "@/config/site";
import { useStore } from "@/lib/store";
import { Stepper } from "@/components/store/AddControl";
import { ClockIcon, StoreIcon, TruckIcon } from "@/components/store/Icons";
import { Photo, ProductCard } from "@/components/store/ProductCard";
import { Rail, RailCell, SectionHead } from "@/components/store/Rail";
import { SizePicker } from "@/components/store/SizePicker";

export default function Product() {
  const { id = "" } = useParams();
  const { items, isLoading, isError, refetch } = useProducts();
  const { qty, add, setQty } = useStore();
  const item = useMemo(() => items.find((i) => i.variants.some((v) => v.id === id)), [items, id]);
  const [vid, setVid] = useState(id);
  useEffect(() => setVid(id), [id]);
  const v = item?.variants.find((x) => x.id === vid) ?? item?.primary;
  usePageTitle(item ? `${item.base}${v?.pack ? ` ${v.pack}` : ""} · ${SITE.name}` : `Product · ${SITE.name}`, v?.description || (item ? `Order ${item.base} online from ${SITE.name}, ${SITE.area}.` : undefined));
  const [n, setN] = useState(1);
  useEffect(() => setN(1), [vid]);

  const related = useMemo(() => item ? items.filter((i) => i.key !== item.key && i.category === item.category).slice(0, 8) : [], [items, item]);
  const more = useMemo(() => item && related.length < 4 ? items.filter((i) => i.key !== item.key && i.category !== item.category).slice(0, 8 - related.length) : [], [items, item, related.length]);

  if (isLoading) return <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-4 md:grid-cols-2"><div className="skeleton aspect-square rounded-3xl" /><div className="space-y-3"><div className="skeleton h-9 w-3/4 rounded" /><div className="skeleton h-7 w-1/3 rounded" /><div className="skeleton h-24 rounded" /></div></div>;
  if (isError) return <div className="mx-auto max-w-sm px-4 pt-10 text-center"><h2 className="font-display text-2xl text-maroon-800">This item didn’t load</h2><button onClick={() => refetch()} className="mt-4 h-12 rounded-full bg-maroon-700 px-8 font-bold text-white">Try again</button></div>;
  if (!item || !v) return (
    <div className="mx-auto max-w-sm px-4 pt-12 text-center">
      <h2 className="font-display text-3xl text-maroon-800">That item isn’t available</h2>
      <p className="mt-2 text-ink-soft">It may have sold out or been taken off the menu.</p>
      <Link to="/menu" className="mt-5 inline-grid h-12 place-items-center rounded-full bg-maroon-700 px-8 font-bold text-white">Browse the menu</Link>
    </div>
  );
  const off = discountPct(v);
  const inCart = qty[v.id] ?? 0;
  const addNow = () => { add(v.id, n); setN(1); };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-3 md:px-6 md:pt-6">
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="arch relative mx-auto aspect-[1/.9] max-w-md overflow-hidden bg-beige ring-4 ring-gold/50 md:aspect-[4/4.4] md:max-w-none">
            <Photo product={item.variants.find((x) => x.image) ?? v} name={item.base} category={item.category} eager />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <Link to={`/menu?cat=${encodeURIComponent(item.category)}`} className="inline-flex min-h-8 items-center text-sm font-semibold text-gold-700 underline-offset-4 hover:underline">{item.category}</Link>
            <h1 className="font-display text-[34px] font-semibold leading-[1.1] text-maroon-800 md:text-[42px]">{item.base}</h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[30px] font-extrabold tabular-nums text-maroon-800">{rupees(v.price)}</span>
              {off > 0 && <><s className="text-lg text-ink-soft tabular-nums">{rupees(v.original_price as number)}</s><span className="rounded-full bg-gold px-3 py-1 text-sm font-extrabold text-maroon-950">{off}% off</span></>}
              {v.pack && item.variants.length === 1 && <span className="rounded-full bg-beige px-3 py-1 text-sm font-semibold">{v.pack}</span>}
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-leaf"><span className="size-2 rounded-full bg-leaf" />Available to order today</p>
          </div>
          {item.variants.length > 1 && <SizePicker variants={item.variants} value={v.id} onChange={setVid} />}
          {v.description && <section><h3 className="mb-1 font-display text-xl text-maroon-800">About this sweet</h3><p className="max-w-prose text-base leading-relaxed text-ink-soft">{v.description}</p></section>}
          {v.ingredients && <section><h3 className="mb-1 font-display text-xl text-maroon-800">Ingredients</h3><p className="max-w-prose text-base leading-relaxed text-ink-soft">{v.ingredients}</p></section>}

          <section aria-label="Delivery information" className="rounded-3xl bg-white p-4 shadow-card">
            <h3 className="mb-3 font-display text-xl text-maroon-800">Delivery &amp; pickup</h3>
            <ul className="space-y-3 text-[15px]">
              <li className="flex gap-3"><TruckIcon className="mt-0.5 shrink-0 text-maroon-700" /><span>Home delivery across Bengaluru. <b>{rupees(SITE.deliveryFee)}</b>, free above <b>{rupees(SITE.freeDeliveryAbove)}</b>.</span></li>
              <li className="flex gap-3"><StoreIcon className="mt-0.5 shrink-0 text-maroon-700" /><span>Free store pickup at {SITE.addressLines[0]}.</span></li>
              <li className="flex gap-3"><ClockIcon className="mt-0.5 shrink-0 text-maroon-700" /><span>{SITE.hours}</span></li>
            </ul>
          </section>

          <div className="hidden items-center gap-4 md:flex">
            <Stepper n={n} onChange={setN} min={1} label={item.base} size="lg" />
            <button onClick={addNow} className="h-14 flex-1 rounded-full bg-maroon-700 text-lg font-extrabold text-white shadow-lift active:scale-[.98]">Add to basket · {rupees(v.price * n)}</button>
          </div>
          {inCart > 0 && <p className="hidden items-center gap-3 text-sm md:flex"><b>{inCart} in your basket</b><button onClick={() => setQty(v.id, 0)} className="font-semibold text-maroon-700 underline underline-offset-4">Remove</button><Link to="/cart" className="font-bold text-maroon-700 underline underline-offset-4">View basket</Link></p>}
        </div>
      </div>

      {(related.length > 0 || more.length > 0) && (
        <section className="mt-14 md:mt-16">
          <SectionHead title={related.length ? "You may also like" : "More to try"} />
          <Rail>{[...related, ...more].map((i) => <RailCell key={i.key}><ProductCard item={i} /></RailCell>)}</Rail>
        </section>
      )}

      {/* phones: a sticky buy bar replaces the bottom nav on product pages */}
      <div className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-cream-50/97 px-3 pt-3 shadow-[0_-10px_30px_-14px_rgb(67_15_12/.35)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3 pb-3">
          <Stepper n={n} onChange={setN} min={1} label={item.base} />
          <button onClick={addNow} className="h-12 flex-1 rounded-full bg-maroon-700 text-[16px] font-extrabold text-white active:scale-[.98]">Add · {rupees(v.price * n)}</button>
        </div>
        {inCart > 0 && <Link to="/cart" className="-mt-1 mb-3 block text-center text-sm font-bold text-maroon-700">{inCart} in basket · View basket</Link>}
      </div>
    </div>
  );
}
