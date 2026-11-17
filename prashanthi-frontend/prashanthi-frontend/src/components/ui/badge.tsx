import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const V = { secondary: "bg-[#f1e6d8] text-[#3a1a14]", outline: "border border-[#d9c9ad]", destructive: "bg-red-100 text-red-700" };

export function Badge({ variant = "secondary", className, ...p }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof V }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", V[variant], className)} {...p} />;
}
