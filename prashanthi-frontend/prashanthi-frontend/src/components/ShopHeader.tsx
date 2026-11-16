import "@fontsource-variable/lora";
import "@fontsource-variable/plus-jakarta-sans";
import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Mode } from "@/lib/shop";

export const serif: CSSProperties = { fontFamily: "'Lora Variable', Georgia, serif" };
export const brand = { "--primary": "#7a1a2b", "--primary-foreground": "#ffffff", fontFamily: "'Plus Jakarta Sans Variable', system-ui, sans-serif" } as CSSProperties;
const links = [["/", "Menu"], ["/track", "Track Order"], ["/admin", "Admin"]];

interface Props { mode?: Mode; setMode?: (m: Mode) => void; count?: number; onBasket?: () => void }

export default function ShopHeader({ mode, setMode, count = 0, onBasket }: Props) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#eadfce] bg-[#fffdf9] px-5 py-3">
      <Link to="/" className="flex items-center gap-3">
        <img src="/prashanthi-logo.png" alt="Prashanthi Sweets & Savouries, since 1987" className="size-14 rounded-full bg-white p-0.5 ring-2 ring-[#c99a2e]" />
        <span className="leading-tight">
          <b className="block text-xl text-[#6b1424]" style={serif}>Prashanthi Delights</b>
          <span className="text-[11px] tracking-[0.18em] text-[#7a1a2b]">SWEETS &amp; SAVOURIES · SINCE 1987</span>
        </span>
      </Link>
      <nav className="mx-auto flex gap-1">
        {links.map(([to, label]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1.5 text-sm font-semibold text-[#3a1a14] hover:bg-[#f3e8d8] ${pathname === to ? "bg-[#f3e8d8]" : ""}`}>{label}</Link>
        ))}
      </nav>
      {setMode && mode && (
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-[#e3d5bd] bg-white p-0.5">
            {(["Delivery", "Pickup"] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-[#7a1a2b] text-white" : "text-[#7b6a5f]"}`}>{m}</button>
            ))}
          </div>
          <Button className="h-10 rounded-full px-5" onClick={onBasket}>Basket{count ? ` · ${count}` : ""}</Button>
        </div>
      )}
    </header>
  );
}
