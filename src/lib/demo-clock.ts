// ============================================================
// Demo clock — one notion of "today" for the whole showcase.
//
// The sample data tells one story from Sep 2026 to Feb 2027. "Today" is the
// visitor's real date, clamped into that window so the demo never shows
// impossible states (before the data starts, or after the story ends).
//
// Server render and the first client paint always use ANCHOR so the HTML
// matches during hydration; the real date takes over right after.
// ============================================================
import { useHydrated } from "./use-hydrated";

export const TIMELINE_START = "2026-09-01";
/** The date the sample data was authored "as of". Also the SSR/first-paint date. */
export const ANCHOR = "2026-11-23";
/** After this the demo freezes on this date rather than drifting into undefined data. */
export const TIMELINE_END = "2027-02-28";

/** Fiscal year runs July–June (common for Ugandan SACCOs), so the whole window is FY 2026/27. */
export const FY_START_MONTH = 7;

/** Key dates in the story. Pages read these rather than hardcoding text. */
export const TIMELINE_EVENTS = {
  fyStart: "2026-07-01",
  /** Opening balances for the ledger are struck at the end of the previous FY. */
  fyOpening: "2026-06-30",
  arrearsReminder: "2026-12-01T09:00",
  boardMeeting: "2026-12-12",
  festiveNotice: "2026-12-18T08:00",
  officeClosedFrom: "2026-12-24",
  officeReopens: "2027-01-04",
  newFixedRate: "2027-01-01",
  newFixedRatePct: 13,
  agmNotice: "2027-01-20T09:00",
  agmReminder: "2027-02-13T09:00",
  agm: "2027-02-20",
  agmVenue: "Silver Springs Hotel, Kampala",
  /** FY 2025/26 dividend declared at the AGM. */
  dividendFy: "FY 2025/26",
  dividendRatePct: 11,
  dividendPayable: "2027-03-15",
  fixedDepositMaturity: "2027-04-15",
  /** James's standing orders: loan installment on the 1st, savings deposit on the 2nd. */
  loanInstallmentDay: 1,
  savingsStandingOrderDay: 2,
  savingsStandingOrderAmount: 200_000,
} as const;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Real local date (YYYY-MM-DD) clamped into the demo window. Client-side only. */
export function demoTodayISO(now: Date = new Date()): string {
  const t = iso(now);
  if (t < ANCHOR) return ANCHOR;
  if (t > TIMELINE_END) return TIMELINE_END;
  return t;
}

/**
 * "Today" for display and status logic. ANCHOR until hydration, then the clamped
 * real date. Use this instead of DEMO_TODAY / todayISO() when deciding what is
 * past, due, overdue, revealed or "this month".
 */
export function useDemoToday(): string {
  const hydrated = useHydrated();
  return hydrated ? demoTodayISO() : ANCHOR;
}

/** Current timestamp clamped to the window, as "YYYY-MM-DDTHH:MM:SS" local. */
export function demoNowISO(now: Date = new Date()): string {
  const day = demoTodayISO(now);
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  // If the real date is outside the window, pin the time to mid-morning.
  return day === iso(now) ? `${day}T${time}` : `${day}T10:00:00`;
}

/** True once a dated seed record should be visible (date or datetime ≤ today). */
export function isRevealed(date: string | null | undefined, today: string): boolean {
  if (!date) return true;
  return date.slice(0, 10) <= today;
}

/** Keep only records whose date field is on or before today. */
export function revealed<T>(rows: T[], today: string, field: keyof T): T[] {
  return rows.filter((r) => isRevealed(r[field] as unknown as string, today));
}

/** "2026-12" */
export const monthKey = (date: string) => date.slice(0, 7);

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Dec 2026" (or "December 2026" with long=true). */
export function monthLabel(date: string, long = false): string {
  const y = date.slice(0, 4);
  const m = Number(date.slice(5, 7)) - 1;
  return `${(long ? MONTHS_LONG : MONTHS_SHORT)[m]} ${y}`;
}

/** "Dec" */
export const monthShort = (date: string) => MONTHS_SHORT[Number(date.slice(5, 7)) - 1];

/** Add whole months to a YYYY-MM(-DD) date, returning YYYY-MM-01. */
export function addMonthsKey(date: string, months: number): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1 + months;
  const d = new Date(y, m, 1);
  return iso(d);
}

/** First day of the month after `date`. */
export const firstOfNextMonth = (date: string) => addMonthsKey(date, 1);

/** The last n months ending with today's month, oldest first: [{ key: "2026-12", month: "Dec", label: "Dec 2026" }]. */
export function lastNMonths(today: string, n: number): { key: string; month: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const first = addMonthsKey(today, i - (n - 1));
    return { key: monthKey(first), month: monthShort(first), label: monthLabel(first) };
  });
}

/** "FY 2026/27" for a date, with a July–June fiscal year. */
export function fyOf(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const start = m >= FY_START_MONTH ? y : y - 1;
  return `FY ${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

/** First day of the fiscal year containing `date`. */
export function fyStartOf(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const start = m >= FY_START_MONTH ? y : y - 1;
  return `${start}-${pad(FY_START_MONTH)}-01`;
}

/**
 * A trailing monthly series that ends at `endValue` in today's month and grows
 * at the given monthly rates going forward in time (rates cycle if shorter).
 * Charts use this so the last point always matches the live KPI on any date.
 */
export function trailingSeries(
  today: string,
  n: number,
  endValue: number,
  monthlyRates: number[],
  round = 1
): { key: string; month: string; label: string; value: number }[] {
  const months = lastNMonths(today, n);
  const values: number[] = new Array(n);
  values[n - 1] = endValue;
  for (let i = n - 2; i >= 0; i--) {
    // Rate indexed by calendar month so the shape is stable as the window slides.
    const nextMonthIdx = Number(months[i + 1].key.slice(5, 7)) - 1;
    const r = monthlyRates[nextMonthIdx % monthlyRates.length];
    values[i] = values[i + 1] / (1 + r);
  }
  return months.map((m, i) => ({ ...m, value: Math.round(values[i] / round) * round }));
}

/** Whole days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const pa = new Date(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const pb = new Date(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round((pb.getTime() - pa.getTime()) / 86_400_000);
}

/** Dates of a monthly event on `day` from `fromDate` (exclusive) through `today` (inclusive). */
export function monthlyOccurrences(day: number, fromDate: string, today: string): string[] {
  const out: string[] = [];
  let cursor = monthKey(fromDate) + "-01";
  for (let guard = 0; guard < 36; guard++) {
    const d = `${monthKey(cursor)}-${pad(day)}`;
    if (d > today) break;
    if (d > fromDate) out.push(d);
    cursor = addMonthsKey(cursor, 1);
  }
  return out;
}
