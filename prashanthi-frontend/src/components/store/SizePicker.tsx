import type { Variant } from "@/lib/catalog";
import { rupees } from "@/lib/shop";

export function SizePicker({ variants, value, onChange }: { variants: Variant[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">Choose size</legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const on = v.id === value;
          return (
            <label key={v.id} className={`flex min-h-12 min-w-[84px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-3 py-1.5 text-center transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${on ? "border-maroon-700 bg-maroon-50" : "border-beige-200 bg-white"}`}>
              <input type="radio" name="size" className="sr-only" checked={on} onChange={() => onChange(v.id)} />
              <span className="text-[15px] font-bold text-ink">{v.pack || "Regular"}</span>
              <span className="text-xs tabular-nums text-ink-soft">{rupees(v.price)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
