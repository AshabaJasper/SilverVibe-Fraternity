"use client";
// ============================================================
// Client-side export helpers (CSV download, print).
// ============================================================

type Row = Record<string, unknown>;

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Quote when needed; double any embedded quotes (RFC 4180).
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string. Column order follows `columns`, or the keys of the first row. */
export function toCsv(rows: Row[], columns?: { key: string; label: string }[]): string {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => csvCell(r[c.key])).join(",")).join("\r\n");
  return `${header}\r\n${body}`;
}

export function downloadFile(filename: string, content: string | Blob, mime = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download rows as a CSV file (UTF-8 BOM so Excel shows UGX and names correctly). */
export function exportToCsv(filename: string, rows: Row[], columns?: { key: string; label: string }[]) {
  const name = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  downloadFile(name, "﻿" + toCsv(rows, columns), "text/csv;charset=utf-8");
}

/** Print the element with id="print-area" (see @media print in globals.css). */
export function printArea() {
  window.print();
}
