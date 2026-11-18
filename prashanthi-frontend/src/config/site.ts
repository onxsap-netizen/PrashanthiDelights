/**
 * Shop-wide facts in ONE place. Contact details were taken from the original storefront.
 * Nothing here is product data (products always come from the backend).
 */
export const SITE = {
  name: "Prashanthi Delights",
  legalName: "Neelakantan’s Prashanthi Sweets & Savouries",
  tagline: "Sweets & Savouries since 1987",
  since: 1987,
  area: "Malleshwaram, Bengaluru",
  phoneDisplay: "+91 98458 28903",
  phoneHref: "tel:+919845828903",
  addressLines: ["1st Main, 52, 13th Cross, Sampige Rd, Malleshwaram", "Bengaluru 560003"],
  /** Opens Google Maps with the shop's address (Get directions / address links). */
  mapsHref: "https://www.google.com/maps/search/?api=1&query=Prashanthi+Delights+1st+Main+52+13th+Cross+Sampige+Rd+Malleshwaram+Bengaluru+560003",
  /** Chat on WhatsApp: number in international format, digits only (91 + 10-digit mobile). */
  whatsappNumber: "919845828903",
  hours: "Mon–Sat · 11 AM–2 PM and 4:30–8 PM",
  /** Must match the backend rule in routers/shop.py (the backend is the source of truth for the final total). */
  deliveryFee: 60,
  freeDeliveryAbove: 1500,
  trust: ["FSSAI certified", "Pure cow ghee", "Made fresh daily"],

  /** https://wa.me link. Pass a message to pre-fill the chat (e.g. an order code). */
  whatsappHref: (msg = "Hi Prashanthi Delights, I have a question.") => `https://wa.me/919845828903?text=${encodeURIComponent(msg)}`,

  /** Optional. Leave empty and the matching homepage section stays hidden. */
  instagramUrl: "",
  instagramHandle: "",
  fssaiNumber: "",
  /**
   * Add REAL customer reviews here ({ name, text, place? }) and a testimonials
   * section appears on the homepage. We never ship invented reviews.
   */
  testimonials: [] as { name: string; text: string; place?: string }[],
};
