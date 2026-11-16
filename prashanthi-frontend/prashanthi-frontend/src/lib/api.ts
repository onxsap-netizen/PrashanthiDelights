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
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const apiGet = <T,>(p: string) => call<T>("GET", p);
export const apiPost = <T,>(p: string, b?: unknown) => call<T>("POST", p, b ?? {});
export const apiPatch = <T,>(p: string, b: unknown) => call<T>("PATCH", p, b);
export const apiDelete = <T,>(p: string) => call<T>("DELETE", p);
