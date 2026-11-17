import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const box = "w-full rounded-2xl border-2 bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-maroon-700";

export function Field({ label, error, hint, multiline = false, prefix, ...p }: { label: string; error?: string; hint?: string; multiline?: boolean; prefix?: ReactNode } & InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const desc = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  const cls = `${box} ${error ? "border-red-600" : "border-beige-200"}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-ink-soft">{prefix}</span>}
        {multiline
          ? <textarea id={id} aria-invalid={!!error} aria-describedby={desc} rows={3} className={`${cls} py-3`} {...(p as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
          : <input id={id} aria-invalid={!!error} aria-describedby={desc} className={`${cls} h-14 ${prefix ? "pl-14" : ""}`} {...(p as InputHTMLAttributes<HTMLInputElement>)} />}
      </div>
      {error ? <p id={`${id}-e`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">{error}</p> : hint ? <p id={`${id}-h`} className="mt-1.5 text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export const selectCls = `${box} h-14 border-beige-200 font-semibold`;
