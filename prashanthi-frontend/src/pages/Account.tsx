import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SITE } from "@/config/site";
import { usePageTitle } from "@/lib/hooks";
import { cleanPhone, rupees } from "@/lib/shop";
import { useStore } from "@/lib/store";
import { Field } from "@/components/store/Field";
import { ChevronRight, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/store/Icons";

export default function Account() {
  usePageTitle(`My account · ${SITE.name}`);
  const { prefs, setPrefs, orders } = useStore();
  const [f, setF] = useState({ name: prefs.name, phone: prefs.phone, address: prefs.address });
  const [err, setErr] = useState("");
  const save = () => {
    if (f.phone && !cleanPhone(f.phone)) return setErr("Enter a valid 10-digit mobile number.");
    setErr(""); setPrefs({ name: f.name.trim(), phone: f.phone ? cleanPhone(f.phone) : "", address: f.address.trim() });
    toast.success("Details saved on this phone");
  };
  return (
    <div className="mx-auto max-w-xl px-4 pt-5">
      <h1 className="font-display text-[32px] font-semibold text-maroon-800">My account</h1>
      <p className="mt-1 text-ink-soft">No password needed. Your details are saved only on this device to make checkout quicker.</p>

      <section className="mt-5 rounded-3xl bg-white p-5 shadow-card" aria-labelledby="orders-h">
        <h2 id="orders-h" className="mb-3 font-display text-xl text-maroon-800">My orders</h2>
        {orders.length === 0
          ? <p className="text-[15px] text-ink-soft">Orders you place on this phone appear here.{prefs.phone && <> Or <Link className="font-bold text-maroon-700 underline" to={`/track?q=${prefs.phone}`}>look up orders for {prefs.phone}</Link>.</>}</p>
          : <ul className="divide-y divide-beige-200">{orders.map((o) => (
            <li key={o.code}><Link to={`/order/${o.code}`} className="flex min-h-14 items-center justify-between gap-3 py-2"><span><b className="block">{o.code}</b><span className="text-sm text-ink-soft">{new Date(o.at).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {rupees(o.total)}</span></span><ChevronRight className="text-maroon-700" /></Link></li>
          ))}</ul>}
        <Link to="/track" className="mt-3 inline-flex min-h-11 items-center text-[15px] font-bold text-maroon-700 underline underline-offset-4">Track another order</Link>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-card" aria-labelledby="det-h">
        <h2 id="det-h" className="mb-4 font-display text-xl text-maroon-800">Saved details</h2>
        <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" prefix="+91" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={err} />
          <Field multiline label="Delivery address" autoComplete="street-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <button className="h-14 rounded-full bg-maroon-700 text-lg font-extrabold text-white">Save details</button>
        </form>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-card">
        <h2 className="mb-3 font-display text-xl text-maroon-800">Help &amp; store</h2>
        <ul className="space-y-1 text-[15px]">
          <li><a href={SITE.phoneHref} className="flex min-h-12 items-center gap-3 font-semibold"><PhoneIcon className="text-maroon-700" />Call {SITE.phoneDisplay}</a></li>
          <li><a href={SITE.whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 font-semibold"><WhatsAppIcon className="text-[#1fa855]" />Chat on WhatsApp</a></li>
          <li><a href={SITE.mapsHref} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 font-semibold"><PinIcon className="text-maroon-700" />{SITE.addressLines.join(", ")}</a></li>
          <li><Link to="/policies" className="flex min-h-12 items-center gap-3 font-semibold text-ink-soft">Delivery, payments &amp; privacy</Link></li>
        </ul>
      </section>
      {(prefs.name || prefs.phone || prefs.address) && (
        <button onClick={() => { setPrefs({ name: "", phone: "", address: "" }); setF({ name: "", phone: "", address: "" }); toast("Saved details cleared"); }} className="mx-auto mt-5 block min-h-11 text-sm font-semibold text-ink-soft underline underline-offset-4">Clear details saved on this device</button>
      )}
    </div>
  );
}
