import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm" | "icon-sm";
}
const V = {
  default: "bg-[var(--primary,#7a1a2b)] text-[var(--primary-foreground,#fff)] hover:opacity-90",
  outline: "border border-[#d9c9ad] bg-white text-[#3a1a14] hover:bg-[#f3e8d8]",
  destructive: "bg-red-100 text-red-700 hover:bg-red-200",
};
const S = { default: "h-10 px-4 text-sm", sm: "h-8 px-3 text-sm", "icon-sm": "size-8" };

export function Button({ variant = "default", size = "default", className, ...p }: Props) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50", V[variant], S[size], className)} {...p} />;
}
