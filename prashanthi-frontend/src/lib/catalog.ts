import type { Product, Tag } from "@/lib/shop";

/** "Badusha 250g" → { base: "Badusha", pack: "250g" } ; "Nel Pori Undai (6 pcs)" → { base: "Nel Pori Undai", pack: "6 pcs" } */
const PACK = /\s*\(?\s*(\d+(?:\.\d+)?)\s?(kg|g|gm|gms|ml|l|pcs|pc|pieces?)\s*\)?\s*$/i;

export interface Variant extends Product { pack: string; sizeRank: number }
/** One thing on the shelf. Sizes of the same sweet (250g / 500g / 1kg) become variants of one item. */
export interface Item { key: string; base: string; category: string; variants: Variant[]; primary: Variant; image?: string }

function parse(p: Product): Variant {
  const m = p.name.match(PACK);
  if (!m) return { ...p, pack: "", sizeRank: 0 };
  const n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  const rank = u === "kg" ? n * 1000 : u === "l" ? n * 1000 : n;
  const unit = u.startsWith("gm") ? "g" : u === "pc" || u.startsWith("piece") ? "pcs" : u;
  return { ...p, pack: `${m[1]}${/^(pcs)$/.test(unit) ? " " : ""}${unit}`, sizeRank: rank };
}

export function baseName(name: string) {
  return name.replace(PACK, "").trim() || name;
}

export function buildItems(products: Product[]): Item[] {
  const map = new Map<string, Variant[]>();
  for (const p of products) {
    const v = parse(p);
    const key = `${p.category.toLowerCase()}|${baseName(p.name).toLowerCase()}`;
    map.set(key, [...(map.get(key) ?? []), v]);
  }
  return [...map.entries()].map(([key, vs]) => {
    const variants = vs.sort((a, b) => a.sizeRank - b.sizeRank || a.price - b.price);
    const primary = variants[0];
    return { key, base: baseName(primary.name), category: primary.category, variants, primary, image: variants.find((v) => v.image)?.image };
  });
}

export const itemTags = (it: Item): Tag[] => [...new Set(it.variants.flatMap((v) => v.tags ?? []))];
export const hasTag = (it: Item, t: Tag) => itemTags(it).includes(t);
export const fromPrice = (it: Item) => Math.min(...it.variants.map((v) => v.price));

export const slug = (s: string) => encodeURIComponent(s);

const FESTIVE = /karthigai|festive|festival|diwali|deepavali|pongal|bakshanam|ugadi|special/i;
const GIFT = /gift|hamper|box/i;
const SWEETS = /sweet/i;
const SAVOURY = /savour|snack|namkeen|murukku/i;

export const isFestiveCat = (c: string) => FESTIVE.test(c);
export const isGiftCat = (c: string) => GIFT.test(c);

export interface Sections {
  favourites: Item[]; festive: Item[]; gifts: Item[]; sweets: Item[]; savouries: Item[]; fresh: Item[];
  other: { category: string; items: Item[] }[];
}

/** Picks homepage sections from REAL data only: tags the owner set, and category names. */
export function buildSections(items: Item[]): Sections {
  const byTag = (t: Tag) => items.filter((i) => hasTag(i, t));
  const festive = items.filter((i) => hasTag(i, "Festive") || isFestiveCat(i.category));
  const gifts = items.filter((i) => hasTag(i, "Gift") || isGiftCat(i.category));
  const sweets = items.filter((i) => SWEETS.test(i.category) && !isFestiveCat(i.category) && !isGiftCat(i.category));
  const savouries = items.filter((i) => SAVOURY.test(i.category) && !isFestiveCat(i.category));
  const used = new Set([...sweets, ...savouries, ...festive, ...gifts].map((i) => i.key));
  const rest = items.filter((i) => !used.has(i.key));
  const cats = [...new Set(rest.map((i) => i.category))];
  return {
    favourites: byTag("Best Seller"), festive, gifts, sweets, savouries, fresh: byTag("New"),
    other: cats.map((c) => ({ category: c, items: rest.filter((i) => i.category === c) })),
  };
}

export function categoryList(items: Item[]) {
  const cats = [...new Set(items.map((i) => i.category))];
  return cats.map((c) => ({ name: c, count: items.filter((i) => i.category === c).length, sample: items.find((i) => i.category === c && i.image)?.image }));
}

/** Which little illustration to draw when an item has no photo yet. */
export type ArtKind = "laddu" | "pak" | "murukku" | "badusha" | "burfi" | "snack";
export function artKind(name: string, category = ""): ArtKind {
  const s = `${name} ${category}`.toLowerCase();
  if (/laddu|ladu|undai|pori/.test(s)) return "laddu";
  if (/murukku|chakli|thenkuzhal|muthusaram|omapodi/.test(s)) return "murukku";
  if (/badusha|jangri|jalebi|adirasam|appam/.test(s)) return "badusha";
  if (/burfi|barfi|soan|halwa|papdi/.test(s)) return "burfi";
  if (/mysore|pak/.test(s)) return "pak";
  if (/mixture|ribbon|pakoda|thattai|karasev|boondhi|sev|savour/.test(s)) return "snack";
  return "pak";
}
