import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { discountPct, rupees } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { AddControl } from "./AddControl";
import { Modal } from "./Modal";
import { Photo } from "./ProductCard";
import { SizePicker } from "./SizePicker";

export function QuickView() {
  const { quick, openQuick } = useStore();
  const [vid, setVid] = useState("");
  useEffect(() => { if (quick) setVid(quick.primary.id); }, [quick]);
  const v = quick?.variants.find((x) => x.id === vid) ?? quick?.primary;
  const off = v ? discountPct(v) : 0;
  return (
    <Modal open={!!quick} onClose={() => openQuick(null)} label={quick ? `Quick view: ${quick.base}` : "Quick view"}>
      {quick && v && (
        <div className="grid md:grid-cols-2">
          <div className="aspect-[5/4] overflow-hidden bg-beige md:aspect-auto md:min-h-[420px]"><Photo product={quick.variants.find((x) => x.image) ?? v} name={quick.base} category={quick.category} eager /></div>
          <div className="flex flex-col gap-4 p-5 pb-6 md:p-7">
            <div>
              <p className="text-sm font-medium text-ink-soft">{quick.category}</p>
              <h2 className="mt-0.5 font-display text-[26px] font-semibold leading-tight text-maroon-800">{quick.base}</h2>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-extrabold tabular-nums text-maroon-800">{rupees(v.price)}</span>
              {off > 0 && <><s className="text-ink-soft tabular-nums">{rupees(v.original_price as number)}</s><span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-extrabold text-gold-700">{off}% off</span></>}
            </div>
            {quick.variants.length > 1 && <SizePicker variants={quick.variants} value={v.id} onChange={setVid} />}
            {v.pack && quick.variants.length === 1 && <p className="text-sm text-ink-soft">Pack size: <b className="text-ink">{v.pack}</b></p>}
            {v.description && <p className="text-[15px] leading-relaxed text-ink-soft">{v.description}</p>}
            <p className="flex items-center gap-2 text-sm font-medium text-leaf"><span className="size-2 rounded-full bg-leaf" />Available to order today</p>
            <div className="mt-auto grid gap-3">
              <AddControl product={v} label={quick.base} />
              <Link to={`/product/${v.id}`} onClick={() => openQuick(null)} className="grid min-h-11 place-items-center text-sm font-bold text-maroon-700 underline underline-offset-4">View full details</Link>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
