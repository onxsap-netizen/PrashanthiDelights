import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-lg border border-[#d9c9ad] bg-white px-3 text-sm outline-none focus:border-[#7a1a2b]", className)} {...p} />;
}
