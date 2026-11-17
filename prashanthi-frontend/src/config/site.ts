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
  addressLines: ["8th Cross, Malleshwaram", "Bengaluru 560003"],
  mapsHref: "https://www.google.com/maps/search/?api=1&query=Prashanthi+Sweets+8th+Cross+Malleshwaram+Bengaluru+560003",
  hours: "Mon–Sat · 11 AM–2 PM and 4:30–8 PM",
  /** Must match the backend rule in routers/shop.py (the backend is the source of truth for the final total). */
  deliveryFee: 60,
  freeDeliveryAbove: 1500,
  trust: ["FSSAI certified", "Pure cow ghee", "Made fresh daily"],

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
