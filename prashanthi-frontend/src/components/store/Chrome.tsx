import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { SITE } from "@/config/site";
import { useProducts } from "@/lib/hooks";
import { deliveryFee, rupees } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { Header, ModeSwitch } from "./Header";
import { BagIcon, ChevronRight, ClockIcon, GridIcon, HomeIcon, PhoneIcon, PinIcon, UserIcon, WhatsAppIcon } from "./Icons";
import { Mandala } from "./Art";
import { QuickView } from "./QuickView";

const FOCUS = /^\/(cart|checkout|order|product)/;

function useDesktop() {
  const q = "(min-width: 768px)";
  const [d, setD] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q), on = () => setD(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return d;
}

function BottomNav() {
  const { count } = useStore();
  const tabs = [["/", "Home", HomeIcon], ["/categories", "Categories", GridIcon], ["/cart", "Cart", BagIcon], ["/account", "Account", UserIcon]] as const;
  return (
    <nav aria-label="Primary" className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-cream-50/95 shadow-[0_-8px_24px_-12px_rgb(67_15_12/.25)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(([to, label, Ic]) => (
          <li key={to}>
            <NavLink to={to} end={to === "/"} className={({ isActive }) => `relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive ? "text-maroon-700" : "text-ink-soft"}`}>
              {({ isActive }) => (<>
                {isActive && <span className="absolute top-0 h-[3px] w-9 rounded-b-full bg-gold" />}
                <span className="relative"><Ic />{to === "/cart" && count > 0 && <span className="absolute -right-2.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-maroon-700 px-1 text-[10px] font-extrabold leading-[18px] text-white">{count}</span>}</span>
                {label}
              </>)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Floating "View basket" bar: one tap from anywhere to checkout. */
function MiniCart({ navVisible }: { navVisible: boolean }) {
  const { qty, count, prefs } = useStore();
  const { byId } = useProducts();
  const { pathname } = useLocation();
  if (!count || /^\/(cart|checkout|order|product)/.test(pathname)) return null;
  const sub = Object.entries(qty).reduce((s, [id, n]) => s + (byId.get(id)?.price ?? 0) * n, 0);
  const left = SITE.freeDeliveryAbove - sub;
  return (
    <div className={`anim-bar fixed inset-x-0 z-30 px-3 md:inset-x-auto md:bottom-6 md:right-6 md:w-96 md:px-0 ${navVisible ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(.75rem+env(safe-area-inset-bottom))]"} md:bottom-6`}>
      <Link to="/cart" className="flex min-h-14 items-center justify-between gap-3 rounded-full bg-maroon-800 py-2 pl-5 pr-2 text-white shadow-lift active:scale-[.98]">
        <span className="leading-tight">
          <b className="block text-[15px]">{count} {count === 1 ? "item" : "items"} · {rupees(sub)}</b>
          {prefs.mode === "Delivery" && left > 0 && sub > 0 && <span className="text-xs text-gold-100/90">Add {rupees(left)} more for free delivery</span>}
          {prefs.mode === "Delivery" && left <= 0 && <span className="text-xs text-gold-300">You’ve unlocked free delivery</span>}
          {prefs.mode === "Pickup" && <span className="text-xs text-gold-100/90">Pickup is always free</span>}
        </span>
        <span className="inline-flex h-11 items-center gap-1 rounded-full bg-gold px-4 text-[15px] font-extrabold text-maroon-950">View basket<ChevronRight width={16} height={16} /></span>
      </Link>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 bg-maroon-900 text-gold-100/90">
      <div className="scallop-b rotate-180" style={{ ["--scallop" as string]: "var(--color-cream)" }} aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden px-5 py-12 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:px-6">
        <Mandala className="pointer-events-none absolute -right-16 -top-10 size-72 text-gold/10" />
        <div>
          <div className="flex items-center gap-3"><img src="/prashanthi-logo.png" alt="" width={56} height={54} loading="lazy" className="size-14 rounded-full bg-white object-contain p-0.5 ring-2 ring-gold" /><div><b className="font-display text-2xl text-white">Prashanthi</b><p className="text-sm text-gold-300">Sweets &amp; Savouries · Since {SITE.since}</p></div></div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Pure-ghee Mysore Pak, hand-twisted murukku and festive bakshanam, made fresh every morning in {SITE.area}.</p>
          <p className="mt-3 text-sm">{SITE.trust.join(" · ")}{SITE.fssaiNumber && <> · FSSAI {SITE.fssaiNumber}</>}</p>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg text-white">Visit &amp; contact</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5"><PinIcon width={18} height={18} className="mt-0.5 shrink-0 text-gold" /><a href={SITE.mapsHref} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{SITE.addressLines.join(", ")}</a></li>
            <li className="flex gap-2.5"><ClockIcon width={18} height={18} className="mt-0.5 shrink-0 text-gold" />{SITE.hours}</li>
            <li className="flex gap-2.5"><PhoneIcon width={18} height={18} className="mt-0.5 shrink-0 text-gold" /><a href={SITE.phoneHref} className="font-semibold text-white">{SITE.phoneDisplay}</a></li>
            <li className="flex gap-2.5"><WhatsAppIcon width={18} height={18} className="mt-0.5 shrink-0 text-gold" /><a href={SITE.whatsappHref()} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline-offset-4 hover:underline">Chat on WhatsApp</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg text-white">Shop</h2>
          <ul className="space-y-1 text-sm">
            {([["/menu", "All sweets & savouries"], ["/categories", "Categories"], ["/track", "Track your order"], ["/account", "My account"]] as const).map(([to, l]) => <li key={to}><Link to={to} className="inline-flex min-h-9 items-center hover:text-white">{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg text-white">Good to know</h2>
          <ul className="space-y-1 text-sm">
            {([["/policies#delivery", "Delivery & pickup"], ["/policies#payments", "Payments"], ["/policies#privacy", "Privacy"]] as const).map(([to, l]) => <li key={to}><Link to={to} className="inline-flex min-h-9 items-center hover:text-white">{l}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 pb-24 text-center text-xs text-gold-100/60 md:pb-4">
        © {new Date().getFullYear()} {SITE.legalName} · <Link to="/admin" className="underline-offset-4 hover:underline">Staff login</Link>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const focus = FOCUS.test(pathname);
  const desktop = useDesktop();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const { prefs } = useStore();
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <Header focus={focus && !desktop} />
      {pathname === "/" && (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 md:px-6">
          <ModeSwitch />
          <p className="text-right text-xs font-medium leading-tight text-ink-soft md:text-sm">
            {prefs.mode === "Delivery" ? <><span className="hidden md:inline">Delivering across Bengaluru · </span>Free delivery over {rupees(SITE.freeDeliveryAbove)}</> : <>Pickup at {SITE.addressLines[0]}</>}
          </p>
        </div>
      )}
      <main id="main" className={focus ? "pb-28 md:pb-10" : ""}><Outlet /></main>
      {(!focus || desktop) && <Footer />}
      {!focus && <BottomNav />}
      <MiniCart navVisible={!focus} />
      <QuickView />
    </div>
  );
}

export { deliveryFee };
