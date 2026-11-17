import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { serif } from "@/lib/brand";
import { apiGet, apiPost, explain } from "@/lib/api";

interface Field { key: string; label: string; group: string; secret: boolean; hint: string; set: boolean; source: "dashboard" | "server" | "none"; preview: string }
const card = "rounded-2xl border border-[#eadfce] bg-white p-4";
const GROUPS = ["Online payment", "WhatsApp", "Shop", "Automation", "Stock"];
const BLURB: Record<string, string> = {
  "Online payment": "Customers pay through Razorpay. Get these from razorpay.com → Account & Settings → API keys. Use the Test keys first, then switch to Live.",
  WhatsApp: "Order messages to customers and alerts to you, through Meta’s WhatsApp Cloud API.",
  Shop: "Used in the messages customers receive.",
  Automation: "Lets a scheduler send you the daily summary by itself.",
  Stock: "When to warn you that an item is running low.",
};
const TESTABLE: Record<string, "razorpay" | "whatsapp"> = { "Online payment": "razorpay", WhatsApp: "whatsapp" };
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");

export function SettingsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => apiGet<Field[]>("/admin/settings") });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["config"] }); };

  const save = useMutation({
    mutationFn: (v: { values: Record<string, string>; clear: string[] }) => fetch("/api/admin/settings", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) })
      .then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok) throw Object.assign(new Error(typeof d?.detail === "string" ? d.detail : "Couldn’t save"), { detail: true }); return d as Field[]; }),
    onSuccess: (d, v) => { qc.setQueryData(["admin", "settings"], d); setDraft((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !(k in v.values)))); refresh(); toast.success(v.clear.length ? "Removed" : "Saved. It’s live now."); },
    onError: (e) => toast.error((e as Error).message || explain(e)),
  });
  const test = useMutation({
    mutationFn: (svc: string) => apiPost<{ ok: boolean; message: string }>(`/admin/settings/test/${svc}`),
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message, { duration: 8000 })),
    onError: (e) => toast.error(explain(e)),
  });

  if (q.isError) return <p className="mx-auto max-w-4xl px-5 py-8">Couldn’t load settings. Please refresh.</p>;
  if (!q.data) return <p className="mx-auto max-w-4xl px-5 py-8">Loading settings…</p>;
  const dirty = Object.entries(draft).filter(([, v]) => v.trim() !== "");

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-5 pb-12 pt-4">
      <div className={card}>
        <h2 className="text-xl font-bold" style={serif}>Keys & settings</h2>
        <p className="mt-1 text-sm opacity-80">Type a key and press <b>Save</b>. The shop uses it straight away, with no redeploy and nothing to change in the website’s own settings. Saved secrets are hidden: only the last 4 characters are shown, and you can’t read them back. To change one, just type the new value.</p>
        <p className="mt-2 text-xs opacity-70">Keys saved here are stored in your database and take priority over any keys set in Vercel. Keys that come from Vercel show “from server”.</p>
      </div>

      {GROUPS.map((g) => {
        const fields = q.data.filter((f) => f.group === g);
        if (!fields.length) return null;
        const svc = TESTABLE[g];
        return (
          <section key={g} className={card}>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold" style={serif}>{g}</h3>
              {svc && <Button size="sm" variant="outline" className="ml-auto" disabled={test.isPending || dirty.length > 0} title={dirty.length ? "Save first, then test" : ""} onClick={() => test.mutate(svc)}>{test.isPending && test.variables === svc ? "Testing…" : "Test connection"}</Button>}
            </div>
            <p className="mt-1 text-xs opacity-70">{BLURB[g]}</p>
            <div className="mt-3 grid gap-4">
              {fields.map((f) => {
                const v = draft[f.key] ?? "";
                return (
                  <div key={f.key}>
                    <label htmlFor={f.key} className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">{f.label}
                      {f.set ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{f.source === "server" ? "set · from server" : "set"}</span> : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">not set</span>}
                    </label>
                    <div className="flex gap-2">
                      <Input id={f.key} autoComplete="off" spellCheck={false} data-1p-ignore type={f.secret && !reveal[f.key] ? "password" : "text"} value={v}
                        placeholder={f.set ? (f.secret ? `${f.preview}  (type to replace)` : `${f.preview}  (type to replace)`) : "Not set"}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} className="bg-white" />
                      {f.secret && v && <Button type="button" size="sm" variant="outline" onClick={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}>{reveal[f.key] ? "Hide" : "Show"}</Button>}
                      {f.key === "CRON_SECRET" && <Button type="button" size="sm" variant="outline" onClick={() => { setDraft((d) => ({ ...d, [f.key]: randomSecret() })); setReveal((r) => ({ ...r, [f.key]: true })); }}>Generate</Button>}
                      {f.set && f.source === "dashboard" && <Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={() => confirm(`Remove ${f.label}?${f.group === "Online payment" ? " Customers won’t be able to pay until it is added again." : ""}`) && save.mutate({ values: {}, clear: [f.key] })}>Remove</Button>}
                    </div>
                    <p className="mt-1 text-xs opacity-60">{f.hint}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-2xl border border-[#eadfce] bg-white/95 p-3 shadow-lg backdrop-blur">
        <span className="text-sm">{dirty.length ? `${dirty.length} change${dirty.length > 1 ? "s" : ""} not saved` : "No changes"}</span>
        {dirty.length > 0 && <Button size="sm" variant="outline" onClick={() => setDraft({})}>Discard</Button>}
        <Button className="ml-auto" disabled={!dirty.length || save.isPending} onClick={() => save.mutate({ values: Object.fromEntries(dirty), clear: [] })}>{save.isPending ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
