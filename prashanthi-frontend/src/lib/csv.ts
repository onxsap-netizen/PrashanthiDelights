// Builds a CSV that opens cleanly in Excel / Google Sheets and downloads it in the browser.
const cell = (v: unknown): string => {
  let s = v === null || v === undefined ? "" : String(v);
  // stop spreadsheet formula injection from customer-typed text
  if (/^[=@\t\r]/.test(s) || /^[+-][^0-9]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
