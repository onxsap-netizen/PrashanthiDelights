import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CloseIcon } from "./Icons";

/** Bottom sheet on phones, centred dialog on larger screens. Esc / backdrop close, scroll locked, focus restored. */
export function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && box.current) { // keep focus inside
        const f = box.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="anim-fade fixed inset-0 z-[60] flex items-end justify-center bg-maroon-950/60 backdrop-blur-[2px] md:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        className="anim-sheet relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-cream-50 shadow-[var(--shadow-lift)] outline-none md:max-w-3xl md:rounded-[28px]">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-white/90 text-maroon-800 shadow-card"><CloseIcon /></button>
        {children}
      </div>
    </div>
  );
}
