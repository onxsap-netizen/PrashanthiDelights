import { useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BackIcon, ChevronRight } from "./Icons";

export function SectionHead({ title, sub, to, cta = "See all", dark = false }: { title: string; sub?: string; to?: string; cta?: string; dark?: boolean }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 px-4 md:px-0">
      <div>
        <h2 className={`font-display text-[26px] font-semibold leading-tight md:text-3xl ${dark ? "text-gold-100" : "text-maroon-800"}`}>{title}</h2>
        {sub && <p className={`mt-1 text-sm ${dark ? "text-gold-100/80" : "text-ink-soft"}`}>{sub}</p>}
      </div>
      {to && <Link to={to} className={`inline-flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-bold ${dark ? "text-gold-300" : "text-maroon-700"}`}>{cta}<ChevronRight width={16} height={16} /></Link>}
    </div>
  );
}

/** Swipeable row on phones (scroll-snap); arrow buttons appear on desktop. */
export function Rail({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * 480, behavior: "smooth" });
  const btn = `absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full shadow-lift md:grid ${dark ? "bg-gold-100 text-maroon-800" : "bg-white text-maroon-700"}`;
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:gap-4 md:scroll-px-0 md:px-0">
        {children}
      </div>
      <button type="button" aria-label="Scroll left" onClick={() => go(-1)} className={`${btn} -left-5`}><BackIcon /></button>
      <button type="button" aria-label="Scroll right" onClick={() => go(1)} className={`${btn} -right-5`}><ChevronRight /></button>
    </div>
  );
}
export const RailCell = ({ children }: { children: ReactNode }) => <div className="w-[44vw] max-w-[200px] shrink-0 snap-start md:w-[220px] md:max-w-none">{children}</div>;
