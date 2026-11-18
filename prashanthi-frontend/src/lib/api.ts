export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  // a hung request should never leave a spinner forever
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      signal: ctl.signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export const apiGet = <T,>(p: string) => call<T>("GET", p);
export const apiPost = <T,>(p: string, b?: unknown) => call<T>("POST", p, b ?? {});
export const apiPatch = <T,>(p: string, b: unknown) => call<T>("PATCH", p, b);
export const apiDelete = <T,>(p: string) => call<T>("DELETE", p);

/** Turns any failure into one plain sentence a customer can act on. */
export function explain(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof ApiError) {
    const d = (e.body as { detail?: unknown } | null)?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length) {
      const f = d[0] as { loc?: unknown[]; msg?: string };
      const field = String(f.loc?.[f.loc.length - 1] ?? "");
      if (field === "phone") return "Enter a valid 10-digit mobile number.";
      if (field === "name") return "Please enter your name.";
      return f.msg ?? fallback;
    }
    if (e.status >= 500) return "Our shop server is busy. Please try again in a moment.";
    return fallback;
  }
  if (e instanceof DOMException && e.name === "AbortError") return "That took too long. Check your connection and try again.";
  if (e instanceof TypeError) return "Can’t reach the shop. Check your internet connection and try again.";
  return fallback;
}
