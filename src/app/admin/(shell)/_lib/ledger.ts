// ============================================================
// General ledger shared by Accounting and Reports.
//
// Both pages build the trial balance and financial statements from the SAME chart
// of accounts, opening balances and persisted journal (JOURNAL_KEY), so a figure on
// the Reports page always agrees with the Accounting page — including entries the
// user has posted or reversed.
//
// Plain module: pure data and functions, no React, no browser APIs.
// ============================================================

import type { StatementLine } from "@/lib/pdf-reports";
import { formatDate } from "@/lib/utils";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export interface Account {
  code: string;
  name: string;
  type: AccountType;
  /** Contra accounts (e.g. loan-loss allowance) sit under assets but carry a credit balance. */
  normal: "debit" | "credit";
  /** Balance at OPENING_DATE (30 Sep 2026) on the account's normal side. Income/expense = FY 2026 YTD. */
  opening: number;
  /** Balance at FY_START (1 Jan 2026) on the normal side. Income/expense accounts start the year at zero. */
  jan1: number;
}

/** Financial year start: the cash flow statement runs from here so its surplus equals the YTD income statement. */
export const FY_START = "2026-01-01";
/** Opening balances are struck at this date; journal entries from PERIOD_START onwards are live. */
export const OPENING_DATE = "2026-09-30";
export const PERIOD_START = "2026-10-01";
export const JOURNAL_KEY = "admin_journal_entries";

// Opening balances (UGX). After the seed journal is posted the headline balances match
// ADMIN_KPI: loans 2.15B, member savings 4.82B, share capital 1.28B.
const BASE_ACCOUNTS: Account[] = [
  { code: "1000", name: "Cash on hand", type: "asset", normal: "debit", opening: 60_000_000, jan1: 52_000_000 },
  { code: "1100", name: "Bank — current account", type: "asset", normal: "debit", opening: 760_000_000, jan1: 610_000_000 },
  { code: "1150", name: "Mobile money float", type: "asset", normal: "debit", opening: 38_000_000, jan1: 30_000_000 },
  { code: "1200", name: "Loans to members", type: "asset", normal: "debit", opening: 2_125_000_000, jan1: 1_980_000_000 },
  { code: "1250", name: "Allowance for loan losses", type: "asset", normal: "credit", opening: 43_000_000, jan1: 27_000_000 },
  { code: "1300", name: "Investments & fixed deposits", type: "asset", normal: "debit", opening: 3_200_000_000, jan1: 3_046_000_000 },
  { code: "1400", name: "Property & equipment (net)", type: "asset", normal: "debit", opening: 420_000_000, jan1: 432_000_000 },
  { code: "1500", name: "Interest receivable", type: "asset", normal: "debit", opening: 28_500_000, jan1: 22_000_000 },
  { code: "2000", name: "Member savings deposits", type: "liability", normal: "credit", opening: 4_758_000_000, jan1: 4_520_000_000 },
  { code: "2100", name: "Interest payable on savings", type: "liability", normal: "credit", opening: 42_000_000, jan1: 30_000_000 },
  { code: "2200", name: "Accrued expenses", type: "liability", normal: "credit", opening: 18_000_000, jan1: 15_000_000 },
  { code: "2300", name: "Dividends payable", type: "liability", normal: "credit", opening: 0, jan1: 0 },
  { code: "3000", name: "Share capital", type: "equity", normal: "credit", opening: 1_266_000_000, jan1: 1_180_000_000 },
  { code: "3100", name: "General reserves (b/f)", type: "equity", normal: "credit", opening: 0, jan1: 0 }, // balancing figure, set below
  { code: "4000", name: "Interest income — loans", type: "income", normal: "credit", opening: 310_000_000, jan1: 0 },
  { code: "4100", name: "Investment income", type: "income", normal: "credit", opening: 72_000_000, jan1: 0 },
  { code: "4200", name: "Fees & commissions", type: "income", normal: "credit", opening: 37_000_000, jan1: 0 },
  { code: "5000", name: "Operating expenses", type: "expense", normal: "debit", opening: 48_000_000, jan1: 0 },
  { code: "5100", name: "Staff costs", type: "expense", normal: "debit", opening: 106_500_000, jan1: 0 },
  { code: "5200", name: "Interest on member savings", type: "expense", normal: "debit", opening: 126_000_000, jan1: 0 },
  { code: "5300", name: "Loan loss provision expense", type: "expense", normal: "debit", opening: 16_000_000, jan1: 0 },
  { code: "5400", name: "Depreciation", type: "expense", normal: "debit", opening: 18_000_000, jan1: 0 },
];

const signed = (a: Account, v: number) => (a.normal === "debit" ? v : -v);
/** Signed opening balance at OPENING_DATE: debit positive, credit negative. */
export const signedOpening = (a: Account) => signed(a, a.opening);
const signedJan1 = (a: Account) => signed(a, a.jan1);

// General reserves b/f is whatever makes each opening trial balance balance
// (UGX 400,000,000 credit at both 1 Jan and 30 Sep 2026 — reserves don't move in-year).
export const ACCOUNTS: Account[] = (() => {
  const others = BASE_ACCOUNTS.filter((a) => a.code !== "3100");
  const net = others.reduce((s, a) => s + signedOpening(a), 0);
  const netJan = others.reduce((s, a) => s + signedJan1(a), 0);
  return BASE_ACCOUNTS.map((a) => (a.code === "3100" ? { ...a, opening: net, jan1: netJan } : a));
})();
export const ACCOUNT_BY_CODE: Record<string, Account> = Object.fromEntries(ACCOUNTS.map((a) => [a.code, a]));
export const accountLabel = (code: string) => `${code} · ${ACCOUNT_BY_CODE[code]?.name ?? "Unknown"}`;
export const ACCOUNT_OPTIONS = ACCOUNTS.map((a) => ({ value: a.code, label: accountLabel(a.code) }));
export const CASH_CODES = ["1000", "1100", "1150"];

// Monthly income/expense Jan–Sep 2026; sums equal the income (419M) and expense (314.5M) opening balances.
export const HISTORY = [
  { month: "Jan", income: 42_000_000, expense: 33_000_000 },
  { month: "Feb", income: 43_500_000, expense: 34_000_000 },
  { month: "Mar", income: 44_000_000, expense: 34_500_000 },
  { month: "Apr", income: 45_500_000, expense: 34_000_000 },
  { month: "May", income: 46_000_000, expense: 35_000_000 },
  { month: "Jun", income: 47_000_000, expense: 35_500_000 },
  { month: "Jul", income: 48_500_000, expense: 36_000_000 },
  { month: "Aug", income: 50_000_000, expense: 36_000_000 },
  { month: "Sep", income: 52_500_000, expense: 36_500_000 },
];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

const je = (n: number, date: string, description: string, debit: string, credit: string, amount: number, reference: string, status: "draft" | "posted", by = "Sarah Nakamya"): JournalEntry =>
  ({ id: `JE-2026-${String(n).padStart(4, "0")}`, date, description, debit, credit, amount, reference, status, by });

export const DEFAULT_JOURNAL: JournalEntry[] = [
  je(156, "2026-11-04", "Mobile money collections swept to bank", "1100", "1150", 40_000_000, "SWP-1104", "draft"),
  je(155, "2026-11-03", "Loan loss provision top-up (PAR review)", "5300", "1250", 1_800_000, "PAR-OCT", "draft"),
  je(154, "2026-11-03", "Monthly interest accrual on loans", "1500", "4000", 9_500_000, "SYS-INT-11", "posted", "System"),
  je(153, "2026-11-02", "Internet & IT subscriptions — November", "5000", "1100", 2_600_000, "INV-7781", "posted"),
  je(152, "2026-11-02", "Fixed deposit interest — Stanbic", "1100", "4100", 8_000_000, "BNK-FD-221", "posted", "System"),
  je(151, "2026-11-01", "Loan interest received — November", "1100", "4000", 39_500_000, "LN-INT-11", "posted", "System"),
  je(150, "2026-11-01", "Loan processing fees reclassification", "1150", "4200", 1_500_000, "MJ-0045", "draft"),
  je(149, "2026-10-31", "Interest on member savings accrued — October", "5200", "2100", 14_000_000, "SYS-SAV-10", "posted", "System"),
  je(148, "2026-10-31", "Depreciation — October", "5400", "1400", 2_000_000, "DEP-10", "posted", "System"),
  je(147, "2026-10-31", "Office rent & utilities — October", "5000", "1100", 4_200_000, "INV-7702", "posted"),
  je(146, "2026-10-28", "Staff salaries — October 2026", "5100", "1100", 11_800_000, "PAY-10", "posted"),
  je(145, "2026-10-20", "Share capital subscriptions — October", "1100", "3000", 14_000_000, "SHR-10", "posted"),
  je(144, "2026-10-15", "Member savings deposits via mobile money", "1150", "2000", 62_000_000, "MM-BATCH-10", "posted", "System"),
  je(143, "2026-10-05", "Loan disbursements — October batch", "1200", "1100", 175_000_000, "DISB-10", "posted"),
  je(142, "2026-10-01", "Loan interest received — October", "1100", "4000", 38_000_000, "LN-INT-10", "posted", "System"),
  je(141, "2026-10-01", "Loan principal repayments — October", "1100", "1200", 150_000_000, "LN-PRN-10", "posted", "System"),
];

export const nextJeId = (entries: JournalEntry[]) => {
  const max = entries.reduce((m, e) => Math.max(m, Number(e.id.split("-").pop()) || 0), 0);
  return `JE-2026-${String(max + 1).padStart(4, "0")}`;
};

/** Persisted journals from older builds may have a different shape; fall back to the seed. */
export const safeJournal = (raw: unknown): JournalEntry[] =>
  Array.isArray(raw) && raw.every((e) => e && typeof e === "object" && "debit" in e && "credit" in e && "amount" in e) ? (raw as JournalEntry[]) : DEFAULT_JOURNAL;

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
  /** Posted journal movement since OPENING_DATE, signed. */
  movement: number;
  /** Movement since FY_START (1 Jan), signed. */
  ytd: number;
  debit: number;
  credit: number;
}

/** Trial balance from opening balances + POSTED entries. */
export function buildTrialBalance(entries: JournalEntry[]): TbRow[] {
  const movement: Record<string, number> = {};
  for (const e of entries) {
    if (e.status !== "posted") continue;
    movement[e.debit] = (movement[e.debit] ?? 0) + e.amount;
    movement[e.credit] = (movement[e.credit] ?? 0) - e.amount;
  }
  return ACCOUNTS.map((a) => {
    const mv = movement[a.code] ?? 0;
    const net = signedOpening(a) + mv;
    return { code: a.code, name: a.name, type: a.type, normal: a.normal, net, movement: mv, ytd: net - signedJan1(a), debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
  });
}

/** Balance shown on the account's normal side (positive when normal). */
export const normalBal = (r: TbRow) => (r.normal === "debit" ? r.net : -r.net);

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
  // With a balanced ledger this is exactly the FY 2026 surplus to date.
  const retained = totalAssets - totalLiabilities - equityBase;
  const totalEquity = equityBase + retained;

  // Cash flow for FY 2026 to date (indirect method). Every non-cash account contributes
  // −(its movement since 1 Jan), so the total always equals the change in cash, and the
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
  const openingCash = CASH_CODES.reduce((a, c) => a + signedJan1(ACCOUNT_BY_CODE[c]), 0);
  const netCash = cash.reduce((a, l) => a + l.amount, 0);
  const closingCash = CASH_CODES.reduce((a, c) => a + (by(c)?.net ?? 0), 0);

  return { income, expenses, totalIncome, totalExpenses, surplus, assets, liabilities, equity, totalAssets, totalLiabilities, retained, totalEquity, cash, openingCash, netCash, closingCash };
}
export type Statements = ReturnType<typeof buildStatements>;

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
