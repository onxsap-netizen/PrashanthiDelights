import { Link } from "react-router-dom";
import { SITE } from "@/config/site";
import { buildSections, categoryList, artKind } from "@/lib/catalog";
import type { Item } from "@/lib/catalog";
import { useProducts, usePageTitle } from "@/lib/hooks";
import { rupees } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { Mandala, SweetArt, Thali } from "@/components/store/Art";
import { ClockIcon, InstagramIcon, LeafIcon, PhoneIcon, PinIcon, ShieldIcon, StarIcon, TruckIcon, FlameIcon, StoreIcon, WhatsAppIcon } from "@/components/store/Icons";
import { Photo, ProductCard, ProductSkeletons } from "@/components/store/ProductCard";
import { Rail, RailCell, SectionHead } from "@/components/store/Rail";

const catHref = (c: string) => `/menu?cat=${encodeURIComponent(c)}`;
const cap = (xs: Item[], n: number) => xs.slice(0, n);

function ItemRail({ items, dark = false }: { items: Item[]; dark?: boolean }) {
  return <Rail dark={dark}>{items.map((i, n) => <RailCell key={i.key}><ProductCard item={i} eager={n < 2} /></RailCell>)}</Rail>;
}

function Hero({ items }: { items: Item[] }) {
  const photos = items.filter((i) => i.image).slice(0, 3);
  return (
    <section className="relative overflow-hidden bg-maroon-800 text-white" aria-labelledby="hero-h">
      <div className="kolam pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <Mandala className="pointer-events-none absolute -left-24 top-10 size-80 text-gold/10" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-2 px-5 pb-10 pt-8 md:grid-cols-[1.05fr_1fr] md:gap-10 md:px-6 md:pb-16 md:pt-14">
        <div className="anim-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3.5 py-1.5 text-[13px] font-semibold text-gold-100"><span className="size-1.5 rounded-full bg-gold-300" />Fresh from our {SITE.area} kitchen</p>
          <h1 id="hero-h" className="mt-4 font-display text-[40px] font-semibold leading-[1.05] tracking-tight md:text-[60px]">
            Sweets made the way your grandmother would approve of.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gold-100/90 md:text-lg">Pure-ghee Mysore Pak, hand-twisted murukku and festive bakshanam, made fresh every morning since {SITE.since}. Delivered across Bengaluru or ready for pickup.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/menu" className="inline-flex h-14 items-center rounded-full bg-gold px-8 text-[17px] font-extrabold text-maroon-950 shadow-lift active:scale-[.97]">Order now</Link>
            <Link to="/track" className="inline-flex h-14 items-center rounded-full border-2 border-gold-300/60 px-6 text-[15px] font-bold text-gold-100 active:bg-white/10">Track an order</Link>
          </div>
        </div>
        <div className="relative mx-auto -mb-4 mt-2 w-full max-w-[420px] md:mb-0">
          {photos.length >= 2 ? (
            <div className="anim-spin-in grid grid-cols-[1.1fr_1fr] gap-3">
              <div className="arch row-span-2 aspect-[3/5] overflow-hidden ring-4 ring-gold/70"><Photo product={photos[0].primary} name={photos[0].base} category={photos[0].category} eager /></div>
              {photos.slice(1).map((p) => <div key={p.key} className="aspect-square overflow-hidden rounded-[28px] ring-4 ring-gold/70"><Photo product={p.primary} name={p.base} category={p.category} eager /></div>)}
            </div>
          ) : <Thali className="anim-spin-in w-full drop-shadow-2xl" />}
        </div>
      </div>
      <div className="scallop-b" aria-hidden style={{ ["--scallop" as string]: "var(--color-cream)", transform: "scaleY(-1)", marginBottom: -1 }} />
    </section>
  );
}

function TrustStrip() {
  const t = [[ShieldIcon, "FSSAI certified", "Licensed food kitchen"], [LeafIcon, "Pure cow ghee", "In our sweets"], [FlameIcon, "Made fresh daily", "Cooked every morning"], [StarIcon, `Since ${SITE.since}`, "Malleshwaram’s sweet shop"]] as const;
  return (
    <section aria-label="Why customers trust us" className="mx-auto -mt-1 max-w-6xl px-4 pt-6 md:px-6">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {t.map(([Ic, a, b]) => (
          <li key={a} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card md:p-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-100 text-maroon-700"><Ic width={22} height={22} /></span><span className="leading-tight"><b className="block text-[14px] text-ink">{a}</b><span className="hidden text-xs text-ink-soft sm:block">{b}</span></span></li>
        ))}
      </ul>
    </section>
  );
}

function Categories({ items }: { items: Item[] }) {
  const cats = categoryList(items);
  if (!cats.length) return null;
  return (
    <section className="mx-auto mt-12 max-w-6xl md:px-6" aria-labelledby="cat-h">
      <div id="cat-h"><SectionHead title="Shop by category" sub="Tap to see everything we make" to="/categories" cta="All" /></div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {cats.map((c, i) => {
          const sample = items.find((x) => x.category === c.name);
          return (
            <Link key={c.name} to={catHref(c.name)} className="group w-[132px] shrink-0 md:w-auto">
              <div className="arch aspect-[4/5] overflow-hidden bg-beige ring-2 ring-gold/40 transition group-active:scale-[.98]">
                {sample?.image ? <img src={c.sample} alt="" loading="lazy" className="size-full object-cover" /> : <SweetArt kind={artKind(sample?.base ?? "", c.name)} seed={i + 1} className="size-full" />}
              </div>
              <p className="mt-2.5 text-center text-[15px] font-bold leading-tight text-maroon-800">{c.name}</p>
              <p className="text-center text-xs text-ink-soft">{c.count} {c.count === 1 ? "item" : "items"}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Promo() {
  const { setPrefs } = useStore();
  return (
    <section className="mx-auto mt-14 grid max-w-6xl gap-3 px-4 md:grid-cols-2 md:px-6" aria-label="Offers">
      <div className="relative overflow-hidden rounded-[28px] bg-gold p-6 text-maroon-950">
        <Mandala className="absolute -right-10 -top-10 size-44 text-maroon-950/10" />
        <TruckIcon width={30} height={30} />
        <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight">Free delivery over {rupees(SITE.freeDeliveryAbove)}</h2>
        <p className="mt-1 text-[15px]">Just {rupees(SITE.deliveryFee)} below that. We deliver across Bengaluru.</p>
        <Link to="/menu" className="mt-4 inline-flex h-12 items-center rounded-full bg-maroon-800 px-6 font-bold text-white">Start shopping</Link>
      </div>
      <div className="relative overflow-hidden rounded-[28px] bg-maroon-700 p-6 text-white">
        <StoreIcon width={30} height={30} className="text-gold-300" />
        <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight">Skip the queue, pick up in store</h2>
        <p className="mt-1 text-[15px] text-gold-100/90">Choose a time, we’ll have it packed fresh and waiting. No charge.</p>
        <Link to="/menu" onClick={() => setPrefs({ mode: "Pickup" })} className="mt-4 inline-flex h-12 items-center rounded-full bg-gold px-6 font-bold text-maroon-950">Order for pickup</Link>
      </div>
    </section>
  );
}

function Block({ title, sub, to, children, dark }: { title: string; sub?: string; to?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? "mt-14 bg-maroon-800 py-10" : "mt-14"}>
      <div className="mx-auto max-w-6xl md:px-6"><SectionHead title={title} sub={sub} to={to} dark={dark} />{children}</div>
    </section>
  );
}

function Visit() {
  return (
    <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6" aria-labelledby="visit-h">
      <div className="grid overflow-hidden rounded-[28px] bg-white shadow-card md:grid-cols-[1fr_1.2fr]">
        <div className="p-6 md:p-8">
          <h2 id="visit-h" className="font-display text-[28px] font-semibold text-maroon-800">Visit our store</h2>
          <p className="mt-1 text-ink-soft">Come say hello and taste before you buy.</p>
          <ul className="mt-5 space-y-4 text-[15px]">
            <li className="flex gap-3"><PinIcon className="mt-0.5 shrink-0 text-maroon-700" />{SITE.addressLines.join(", ")}</li>
            <li className="flex gap-3"><ClockIcon className="mt-0.5 shrink-0 text-maroon-700" />{SITE.hours}</li>
            <li className="flex gap-3"><PhoneIcon className="mt-0.5 shrink-0 text-maroon-700" /><a className="font-bold text-maroon-700" href={SITE.phoneHref}>{SITE.phoneDisplay}</a></li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={SITE.mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center rounded-full bg-maroon-700 px-6 font-bold text-white">Get directions</a>
            <a href={SITE.phoneHref} className="inline-flex h-12 items-center rounded-full border-2 border-maroon-700 px-6 font-bold text-maroon-700">Call us</a>
            <a href={SITE.whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1fa855] px-6 font-bold text-white"><WhatsAppIcon width={20} height={20} />WhatsApp us</a>
          </div>
        </div>
        <div className="kolam relative hidden min-h-56 place-items-center bg-gold-100 md:grid"><Thali className="w-64" /></div>
      </div>
    </section>
  );
}

function Testimonials() {
  if (!SITE.testimonials.length) return null;
  return (
    <section className="mx-auto mt-14 max-w-6xl md:px-6"><SectionHead title="Words from our customers" />
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {SITE.testimonials.map((t) => (
          <figure key={t.name} className="w-[82vw] max-w-sm shrink-0 snap-start rounded-3xl bg-white p-5 shadow-card md:w-auto md:max-w-none">
            <div className="flex gap-0.5 text-gold">{Array.from({ length: 5 }, (_, i) => <StarIcon key={i} width={18} height={18} />)}</div>
            <blockquote className="mt-3 text-[15px] leading-relaxed">{t.text}</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-maroon-800">{t.name}{t.place && <span className="font-normal text-ink-soft"> · {t.place}</span>}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Social({ items }: { items: Item[] }) {
  if (!SITE.instagramUrl) return null;
  const pics = items.filter((i) => i.image).slice(0, 6);
  return (
    <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
      <div className="rounded-[28px] bg-beige p-6 text-center md:p-8">
        <InstagramIcon className="mx-auto text-maroon-700" width={30} height={30} />
        <h2 className="mt-2 font-display text-[28px] font-semibold text-maroon-800">Follow our kitchen</h2>
        <p className="text-ink-soft">{SITE.instagramHandle || "See what’s fresh today"}</p>
        {pics.length > 0 && <div className="mx-auto mt-5 grid max-w-2xl grid-cols-3 gap-2 md:grid-cols-6">{pics.map((p) => <div key={p.key} className="aspect-square overflow-hidden rounded-2xl"><Photo product={p.primary} name={p.base} category={p.category} /></div>)}</div>}
        <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-12 items-center rounded-full bg-maroon-700 px-6 font-bold text-white">Follow on Instagram</a>
      </div>
    </section>
  );
}

export default function Home() {
  usePageTitle(`${SITE.name} · Fresh Mysore Pak, murukku & festive sweets in ${SITE.area}`, `Order fresh sweets and savouries from ${SITE.legalName}, ${SITE.area} since ${SITE.since}. Delivery across Bengaluru or store pickup.`);
  const { items, isLoading, isError, refetch } = useProducts();
  const s = buildSections(items);
  return (
    <>
      <Hero items={items} />
      <TrustStrip />
      {isLoading && <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><ProductSkeletons n={4} /></div></section>}
      {isError && (
        <section className="mx-auto mt-12 max-w-md px-4 text-center">
          <div className="rounded-3xl bg-white p-6 shadow-card"><h2 className="font-display text-2xl text-maroon-800">The menu didn’t load</h2><p className="mt-2 text-ink-soft">Check your connection and try again, or call us on {SITE.phoneDisplay} to order.</p>
            <div className="mt-4 flex justify-center gap-3"><button onClick={() => refetch()} className="h-12 rounded-full bg-maroon-700 px-6 font-bold text-white">Try again</button><a href={SITE.phoneHref} className="grid h-12 place-items-center rounded-full border-2 border-maroon-700 px-6 font-bold text-maroon-700">Call</a></div></div>
        </section>
      )}
      {!isLoading && !isError && items.length === 0 && <p className="mx-auto mt-12 max-w-md px-4 text-center text-ink-soft">Our menu is being updated. Please check back shortly or call {SITE.phoneDisplay}.</p>}
      <Categories items={items} />
      {s.favourites.length > 0 && <Block title="Customer favourites" sub="The sweets and savouries everyone comes back for" to="/menu"><ItemRail items={cap(s.favourites, 10)} /></Block>}
      {s.festive.length > 0 && <Block dark title="Festive specials" sub="Made for the season. Order early, they go fast" to={s.festive[0] ? catHref(s.festive[0].category) : "/menu"}><ItemRail dark items={cap(s.festive, 10)} /></Block>}
      {s.gifts.length > 0 && <Block title="Premium gift boxes" sub="Beautifully packed for the people you love" to="/menu"><ItemRail items={cap(s.gifts, 10)} /></Block>}
      <Promo />
      {s.sweets.length > 0 && <Block title="Traditional Indian sweets" sub="Slow-cooked in pure ghee, the way it’s always been done" to={catHref(s.sweets[0].category)}>
        <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-4 md:gap-4 md:px-0">{cap(s.sweets, 8).map((i) => <ProductCard key={i.key} item={i} />)}</div></Block>}
      {s.savouries.length > 0 && <Block title="Crunchy savouries" sub="Hand-twisted and fried fresh" to={catHref(s.savouries[0].category)}><ItemRail items={cap(s.savouries, 10)} /></Block>}
      {s.fresh.length > 0 && <Block title="New arrivals" to="/menu"><ItemRail items={cap(s.fresh, 10)} /></Block>}
      {s.other.map((o) => <Block key={o.category} title={o.category} to={catHref(o.category)}><ItemRail items={cap(o.items, 10)} /></Block>)}
      <Testimonials />
      <Social items={items} />
      <Visit />
    </>
  );
}
