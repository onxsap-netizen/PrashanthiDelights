import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({ width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });
const I = (d: string | string[]) => (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>{(Array.isArray(d) ? d : [d]).map((x, i) => <path key={i} d={x} />)}</svg>
);

export const SearchIcon = I(["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"]);
export const BagIcon = I(["M5 8h14l-1 12H6L5 8Z", "M9 8V6.5a3 3 0 0 1 6 0V8"]);
export const HomeIcon = I(["M4 11.5 12 4l8 7.5", "M6 10v10h12V10", "M10 20v-5h4v5"]);
export const GridIcon = I(["M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"]);
export const UserIcon = I(["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21c1-4 4-6 8-6s7 2 8 6"]);
export const BackIcon = I("m15 5-7 7 7 7");
export const ChevronRight = I("m9 5 7 7-7 7");
export const PlusIcon = I("M12 5v14M5 12h14");
export const MinusIcon = I("M5 12h14");
export const CloseIcon = I("M6 6l12 12M18 6 6 18");
export const CheckIcon = I("m5 12.5 4.5 4.5L19 7.5");
export const TruckIcon = I(["M3 6h11v10H3z", "M14 10h4l3 3v3h-7", "M7 19a1.7 1.7 0 1 0 0-3.4A1.7 1.7 0 0 0 7 19ZM17 19a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z"]);
export const StoreIcon = I(["M4 9l1.5-5h13L20 9", "M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9", "M5 12v8h14v-8", "M10 20v-4h4v4"]);
export const PhoneIcon = I("M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z");
export const PinIcon = I(["M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21Z", "M12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5Z"]);
export const WhatsAppIcon = I(["M3 21l1.600-4.600A8.500 8.500 0 1 1 8 19.600L3 21Z", "M9 8.500c0 3.500 3 6.500 6.500 6.500l1.200-1.400-2.300-1.100-.9.800a4.700 4.700 0 0 1-2.300-2.300l.8-.9-1.100-2.300L9 8.500Z"]);
export const ClockIcon = I(["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"]);
export const TrashIcon = I(["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13"]);
export const EyeIcon = I(["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"]);
export const ShieldIcon = I(["M12 3 5 6v6c0 4.500 3 7.500 7 9 4-1.500 7-4.500 7-9V6l-7-3Z", "m9 12 2.200 2.200L15 10"]);
export const LeafIcon = I(["M5 19c0-8 5-14 15-14 0 10-6 15-14 15", "M5 19c3-5 6-8 10-10"]);
export const FlameIcon = I("M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z");
export const CopyIcon = I(["M9 9h10v11H9z", "M5 15V4h10"]);
export const CameraIcon = I(["M4 8h3l1.500-2.500h7L17 8h3v11H4z", "M12 16.500a3.200 3.200 0 1 0 0-6.400 3.200 3.200 0 0 0 0 6.400Z"]);
export const InstagramIcon = I(["M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M17.500 6.500h.01"]);
export const StarIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base({ fill: "currentColor", stroke: "none", ...p })}><path d="m12 3 2.700 5.600 6.100.8-4.500 4.300 1.100 6.100L12 16.800 6.600 19.800l1.100-6.100L3.200 9.400l6.100-.8L12 3Z" /></svg>;
