// ============================================================
// General ledger shared by Accounting and Reports.
//
// Both pages build the trial balance and financial statements from the SAME chart
// of accounts, opening balances, monthly history and persisted journal (JOURNAL_KEY),
// so a figure on the Reports page always agrees with the Accounting page — including
// entries the user has posted or reversed.
//
// Fiscal year: July–June. Opening balances are struck at 30 Jun 2026 (close of
// FY 2025/26); Jul–Oct 2026 are summarised month closes (HISTORY); from 1 Nov 2026
// the journal holds individual entries. Seed entries run to Feb 2027 and only count
// once their date is on or before the demo "today" (the reveal rule) — every builder
// here takes `today` and applies that rule, so the trial balance, statements, chart
// and journal list always agree.
//
// Future-dated seed entries never move loans (1200), member savings (2000) or share
// capital (3000) on balance — any entry touching them comes as a same-day offsetting
// pair — so the headline KPIs (2.15B / 4.82B / 1.28B) hold on every date.
//
// Plain module: pure data and functions, no React, no browser APIs.
// ============================================================

import type { StatementLine } from "@/lib/pdf-reports";
import { formatDate } from "@/lib/utils";
import { TIMELINE_EVENTS as EV, isRevealed, monthKey, monthLabel, monthShort, addMonthsKey } from "@/lib/demo-clock";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export interface Account {
  code: string;
  name: string;
  type: AccountType;
  /** Contra accounts (e.g. loan-loss allowance) sit under assets but carry a credit balance. */
  normal: "debit" | "credit";
  /** Balance at OPENING_DATE (30 Jun 2026) on the account's normal side. Income/expense start the FY at zero. */
  opening: number;
}

/** First day of FY 2026/27. Statements and the cash flow run from here. */
export const FY_START = EV.fyStart;
/** Opening balances are struck at the close of the previous fiscal year. */
export const OPENING_DATE = EV.fyOpening;
/** Earliest date a manual entry may carry: everything before FY start is a closed period. */
export const PERIOD_START = FY_START;
/** First date covered by individual journal entries (Jul–Oct are summarised month closes). */
export const JOURNAL_START = "2026-11-01";
/**
 * Storage key for the journal. Versioned for the July–June ledger so a journal saved by
 * an older build (calendar-year openings) can't knock the trial balance off the KPIs.
 */
export const JOURNAL_KEY = "admin_journal_entries_fy2627";

// Opening balances (UGX) at 30 Jun 2026. After Jul–Oct history and the posted November
// entries, the headline balances match ADMIN_KPI on 23 Nov 2026 and every later date:
// loans 2.15B, member savings 4.82B, share capital 1.28B.
const BASE_ACCOUNTS: Account[] = [
  { code: "1000", name: "Cash on hand", type: "asset", normal: "debit", opening: 55_000_000 },
  { code: "1100", name: "Bank — current account", type: "asset", normal: "debit", opening: 640_000_000 },
  { code: "1150", name: "Mobile money float", type: "asset", normal: "debit", opening: 32_000_000 },
  { code: "1200", name: "Loans to members", type: "asset", normal: "debit", opening: 2_275_000_000 },
  { code: "1250", name: "Allowance for loan losses", type: "asset", normal: "credit", opening: 35_000_000 },
  { code: "1300", name: "Investments & fixed deposits", type: "asset", normal: "debit", opening: 2_760_000_000 },
  { code: "1400", name: "Property & equipment (net)", type: "asset", normal: "debit", opening: 430_000_000 },
  { code: "1500", name: "Interest receivable", type: "asset", normal: "debit", opening: 20_000_000 },
  { code: "2000", name: "Member savings deposits", type: "liability", normal: "credit", opening: 4_518_500_000 },
  { code: "2100", name: "Interest payable on savings", type: "liability", normal: "credit", opening: 0 },
  { code: "2200", name: "Accrued expenses", type: "liability", normal: "credit", opening: 16_000_000 },
  { code: "2300", name: "Dividends payable", type: "liability", normal: "credit", opening: 0 },
  { code: "3000", name: "Share capital", type: "equity", normal: "credit", opening: 1_210_000_000 },
  { code: "3100", name: "General reserves (b/f)", type: "equity", normal: "credit", opening: 0 }, // balancing figure, set below
  { code: "4000", name: "Interest income — loans", type: "income", normal: "credit", opening: 0 },
  { code: "4100", name: "Investment income", type: "income", normal: "credit", opening: 0 },
  { code: "4200", name: "Fees & commissions", type: "income", normal: "credit", opening: 0 },
  { code: "5000", name: "Operating expenses", type: "expense", normal: "debit", opening: 0 },
  { code: "5100", name: "Staff costs", type: "expense", normal: "debit", opening: 0 },
  { code: "5200", name: "Interest on member savings", type: "expense", normal: "debit", opening: 0 },
  { code: "5300", name: "Loan loss provision expense", type: "expense", normal: "debit", opening: 0 },
  { code: "5400", name: "Depreciation", type: "expense", normal: "debit", opening: 0 },
];

const signed = (a: Account, v: number) => (a.normal === "debit" ? v : -v);
/** Signed opening balance at OPENING_DATE: debit positive, credit negative. */
export const signedOpening = (a: Account) => signed(a, a.opening);

// General reserves b/f is whatever makes the opening trial balance balance
// (UGX 432,500,000 credit at 30 Jun 2026; it only moves when the AGM appropriates it).
export const ACCOUNTS: Account[] = (() => {
  const net = BASE_ACCOUNTS.filter((a) => a.code !== "3100").reduce((s, a) => s + signedOpening(a), 0);
  return BASE_ACCOUNTS.map((a) => (a.code === "3100" ? { ...a, opening: net } : a));
})();
export const ACCOUNT_BY_CODE: Record<string, Account> = Object.fromEntries(ACCOUNTS.map((a) => [a.code, a]));
export const accountLabel = (code: string) => `${code} · ${ACCOUNT_BY_CODE[code]?.name ?? "Unknown"}`;
export const ACCOUNT_OPTIONS = ACCOUNTS.map((a) => ({ value: a.code, label: accountLabel(a.code) }));
export const CASH_CODES = ["1000", "1100", "1150"];

// ------------------------------------------------------------------
// Jul–Oct 2026: summarised month closes (always in the past on the demo clock)
// ------------------------------------------------------------------
/** One summarised posting: [debit, credit, amount, description]. */
type HistLine = [string, string, number, string];
export interface HistoryMonth { key: string; lines: HistLine[] }

const M = 1_000_000;
const histMonth = (
  key: string,
  v: { int: number; accrual: number; collected: number; inv: number; fees: number; staff: number; opex: number; savInt: number; prov: number; disb: number; repay: number; deposits: number; shares: number; sweep: number; credited?: number }
): HistoryMonth => ({
  key,
  lines: ([
    ["1100", "4000", v.int * M, "Loan interest received"],
    ["1100", "1500", v.collected * M, "Accrued interest collected"],
    ["1500", "4000", v.accrual * M, "Month-end interest accrual on loans"],
    ["1100", "4100", v.inv * M, "Fixed deposit & treasury income"],
    ["1150", "4200", v.fees * M, "Loan processing & account fees"],
    ["5100", "1100", v.staff * M, "Staff salaries"],
    ["5000", "1100", v.opex * M, "Rent, utilities & IT"],
    ["5200", "2100", v.savInt * M, "Interest on member savings accrued"],
    ["5300", "1250", v.prov * M, "Loan loss provision"],
    ["5400", "1400", 2 * M, "Depreciation"],
    ["1200", "1100", v.disb * M, "Loan disbursements"],
    ["1100", "1200", v.repay * M, "Loan principal repayments"],
    ["1150", "2000", v.deposits * M, "Member savings deposits (net)"],
    ["1100", "3000", v.shares * M, "Share capital subscriptions"],
    ["1100", "1150", v.sweep * M, "Mobile money swept to bank"],
    ...(v.credited ? ([["2100", "2000", v.credited * M, "Quarterly savings interest credited to members"]] as HistLine[]) : []),
  ] as HistLine[]).map(([d, c, amt, desc]): HistLine => [d, c, Math.round(amt), desc]), // whole shillings (7.2 × 1e6 isn't exact in floating point)
});

// Disbursed/repaid match loanPerformance() in mock-data for the same months.
export const HISTORY: HistoryMonth[] = [
  histMonth("2026-07", { int: 40, collected: 20, accrual: 9, inv: 18, fees: 9, staff: 12, opex: 7, savInt: 14, prov: 3, disb: 320, repay: 290, deposits: 70, shares: 18, sweep: 60 }),
  histMonth("2026-08", { int: 41, collected: 9, accrual: 9, inv: 18, fees: 9.5, staff: 12, opex: 7.2, savInt: 14, prov: 3, disb: 250, repay: 305, deposits: 55, shares: 15, sweep: 50 }),
  histMonth("2026-09", { int: 42, collected: 9, accrual: 9.5, inv: 19, fees: 10, staff: 12, opex: 7.5, savInt: 14.5, prov: 4, disb: 190, repay: 340, deposits: 45, shares: 12, sweep: 45, credited: 42.5 }),
  histMonth("2026-10", { int: 43, collected: 9.5, accrual: 9.5, inv: 19.5, fees: 10.5, staff: 12.5, opex: 7.8, savInt: 15, prov: 3.5, disb: 350, repay: 280, deposits: 40, shares: 14, sweep: 55 }),
];

// ------------------------------------------------------------------
// Journal
// ------------------------------------------------------------------
export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debit: string; // account code
  credit: string; // account code
  amount: number;
  reference: string;
  status: "draft" | "posted";
  by: string;
  reversalOf?: string;
  reversedBy?: string;
}

const pad4 = (n: number) => String(n).padStart(4, "0");
const SARAH = "Sarah Nakamya";
const SYS = "System";

// Seed entries, numbered per calendar year in date order (JE-2026-0141 follows the
// Jul–Oct month closes; JE-2027-0001 starts January).
type Seed = [date: string, description: string, debit: string, credit: string, amount: number, reference: string, by?: string, status?: "draft"];
const SEED: Seed[] = [
  // ---- November 2026 (1–23 Nov posted; month-end revealed on its date) ----
  ["2026-11-01", "Loan interest received — November standing orders", "1100", "4000", 41_000_000, "LN-INT-11", SYS],
  ["2026-11-01", "Loan principal repayments — standing orders", "1100", "1200", 210_000_000, "LN-PRN-11", SYS],
  ["2026-11-01", "Accrued interest collected — October accrual", "1100", "1500", 9_500_000, "SYS-INT-10C", SYS],
  ["2026-11-02", "Member savings standing orders", "1100", "2000", 38_000_000, "SO-SAV-11", SYS],
  ["2026-11-03", "Fixed deposit interest — Stanbic", "1100", "4100", 8_000_000, "BNK-FD-221", SYS],
  ["2026-11-04", "Internet & IT subscriptions — November", "5000", "1100", 2_600_000, "INV-7781"],
  ["2026-11-05", "Loan disbursements — November batch 1", "1200", "1100", 180_000_000, "DISB-11A"],
  ["2026-11-10", "Share capital subscriptions — early November", "1100", "3000", 6_000_000, "SHR-11A"],
  ["2026-11-12", "Member savings deposits via mobile money", "1150", "2000", 52_000_000, "MM-BATCH-11", SYS],
  ["2026-11-14", "Office rent — November", "5000", "1100", 3_000_000, "INV-7790"],
  ["2026-11-16", "Loan processing fees collected", "1150", "4200", 4_500_000, "FEE-11", SYS],
  ["2026-11-18", "Mobile money collections swept to bank", "1100", "1150", 50_000_000, "SWP-1118"],
  ["2026-11-19", "Loan disbursements — November batch 2", "1200", "1100", 120_000_000, "DISB-11B"],
  ["2026-11-20", "Loan principal repayments — cash & mobile money", "1100", "1200", 110_000_000, "LN-PRN-11B", SYS],
  ["2026-11-20", "Loan processing fees reclassification", "1150", "4200", 1_500_000, "MJ-0045", SARAH, "draft"],
  ["2026-11-20", "Share capital subscriptions — mid November", "1100", "3000", 5_000_000, "SHR-11B"],
  ["2026-11-21", "Electricity & water — November", "5000", "1100", 1_200_000, "INV-7795"],
  ["2026-11-22", "Member withdrawals paid", "2000", "1100", 41_000_000, "WDL-11", SYS],
  ["2026-11-22", "Loan loss provision top-up (PAR review)", "5300", "1250", 1_800_000, "PAR-NOV", SARAH, "draft"],
  ["2026-11-23", "Treasury bill coupon received", "1100", "4100", 11_500_000, "TB-364-11"],
  ["2026-11-23", "Fixed deposit placement — Centenary Bank (6 months)", "1300", "1100", 100_000_000, "FD-CEN-1123"],
  ["2026-11-28", "Staff salaries — November 2026", "5100", "1100", 12_500_000, "PAY-11"],
  ["2026-11-30", "Monthly interest accrual on loans — November", "1500", "4000", 9_800_000, "SYS-INT-11", SYS],
  ["2026-11-30", "Interest on member savings accrued — November", "5200", "2100", 15_000_000, "SYS-SAV-11", SYS],
  ["2026-11-30", "Depreciation — November", "5400", "1400", 2_000_000, "DEP-11", SYS],

  // ---- December 2026 (festive month: board meeting, staff bonus) ----
  ["2026-12-01", "Loan interest received — December standing orders", "1100", "4000", 42_000_000, "LN-INT-12", SYS],
  ["2026-12-01", "Accrued interest collected — November accrual", "1100", "1500", 9_800_000, "SYS-INT-11C", SYS],
  ["2026-12-01", "Loan principal repayments — standing orders", "1100", "1200", 215_000_000, "LN-PRN-12", SYS],
  ["2026-12-01", "Loan disbursements — December batch", "1200", "1100", 215_000_000, "DISB-12"],
  ["2026-12-02", "Member savings standing orders", "1100", "2000", 39_000_000, "SO-SAV-12", SYS],
  ["2026-12-02", "Member withdrawals paid — festive season", "2000", "1100", 39_000_000, "WDL-12A", SYS],
  ["2026-12-04", "Internet & IT subscriptions — December", "5000", "1100", 2_600_000, "INV-7812"],
  ["2026-12-07", "Fixed deposit interest — Stanbic", "1100", "4100", 8_200_000, "BNK-FD-229", SYS],
  ["2026-12-12", "Board meeting costs — December", "5000", "1100", 1_800_000, "BRD-1212"],
  ["2026-12-14", "Office rent — December", "5000", "1100", 3_000_000, "INV-7820"],
  ["2026-12-16", "Loan processing fees collected", "1150", "4200", 4_200_000, "FEE-12", SYS],
  ["2026-12-18", "Mobile money collections swept to bank", "1100", "1150", 15_000_000, "SWP-1218"],
  ["2026-12-20", "Festive staff bonus — December 2026", "5100", "1100", 6_000_000, "PAY-12B"],
  ["2026-12-21", "Electricity & water — December", "5000", "1100", 1_100_000, "INV-7826"],
  ["2026-12-22", "Staff salaries — December 2026", "5100", "1100", 12_500_000, "PAY-12"],
  ["2026-12-31", "Monthly interest accrual on loans — December", "1500", "4000", 10_000_000, "SYS-INT-12", SYS],
  ["2026-12-31", "Interest on member savings accrued — December", "5200", "2100", 15_200_000, "SYS-SAV-12", SYS],
  ["2026-12-31", "Depreciation — December", "5400", "1400", 2_000_000, "DEP-12", SYS],

  // ---- January 2027 (13% fixed rate live; AGM notice) ----
  ["2027-01-01", "Loan interest received — January standing orders", "1100", "4000", 42_500_000, "LN-INT-01", SYS],
  ["2027-01-01", "Accrued interest collected — December accrual", "1100", "1500", 10_000_000, "SYS-INT-12C", SYS],
  ["2027-01-01", "Loan principal repayments — standing orders", "1100", "1200", 220_000_000, "LN-PRN-01", SYS],
  ["2027-01-01", "Loan disbursements — January batch", "1200", "1100", 220_000_000, "DISB-01"],
  ["2027-01-02", "Member savings standing orders", "1100", "2000", 40_000_000, "SO-SAV-01", SYS],
  ["2027-01-02", "Member withdrawals paid — school fees season", "2000", "1100", 40_000_000, "WDL-01A", SYS],
  ["2027-01-06", "Internet & IT subscriptions — January", "5000", "1100", 2_600_000, "INV-7841"],
  ["2027-01-08", "Fixed deposit interest — Stanbic", "1100", "4100", 8_400_000, "BNK-FD-236", SYS],
  ["2027-01-14", "Office rent — January", "5000", "1100", 3_000_000, "INV-7850"],
  ["2027-01-18", "Mobile money collections swept to bank", "1100", "1150", 10_000_000, "SWP-0118"],
  ["2027-01-19", "Loan processing fees collected", "1150", "4200", 4_800_000, "FEE-01", SYS],
  ["2027-01-20", "AGM notice printing & SMS bundle", "5000", "1100", 900_000, "AGM-NTC"],
  ["2027-01-21", "Electricity & water — January", "5000", "1100", 1_150_000, "INV-7858"],
  ["2027-01-27", "Staff salaries — January 2027", "5100", "1100", 12_500_000, "PAY-01"],
  ["2027-01-31", "Monthly interest accrual on loans — January", "1500", "4000", 10_200_000, "SYS-INT-01", SYS],
  ["2027-01-31", "Interest on member savings accrued — January", "5200", "2100", 15_600_000, "SYS-SAV-01", SYS],
  ["2027-01-31", "Depreciation — January", "5400", "1400", 2_000_000, "DEP-01", SYS],

  // ---- February 2027 (AGM on the 20th; FY 2025/26 dividend declared) ----
  ["2027-02-01", "Loan interest received — February standing orders", "1100", "4000", 43_000_000, "LN-INT-02", SYS],
  ["2027-02-01", "Accrued interest collected — January accrual", "1100", "1500", 10_200_000, "SYS-INT-01C", SYS],
  ["2027-02-01", "Loan principal repayments — standing orders", "1100", "1200", 225_000_000, "LN-PRN-02", SYS],
  ["2027-02-01", "Loan disbursements — February batch", "1200", "1100", 225_000_000, "DISB-02"],
  ["2027-02-02", "Member savings standing orders", "1100", "2000", 41_000_000, "SO-SAV-02", SYS],
  ["2027-02-02", "Member withdrawals paid", "2000", "1100", 41_000_000, "WDL-02A", SYS],
  ["2027-02-04", "Internet & IT subscriptions — February", "5000", "1100", 2_600_000, "INV-7872"],
  ["2027-02-08", "Fixed deposit interest — Stanbic", "1100", "4100", 8_500_000, "BNK-FD-243", SYS],
  ["2027-02-13", "AGM reminder SMS bundle", "5000", "1150", 350_000, "AGM-SMS"],
  ["2027-02-14", "Office rent — February", "5000", "1100", 3_000_000, "INV-7880"],
  ["2027-02-17", "Loan processing fees collected", "1150", "4200", 4_600_000, "FEE-02", SYS],
  ["2027-02-18", "Mobile money collections swept to bank", "1100", "1150", 8_000_000, "SWP-0218"],
  ["2027-02-20", `AGM costs — venue & catering, ${EV.agmVenue}`, "5000", "1100", 14_000_000, "AGM-2027"],
  ["2027-02-20", `${EV.dividendFy} dividend declared at ${EV.dividendRatePct}% (payable ${formatDate(EV.dividendPayable)})`, "3100", "2300", 140_800_000, "AGM-DIV"],
  ["2027-02-21", "Electricity & water — February", "5000", "1100", 1_100_000, "INV-7886"],
  ["2027-02-25", "Staff salaries — February 2027", "5100", "1100", 12_500_000, "PAY-02"],
  ["2027-02-28", "Monthly interest accrual on loans — February", "1500", "4000", 10_300_000, "SYS-INT-02", SYS],
  ["2027-02-28", "Interest on member savings accrued — February", "5200", "2100", 15_800_000, "SYS-SAV-02", SYS],
  ["2027-02-28", "Depreciation — February", "5400", "1400", 2_000_000, "DEP-02", SYS],
];

/** Full seed journal (newest first). Future-dated entries are filtered by the reveal rule. */
export const DEFAULT_JOURNAL: JournalEntry[] = (() => {
  const counters: Record<string, number> = { "2026": 140 };
  return SEED.map(([date, description, debit, credit, amount, reference, by = SARAH, status]): JournalEntry => {
    const y = date.slice(0, 4);
    counters[y] = (counters[y] ?? 0) + 1;
    return { id: `JE-${y}-${pad4(counters[y])}`, date, description, debit, credit, amount, reference, status: status ?? "posted", by };
  }).reverse();
})();

const ID_RE = /^JE-(\d{4})-(\d+)$/;

/**
 * Next id for an entry dated `date`: "JE-<year>-####", one above the highest number already
 * used in that year (hidden future seeds included, so ids never collide). Ids from older
 * builds that don't fit the pattern are ignored.
 */
export function nextJeId(entries: JournalEntry[], date: string): string {
  const year = date.slice(0, 4);
  const max = entries.reduce((m, e) => {
    const hit = ID_RE.exec(e.id);
    return hit && hit[1] === year ? Math.max(m, Number(hit[2])) : m;
  }, 0);
  const taken = new Set(entries.map((e) => e.id));
  let n = max + 1;
  while (taken.has(`JE-${year}-${pad4(n)}`)) n++;
  return `JE-${year}-${pad4(n)}`;
}

/** Persisted journals from older builds may have a different shape; fall back to the seed. */
export const safeJournal = (raw: unknown): JournalEntry[] =>
  Array.isArray(raw) && raw.every((e) => e && typeof e === "object" && "debit" in e && "credit" in e && "amount" in e && "date" in e && "id" in e)
    ? (raw as JournalEntry[])
    : DEFAULT_JOURNAL;

/** Entries visible on `today` (drafts and posted): the reveal rule. */
export const visibleJournal = (entries: JournalEntry[], today: string) => entries.filter((e) => isRevealed(e.date, today));

/** Entries that count in the ledger on `today`: posted and dated on or before today. */
export const effectiveJournal = (entries: JournalEntry[], today: string) => entries.filter((e) => e.status === "posted" && isRevealed(e.date, today));

/** Newest first: by date, then id (user entries can carry a higher number than later-dated seeds). */
export const byDateDesc = (a: JournalEntry, b: JournalEntry) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id, undefined, { numeric: true });

// ------------------------------------------------------------------
// Period labels (all derived from the demo clock's `today`)
// ------------------------------------------------------------------
/** "1 Jul 2026 – 15 Dec 2026" */
export const periodText = (today: string) => `${formatDate(FY_START)} – ${formatDate(today)}`;

// ------------------------------------------------------------------
// Trial balance & statements
// ------------------------------------------------------------------
export interface TbRow {
  code: string;
  name: string;
  type: AccountType;
  normal: "debit" | "credit";
  /** Closing balance, signed (debit +). */
  net: number;
  /** Movement since OPENING_DATE (= FY to date), signed. */
  movement: number;
  /** Same as movement: the FY starts the day after the opening balances. Kept for callers. */
  ytd: number;
  debit: number;
  credit: number;
}

interface Posting { date: string; debit: string; credit: string; amount: number }

/** Every posting that counts on `today`: Jul–Oct month closes + revealed posted entries. */
function postings(entries: JournalEntry[], today: string): Posting[] {
  const hist: Posting[] = HISTORY.flatMap((h) => h.lines.map(([debit, credit, amount]) => ({ date: `${h.key}-28`, debit, credit, amount })));
  return [...hist, ...effectiveJournal(entries, today)];
}

/** Trial balance on `today` from opening balances + history + posted entries dated ≤ today. */
export function buildTrialBalance(entries: JournalEntry[], today: string): TbRow[] {
  const movement: Record<string, number> = {};
  for (const e of postings(entries, today)) {
    movement[e.debit] = (movement[e.debit] ?? 0) + e.amount;
    movement[e.credit] = (movement[e.credit] ?? 0) - e.amount;
  }
  return ACCOUNTS.map((a) => {
    const mv = movement[a.code] ?? 0;
    const net = signedOpening(a) + mv || 0; // `|| 0` turns −0 (credit-normal zero) into 0
    return { code: a.code, name: a.name, type: a.type, normal: a.normal, net, movement: mv, ytd: mv, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
  });
}

/** Balance shown on the account's normal side (positive when normal). */
export const normalBal = (r: TbRow) => (r.normal === "debit" ? r.net : -r.net) || 0;

export interface ChartMonth { key: string; month: string; label: string; income: number; expense: number }

/** Income vs expenses per month of the current FY, July → today's month (year-aware keys). */
export function monthlyChart(entries: JournalEntry[], today: string): ChartMonth[] {
  const rows: ChartMonth[] = [];
  for (let k: string = FY_START; monthKey(k) <= monthKey(today); k = addMonthsKey(k, 1)) {
    rows.push({ key: monthKey(k), month: monthShort(k), label: monthLabel(k), income: 0, expense: 0 });
  }
  const byKey = new Map(rows.map((r) => [r.key, r]));
  for (const p of postings(entries, today)) {
    const row = byKey.get(monthKey(p.date));
    if (!row) continue;
    // Debit to income reduces it (reversals); credit increases it. Opposite for expenses.
    for (const [code, sign] of [[p.debit, 1], [p.credit, -1]] as const) {
      const t = ACCOUNT_BY_CODE[code]?.type;
      if (t === "income") row.income -= sign * p.amount;
      if (t === "expense") row.expense += sign * p.amount;
    }
  }
  return rows;
}

export interface CashLine { section: string; label: string; amount: number }

export function buildStatements(tb: TbRow[]) {
  const by = (code: string) => tb.find((r) => r.code === code);
  const income: StatementLine[] = tb.filter((r) => r.type === "income").map((r) => ({ label: r.name, amount: normalBal(r) }));
  const expenses: StatementLine[] = tb.filter((r) => r.type === "expense").map((r) => ({ label: r.name, amount: normalBal(r) }));
  const totalIncome = income.reduce((a, l) => a + l.amount, 0);
  const totalExpenses = expenses.reduce((a, l) => a + l.amount, 0);
  const surplus = totalIncome - totalExpenses;

  // Asset lines are debit-signed so the contra allowance shows as a deduction.
  const assets: StatementLine[] = tb.filter((r) => r.type === "asset").map((r) => ({ label: r.normal === "credit" ? `Less: ${r.name.toLowerCase()}` : r.name, amount: r.net }));
  const liabilities: StatementLine[] = tb.filter((r) => r.type === "liability").map((r) => ({ label: r.name, amount: normalBal(r) }));
  const equity: StatementLine[] = tb.filter((r) => r.type === "equity").map((r) => ({ label: r.name, amount: normalBal(r) }));
  const totalAssets = assets.reduce((a, l) => a + l.amount, 0);
  const totalLiabilities = liabilities.reduce((a, l) => a + l.amount, 0);
  const equityBase = equity.reduce((a, l) => a + l.amount, 0);
  // Same balancing line generateBalanceSheet() adds, so preview and PDF agree.
  // With a balanced ledger this is exactly the FY surplus to date.
  const retained = totalAssets - totalLiabilities - equityBase;
  const totalEquity = equityBase + retained;

  // Cash flow for the FY to date (indirect method). Every non-cash account contributes
  // −(its movement since 1 Jul), so the total always equals the change in cash, and the
  // first line is the same surplus the income statement reports.
  const mv = (...codes: string[]) => codes.reduce((a, c) => a + (by(c)?.ytd ?? 0), 0);
  const incomeExpenseCodes = tb.filter((r) => r.type === "income" || r.type === "expense").map((r) => r.code);
  const cash: CashLine[] = [
    { section: "Operating activities", label: "Net surplus for the period", amount: -mv(...incomeExpenseCodes) },
    { section: "Operating activities", label: "Add: depreciation", amount: mv("5400") },
    { section: "Operating activities", label: "Add: loan loss provisions", amount: -mv("1250") },
    { section: "Operating activities", label: "(Increase)/decrease in interest receivable", amount: -mv("1500") },
    { section: "Operating activities", label: "Increase in interest payable & accruals", amount: -mv("2100", "2200") },
    { section: "Operating activities", label: "Increase in member savings deposits", amount: -mv("2000") },
    { section: "Investing activities", label: "Net loans (disbursed)/repaid", amount: -mv("1200") },
    { section: "Investing activities", label: "Investments & fixed deposits", amount: -mv("1300") },
    { section: "Investing activities", label: "Purchase of property & equipment", amount: -mv("1400") - mv("5400") },
    { section: "Financing activities", label: "Share capital subscriptions", amount: -mv("3000") },
    { section: "Financing activities", label: "Dividends & reserve movements", amount: -mv("2300", "3100") },
  ];
  const openingCash = CASH_CODES.reduce((a, c) => a + signedOpening(ACCOUNT_BY_CODE[c]), 0);
  const netCash = cash.reduce((a, l) => a + l.amount, 0);
  const closingCash = CASH_CODES.reduce((a, c) => a + (by(c)?.net ?? 0), 0);

  return { income, expenses, totalIncome, totalExpenses, surplus, assets, liabilities, equity, totalAssets, totalLiabilities, retained, totalEquity, cash, openingCash, netCash, closingCash };
}
export type Statements = ReturnType<typeof buildStatements>;

/** Convenience: trial balance + statements for `today` in one call. */
export function buildLedger(entries: JournalEntry[], today: string) {
  const tb = buildTrialBalance(entries, today);
  return { tb, st: buildStatements(tb) };
}

/** Rows for generateTrialBalance() and CSV export. */
export const trialBalanceRows = (tb: TbRow[]) => tb.map((r) => ({ code: r.code, name: r.name, debit: r.debit, credit: r.credit }));

/** Opening-cash label used by both the on-screen cash flow and its PDF. */
export const CASH_OPENING_LABEL = `Cash at ${formatDate(FY_START)}`;

/**
 * Cash flow as a two-column table (label, amount) — shared by both pages' previews and
 * the generateTablePdf() call, so the screen and the PDF show identical lines.
 * Section headings have an empty amount.
 */
export function cashFlowTable(st: Statements): { rows: [string, number | ""][]; boldRows: number[]; headingRows: number[] } {
  const rows: [string, number | ""][] = [];
  const headingRows: number[] = [];
  let section = "";
  for (const l of st.cash) {
    if (l.section !== section) {
      section = l.section;
      headingRows.push(rows.length);
      rows.push([section, ""]);
    }
    rows.push([l.label, l.amount]);
  }
  const boldRows = [...headingRows, rows.length, rows.length + 2];
  rows.push(["Net increase/(decrease) in cash", st.netCash], [CASH_OPENING_LABEL, st.openingCash], ["Cash at end of period", st.openingCash + st.netCash]);
  return { rows, boldRows, headingRows };
}
