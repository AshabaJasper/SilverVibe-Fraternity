import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useSyncExternalStore } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "UGX 12,450,000" — explicit code reads better than the locale's "USh" symbol. */
export function formatCurrency(amount: number): string {
  const n = Math.round(amount);
  return `${n < 0 ? "-" : ""}UGX ${Math.abs(n).toLocaleString("en-US")}`;
}

/** Compact money for KPI tiles: "UGX 4.82B", "UGX 380M", "UGX 25K". */
export function formatCompact(amount: number): string {
  const a = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}UGX ${(a / 1e9).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (a >= 1e6) return `${sign}UGX ${(a / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `${sign}UGX ${(a / 1e3).toFixed(0)}K`;
  return `${sign}UGX ${a}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Parse "YYYY-MM-DD" as a *local* calendar date. `new Date("2026-11-04")` is UTC
 * midnight, which shows as the previous day for users west of UTC.
 */
export function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(date);
}

export function formatDate(date: string | Date): string {
  return parseDate(date).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return parseDate(date).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from today until `date` (negative if in the past). */
export function daysUntil(date: string | Date, from: Date = new Date()): number {
  const a = parseDate(date);
  const b = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** "in 5 days", "today", "3 days ago". */
export function formatRelativeDays(date: string | Date): string {
  const d = daysUntil(date);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}

/** "5 min ago", "3 hrs ago", "2 days ago" for timestamps. */
export function timeAgo(date: string | Date): string {
  const diff = Date.now() - parseDate(date).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Short unique id for demo records. */
export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const noopSubscribe = () => () => {};
/**
 * `true` only after hydration on the client. Use it to gate anything that differs
 * between server and browser (time-of-day greeting, Date.now(), localStorage).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
