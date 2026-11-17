import { createContext, useContext } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const Ctx = createContext<(o: boolean) => void>(() => {});

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <Ctx.Provider value={onOpenChange}>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => onOpenChange(false)}>{children}</div>
    </Ctx.Provider>
  );
}
export function SheetContent({ className, children, ...p }: HTMLAttributes<HTMLDivElement>) {
  const close = useContext(Ctx);
  return (
    <div role="dialog" aria-modal="true" className={cn("relative grid h-full w-full max-w-md content-start gap-3 bg-[#f8f1ea]", className)} onClick={(e) => e.stopPropagation()} {...p}>
      <button aria-label="Close" className="absolute right-4 top-4 text-lg" onClick={() => close(false)}>✕</button>
      {children}
    </div>
  );
}
export const SheetHeader = (p: HTMLAttributes<HTMLDivElement>) => <div {...p} />;
export const SheetTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => <h2 className={cn("text-xl font-bold", className)} {...p} />;
