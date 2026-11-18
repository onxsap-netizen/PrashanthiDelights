import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SITE } from "@/config/site";
import { baseName } from "@/lib/catalog";
import { useCartLines } from "@/lib/cartMath";
import { usePageTitle, useProducts } from "@/lib/hooks";
import { rupees } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { Stepper } from "@/components/store/AddControl";
import { ModeSwitch } from "@/components/store/Header";
import { TrashIcon } from "@/components/store/Icons";
import { Photo, ProductCard } from "@/components/store/ProductCard";
import { Rail, RailCell, SectionHead } from "@/components/store/Rail";
import { SweetArt } from "@/components/store/Art";

export function Summary({ subtotal, fee, total, mode, compact = false }: { subtotal: number; fee: number; total: number; mode: string; compact?: boolean }) {
  return (
    <dl className={`space-y-2.5 text-[15px] ${compact ? "" : ""}`}>
      <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold tabular-nums">{rupees(subtotal)}</dd></div>
      <div className="flex justify-between"><dt className="text-ink-soft">{mode === "Delivery" ? "Delivery" : "Pickup"}</dt><dd className={`font-semibold tabular-nums ${fee === 0 ? "text-leaf" : ""}`}>{fee === 0 ? "Free" : rupees(fee)}</dd></div>
      <div className="flex justify-between border-t border-dashed border-beige-200 pt-3 text-lg"><dt className="font-bold">Total</dt><dd className="font-extrabold tabular-nums text-maroon-800">{rupees(total)}</dd></div>
    </dl>
  );
}

export default function Cart() {
  usePageTitle(`Your basket · ${SITE.name}`);
  const nav = useNavigate();
  const { setQty, remove, add } = useStore();
  const { lines, valid, missing, subtotal, fee, total, mode, isLoading, isError } = useCartLines();
  const { items } = useProducts();
  const left = SITE.freeDeliveryAbove - subtotal;
  const pct = Math.min(100, Math.round((subtotal / SITE.freeDeliveryAbove) * 100));
  const inCart = new Set(lines.map((l) => l.id));
  const suggestions = items.filter((i) => !i.variants.some((v) => inCart.has(v.id))).slice(0, 8);

  if (!lines.length) return (
    <div className="mx-auto max-w-sm px-4 pt-10 text-center">
      <div className="mx-auto size-40 overflow-hidden rounded-full ring-4 ring-gold/50"><SweetArt kind="laddu" seed={1} className="size-full" /></div>
      <h2 className="mt-5 font-display text-3xl font-semibold text-maroon-800">Your basket is empty</h2>
      <p className="mt-2 text-ink-soft">Freshly made sweets and savouries are waiting for you.</p>
      <Link to="/menu" className="mt-5 inline-grid h-14 place-items-center rounded-full bg-maroon-700 px-10 text-lg font-extrabold text-white">Start shopping</Link>
      <Link to="/track" className="mt-3 block min-h-11 py-3 text-sm font-bold text-maroon-700 underline underline-offset-4">Track an existing order</Link>
    </div>
  );

  const go = () => {
    if (isError) return toast.error("We couldn’t load prices. Check your connection and try again.");
    if (missing.length) return toast.error("Please remove the unavailable items first.");
    nav("/checkout");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 md:px-6">
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div>
          {mode === "Delivery" && subtotal > 0 && (
            <div className="mb-4 rounded-3xl bg-white p-4 shadow-card">
              <p className="text-[15px] font-semibold">{left > 0 ? <>Add <b className="text-maroon-800">{rupees(left)}</b> more for free delivery</> : <span className="text-leaf">You’ve unlocked free delivery</span>}</p>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-beige" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery"><div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} /></div>
            </div>
          )}
          <ul className="space-y-3" aria-label="Items in your basket">
            {isLoading && lines.map((l) => <li key={l.id} className="skeleton h-28 rounded-3xl" />)}
            {!isLoading && lines.map((l) => {
              const p = l.product;
              if (!p) return (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-maroon-700/40 bg-maroon-50 p-4">
                  <span className="text-[15px]"><b>An item in your basket is no longer available.</b></span>
                  <button onClick={() => remove(l.id)} className="h-11 shrink-0 rounded-full bg-maroon-700 px-5 font-bold text-white">Remove</button>
                </li>
              );
              const name = baseName(p.name);
              return (
                <li key={l.id} className="flex gap-3 rounded-3xl bg-white p-3 shadow-card">
                  <Link to={`/product/${p.id}`} aria-label={`View ${name}`} className="size-24 shrink-0 overflow-hidden rounded-2xl bg-beige"><Photo product={p} name={name} category={p.category} /></Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${p.id}`} className="line-clamp-2 text-[15px] font-semibold leading-snug">{name}{p.name !== name && <span className="ml-1.5 rounded-full bg-beige px-2 py-0.5 text-xs font-medium">{p.name.slice(name.length).replace(/[()]/g, "").trim()}</span>}</Link>
                      <button onClick={() => { remove(l.id); toast("Removed from basket", { action: { label: "Undo", onClick: () => add(l.id, l.qty) } }); }} aria-label={`Remove ${name}`} className="-mr-1 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-soft active:bg-maroon-50"><TrashIcon width={20} height={20} /></button>
                    </div>
                    <p className="text-sm text-ink-soft tabular-nums">{rupees(p.price)} each</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <Stepper n={l.qty} onChange={(n) => setQty(l.id, n)} label={name} />
                      <b className="text-lg tabular-nums text-maroon-800">{rupees(p.price * l.qty)}</b>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link to="/menu" className="mt-4 inline-flex min-h-11 items-center text-[15px] font-bold text-maroon-700 underline underline-offset-4">+ Add more items</Link>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="mb-3 font-display text-xl text-maroon-800">Order summary</h2>
            <ModeSwitch className="mb-4 w-full [&>button]:flex-1 [&>button]:justify-center" />
            <Summary subtotal={subtotal} fee={fee} total={total} mode={mode} />
            <button onClick={go} className="mt-5 hidden h-14 w-full rounded-full bg-maroon-700 text-lg font-extrabold text-white shadow-lift active:scale-[.98] md:block">Checkout · {rupees(total)}</button>
            <p className="mt-3 text-center text-xs text-ink-soft">Final amount is confirmed when you place the order.</p>
          </div>
        </aside>
      </div>

      {suggestions.length > 0 && <section className="mt-12"><SectionHead title="Goes well with your order" /><Rail>{suggestions.map((i) => <RailCell key={i.key}><ProductCard item={i} /></RailCell>)}</Rail></section>}

      <div className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-cream-50/97 px-4 pt-3 shadow-[0_-10px_30px_-14px_rgb(67_15_12/.35)] backdrop-blur md:hidden">
        <button onClick={go} disabled={valid.length === 0} className="mb-3 flex h-14 w-full items-center justify-between rounded-full bg-maroon-700 px-6 text-white shadow-lift active:scale-[.98] disabled:opacity-60">
          <span className="text-[17px] font-extrabold">Checkout</span><span className="text-[17px] font-extrabold tabular-nums">{rupees(total)}</span>
        </button>
      </div>
    </div>
  );
}
