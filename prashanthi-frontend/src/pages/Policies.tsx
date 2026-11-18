import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE } from "@/config/site";
import { usePageTitle } from "@/lib/hooks";
import { rupees } from "@/lib/shop";

/** Only states what the shop actually does today (fees, hours, payment methods, data stored). */
export default function Policies() {
  usePageTitle(`Delivery, payments & privacy · ${SITE.name}`);
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash]);
  const h = "scroll-mt-28 font-display text-2xl font-semibold text-maroon-800";
  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 [&_p]:mt-2 [&_p]:leading-relaxed [&_p]:text-ink-soft [&_section]:mt-8">
      <h1 className="font-display text-[32px] font-semibold text-maroon-800">Delivery, payments &amp; privacy</h1>
      <section id="delivery"><h2 className={h}>Delivery &amp; pickup</h2>
        <p>We deliver across Bengaluru. Delivery is {rupees(SITE.deliveryFee)} for orders below {rupees(SITE.freeDeliveryAbove)} and free above that.</p>
        <p>Pickup is free from {SITE.addressLines.join(", ")}. Store hours: {SITE.hours}. We’re closed on Sundays.</p></section>
      <section id="payments"><h2 className={h}>Payments</h2>
        <p>Pay by UPI after placing your order, or pay at the store / on delivery. After a UPI payment, send us the transaction ID or a screenshot so we can confirm it. We never ask for card numbers or bank passwords.</p></section>
      <section id="privacy"><h2 className={h}>Privacy</h2>
        <p>We collect your name, phone number and (for delivery) address only to prepare, deliver and track your order. Your basket and saved details stay on your own device. Call us if you’d like your order details removed.</p></section>
      <section><h2 className={h}>Need help?</h2><p>Call <a className="font-bold text-maroon-700" href={SITE.phoneHref}>{SITE.phoneDisplay}</a> during store hours.</p></section>
    </div>
  );
}
