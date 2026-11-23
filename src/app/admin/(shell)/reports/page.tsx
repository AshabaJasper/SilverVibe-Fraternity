"use client";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3, CalendarClock, ChevronDown, Clock, CreditCard, Download, Edit2, Eye, FileSpreadsheet,
  FileText, Loader2, PiggyBank, Plus, Power, Printer, Search, Shield, Trash2, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal, { Button, ConfirmDialog, FormField, SelectInput, TextInput } from "@/components/Modal";
import { Badge, EmptyState, PageHeader, StatCard, Tabs } from "@/components/ui";
import { usePersistedState, showToast } from "@/lib/storage";
import { useAuthStore } from "@/lib/store";
import { exportToCsv, printArea } from "@/lib/export";
import { generateBalanceSheet, generateIncomeStatement, generateTablePdf, generateTrialBalance } from "@/lib/pdf-reports";
import {
  ADMIN_KPI, ADMIN_LOAN_APPLICATIONS, ADMIN_MEMBERS_LIST, ADMIN_PRODUCT_DISTRIBUTION, DEMO_ADMIN, PORTFOLIO_QUALITY,
  loanPerformance, memberGrowth,
} from "@/lib/mock-data";
import { cn, formatCurrency, formatDate, formatDateTime, formatNumber, parseDate, uid } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import {
  ANCHOR, addMonthsKey, daysBetween, demoNowISO, fyOf, fyStartOf, isRevealed, monthKey, monthLabel, monthShort, useDemoToday,
} from "@/lib/demo-clock";
import {
  DEFAULT_JOURNAL, JOURNAL_KEY, buildLedger, cashFlowTable, normalBal, periodText, safeJournal, trialBalanceRows,
  type JournalEntry, type Statements, type TbRow,
} from "../_lib/ledger";

/* ============================================================
 * Report catalog
 * ============================================================ */
type Generator =
  | "income" | "balance" | "cashflow" | "trial" | "savings" | "loans" | "par" | "members" | "custom";
type CsvKind = "members" | "loans" | "savings";

interface ReportDef {
  id: string;
  name: string;
  desc: string;
  frequency: string;
  gen: Generator;
  csv?: CsvKind;
  /** On-demand reports: the last manual run in the story. Scheduled ones derive it from the clock (see lastRunOn). */
  last?: string;
  /** Run day for quarterly reports (day of Jan/Apr/Jul/Oct). */
  runDay?: number;
}

interface Category {
  title: string;
  icon: LucideIcon;
  color: string;
  reports: ReportDef[];
}

const CATEGORIES: Category[] = [
  {
    title: "Financial Reports", icon: BarChart3, color: "#4A90D9",
    reports: [
      { id: "income", name: "Income Statement", desc: "Revenue and expense summary", frequency: "Monthly", gen: "income" },
      { id: "balance", name: "Statement of Financial Position", desc: "Balance sheet: assets, liabilities and equity", frequency: "Monthly", gen: "balance" },
      { id: "cashflow", name: "Cash Flow Statement", desc: "Operating, investing and financing flows", frequency: "Monthly", gen: "cashflow" },
      { id: "trial", name: "Trial Balance", desc: "All general-ledger account balances", frequency: "Daily", gen: "trial" },
    ],
  },
  {
    title: "Savings Reports", icon: PiggyBank, color: "#22c55e",
    reports: [
      { id: "savings", name: "Savings Portfolio Summary", desc: "Balances and share of portfolio by product", frequency: "Monthly", gen: "savings", csv: "savings" },
      { id: "dormant", name: "Dormant Accounts", desc: "Accounts with no activity for over 6 months", frequency: "Quarterly", gen: "custom", runDay: 1 },
      { id: "interest", name: "Interest Computation", desc: "Monthly interest accrual per member", frequency: "Monthly", gen: "custom" },
    ],
  },
  {
    title: "Loan Reports", icon: CreditCard, color: "#f59e0b",
    reports: [
      { id: "loans", name: "Loan Portfolio Report", desc: "Disbursements, recoveries and borrowers", frequency: "Monthly", gen: "loans", csv: "loans" },
      { id: "par", name: "Portfolio at Risk (PAR)", desc: "Outstanding loans by ageing bucket", frequency: "Weekly", gen: "par" },
      { id: "disbursement", name: "Disbursement Report", desc: "Loans disbursed during the period", frequency: "Monthly", gen: "custom" },
      { id: "collection", name: "Collection Report", desc: "Loan repayments received", frequency: "Daily", gen: "custom" },
      { id: "arrears", name: "Arrears Report", desc: "Overdue loans and follow-up status", frequency: "Weekly", gen: "custom" },
    ],
  },
  {
    title: "Member Reports", icon: Users, color: "#a855f7",
    reports: [
      { id: "register", name: "Member Register", desc: "Complete list of members with balances", frequency: "On demand", gen: "members", csv: "members", last: "2026-10-28" },
      { id: "registrations", name: "New Registrations", desc: "Members registered during the period", frequency: "Monthly", gen: "custom" },
      { id: "kyc", name: "KYC Compliance", desc: "Member KYC verification status", frequency: "Quarterly", gen: "custom", runDay: 1 },
    ],
  },
  {
    title: "Regulatory Reports", icon: Shield, color: "#ef4444",
    reports: [
      { id: "umra", name: "UMRA Quarterly Return", desc: "Uganda Microfinance Regulatory Authority submission", frequency: "Quarterly", gen: "custom", runDay: 5 },
      { id: "aml", name: "AML/CTF Report", desc: "Suspicious transaction reporting", frequency: "Monthly", gen: "custom" },
      { id: "capital", name: "Capital Adequacy", desc: "Regulatory capital ratios", frequency: "Quarterly", gen: "custom", runDay: 5 },
    ],
  },
];

const ALL_REPORTS = CATEGORIES.flatMap((c) => c.reports.map((r) => ({ ...r, category: c.title.replace(" Reports", "") })));
type CatalogReport = (typeof ALL_REPORTS)[number];
const findReport = (id: string) => ALL_REPORTS.find((r) => r.id === id);

/* ---------- report data (one spec drives both the on-screen preview and the PDF) ---------- */
type Cell = string | number;
interface ReportSection {
  heading?: string;
  columns: string[];
  rows: Cell[][];
  boldRows?: number[];
  numericCols?: number[];
}
interface ReportSpec {
  title: string;
  summary: [string, string][];
  sections: ReportSection[];
  orientation?: "portrait" | "landscape";
}
/** Ledger snapshot the financial statements are built from (same as Accounting), on the demo `today`. */
interface Ledger { tb: TbRow[]; st: Statements; today: string }

const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;
const memberBySv = (sv: string) => ADMIN_MEMBERS_LIST.find((m) => m.sv_number === sv);

/* ---------- date helpers (all relative to the demo clock's `today`) ---------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (date: string, n: number) => {
  const d = parseDate(date.slice(0, 10));
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
/** "Jun–Nov 2026" or "Sep 2026–Feb 2027" for a run of YYYY-MM keys. */
function monthRange(keys: string[]): string {
  if (!keys.length) return "—";
  const a = `${keys[0]}-01`;
  const b = `${keys[keys.length - 1]}-01`;
  return a.slice(0, 4) === b.slice(0, 4) ? `${monthShort(a)}–${monthLabel(b)}` : `${monthLabel(a)}–${monthLabel(b)}`;
}
const FQ_MONTHS = ["Jul–Sep", "Oct–Dec", "Jan–Mar", "Apr–Jun"];
/** Last COMPLETED quarter of the July–June fiscal year, e.g. "Q1 FY 2026/27 (Jul–Sep)". */
function lastCompletedQuarter(today: string): string {
  const prev = addMonthsKey(today, -3); // any date in the previous quarter
  const fyMonth = (Number(prev.slice(5, 7)) + 5) % 12; // Jul → 0 … Jun → 11
  const q = Math.floor(fyMonth / 3);
  return `Q${q + 1} ${fyOf(prev)} (${FQ_MONTHS[q]})`;
}

/**
 * When a catalogue report last ran on `today`: scheduled frequencies are derived from the
 * clock (daily = today, weekly = the latest Monday, monthly = the 1st of this month,
 * quarterly = run day of Jan/Apr/Jul/Oct); on-demand reports keep their story date.
 */
function lastRunOn(r: ReportDef, today: string): string {
  if (r.frequency === "Daily") return today;
  if (r.frequency === "Weekly") return addDays(today, -((parseDate(today).getDay() + 6) % 7));
  if (r.frequency === "Monthly") return `${monthKey(today)}-01`;
  if (r.frequency === "Quarterly") {
    const day = pad2(r.runDay ?? 1);
    for (let i = 0; i < 4; i++) {
      const first = addMonthsKey(today, -i);
      const d = `${monthKey(first)}-${day}`;
      if ([1, 4, 7, 10].includes(Number(first.slice(5, 7))) && d <= today) return d;
    }
  }
  return r.last ?? today;
}

// Savings product rates (% p.a.) — the same rates the Savings page uses.
const PRODUCT_RATES: Record<string, number> = { "Regular Savings": 5, "Flexi/Wallet": 3, "Fixed Savings": 12, "Young Savers": 6, "Loan Guarantee": 3 };
// Last account activity for dormant / at-risk members (dormancy = no activity for 6+ months).
// SV-0095's last activity is the cash deposit flagged in the AML report.
const LAST_ACTIVITY: Record<string, string> = { "SV-0067": "2026-03-14", "SV-0095": "2026-09-30" };
// Borrowers in arrears: the date the missed installment fell due, and dated follow-ups
// (each shows once its date arrives; the latest revealed one is the current status).
const ARREARS: Record<string, { since: string; steps: [string, string][] }> = {
  "SV-0095": {
    since: "2026-09-10",
    steps: [
      ["2026-09-25", "SMS reminder sent 25 Sep"],
      ["2026-10-14", "Guarantors notified"],
      ["2026-11-02", "Account suspended · referred to recovery"],
      ["2026-12-01", "In recovery · arrears reminder SMS sent 1 Dec"],
      ["2027-01-15", "Recovery agent assigned · collateral review"],
      ["2027-02-10", "Recovery agent: part-payment plan proposed"],
    ],
  },
  "SV-0034": {
    since: "2026-11-05",
    steps: [
      ["2026-11-20", "SMS reminder sent 20 Nov"],
      ["2026-12-01", "Arrears reminder SMS sent 1 Dec"],
      ["2026-12-08", "Guarantor (Peter Okello) notified"],
      ["2027-01-12", "Demand letter issued"],
      ["2027-02-09", "Referred to credit committee"],
    ],
  },
};
function arrearsStatus(sv: string, today: string): { days: number; action: string } {
  const a = ARREARS[sv];
  if (!a || a.since > today) return { days: 0, action: "Current" };
  const step = a.steps.filter(([d]) => d <= today).pop();
  return { days: daysBetween(a.since, today), action: step?.[1] ?? "Follow-up pending" };
}
// Cash transactions at or above the reporting threshold (FIA large cash transaction reports),
// authored across the story; each appears once its date arrives.
const LCT_THRESHOLD = 20_000_000;
const LARGE_CASH_TXNS: { date: string; sv: string; type: string; channel: string; amount: number; status: string }[] = [
  { date: "2027-02-22", sv: "SV-0056", type: "Deposit", channel: "Cash — Kampala branch", amount: 20_500_000, status: "LCTR filed" },
  { date: "2027-02-08", sv: "SV-0089", type: "Deposit", channel: "Cash — Kampala branch", amount: 26_000_000, status: "LCTR filed" },
  { date: "2027-01-26", sv: "SV-0012", type: "Deposit", channel: "Cash — Kampala branch", amount: 21_000_000, status: "LCTR filed" },
  { date: "2027-01-11", sv: "SV-0001", type: "Deposit", channel: "Cash — Kampala branch", amount: 30_000_000, status: "LCTR filed" },
  { date: "2026-12-21", sv: "SV-0056", type: "Withdrawal", channel: "Cash — Kampala branch", amount: 22_000_000, status: "LCTR filed" },
  { date: "2026-12-04", sv: "SV-0089", type: "Deposit", channel: "Cash — Kampala branch", amount: 28_000_000, status: "LCTR filed" },
  { date: "2026-11-20", sv: "SV-0012", type: "Deposit", channel: "Cash — Kampala branch", amount: 24_000_000, status: "LCTR filed" },
  { date: "2026-11-03", sv: "SV-0089", type: "Deposit", channel: "Cash — Kampala branch", amount: 32_000_000, status: "LCTR filed" },
  { date: "2026-10-27", sv: "SV-0056", type: "Deposit", channel: "Cash — Kampala branch", amount: 25_000_000, status: "LCTR filed" },
  { date: "2026-10-19", sv: "SV-0012", type: "Withdrawal", channel: "Cash — Kampala branch", amount: 21_500_000, status: "LCTR filed" },
  { date: "2026-10-08", sv: "SV-0001", type: "Deposit", channel: "Cash — Kampala branch", amount: 20_000_000, status: "LCTR filed" },
  { date: "2026-09-30", sv: "SV-0095", type: "Deposit", channel: "Cash — Kampala branch", amount: 19_800_000, status: "Below threshold · structuring review" },
];
/** Suspicious transaction reports filed with the FIA (dates). */
const STR_FILED = ["2026-10-06"];

function buildSpec(r: CatalogReport, { tb, st, today }: Ledger): ReportSpec {
  const bal = (code: string) => {
    const row = tb.find((x) => x.code === code);
    return row ? normalBal(row) : 0;
  };
  // Six months of loan activity ending in today's month (year-aware keys).
  const perf = loanPerformance(today);
  const perfRange = monthRange(perf.map((m) => m.key));
  const perfLabel = (key: string) => monthLabel(`${key}-01`);
  switch (r.gen) {
    // ---- Financial statements: same lines/ordering the pdf-reports generators print ----
    case "income":
      return {
        title: "Income Statement",
        summary: [["Total income", formatCurrency(st.totalIncome)], ["Total expenses", formatCurrency(st.totalExpenses)], ["Net surplus", formatCurrency(st.surplus)]],
        sections: [
          { heading: "Income", columns: ["Line item", "Amount (UGX)"], rows: [...st.income.map((l) => [l.label, l.amount]), ["Total income", st.totalIncome]], boldRows: [st.income.length], numericCols: [1] },
          { heading: "Expenses", columns: ["Line item", "Amount (UGX)"], rows: [...st.expenses.map((l) => [l.label, l.amount]), ["Total expenses", st.totalExpenses], ["Net surplus", st.surplus]], boldRows: [st.expenses.length, st.expenses.length + 1], numericCols: [1] },
        ],
      };
    case "balance": {
      const eqLines = [...st.equity, { label: "Retained surplus & reserves", amount: st.retained }];
      return {
        title: "Statement of Financial Position",
        summary: [["Total assets", formatCurrency(st.totalAssets)], ["Total liabilities", formatCurrency(st.totalLiabilities)], ["Total equity", formatCurrency(st.totalEquity)]],
        sections: [
          { heading: "Assets", columns: ["Account", "Amount (UGX)"], rows: [...st.assets.map((l) => [l.label, l.amount]), ["Total assets", st.totalAssets]], boldRows: [st.assets.length], numericCols: [1] },
          { heading: "Liabilities", columns: ["Account", "Amount (UGX)"], rows: [...st.liabilities.map((l) => [l.label, l.amount]), ["Total liabilities", st.totalLiabilities]], boldRows: [st.liabilities.length], numericCols: [1] },
          { heading: "Equity", columns: ["Account", "Amount (UGX)"], rows: [...eqLines.map((l) => [l.label, l.amount]), ["Total equity", st.totalEquity], ["Liabilities + equity", st.totalLiabilities + st.totalEquity]], boldRows: [eqLines.length, eqLines.length + 1], numericCols: [1] },
        ],
      };
    }
    case "cashflow": {
      const cf = cashFlowTable(st);
      return {
        title: "Cash Flow Statement",
        summary: [["Net surplus (= income statement)", formatCurrency(st.surplus)], ["Net increase in cash", formatCurrency(st.netCash)], ["Closing cash & bank", formatCurrency(st.openingCash + st.netCash)]],
        sections: [{ columns: ["Item", "Amount (UGX)"], rows: cf.rows, boldRows: cf.boldRows, numericCols: [1] }],
      };
    }
    case "trial": {
      const rows = trialBalanceRows(tb);
      const td = rows.reduce((a, x) => a + x.debit, 0);
      const tc = rows.reduce((a, x) => a + x.credit, 0);
      return {
        title: "Trial Balance",
        summary: [["Total debits", formatCurrency(td)], ["Total credits", formatCurrency(tc)], ["Status", td === tc ? "Balanced" : `Out of balance by ${formatCurrency(Math.abs(td - tc))}`]],
        sections: [{ columns: ["Code", "Account", "Debit (UGX)", "Credit (UGX)"], rows: [...rows.map((x) => [x.code, x.name, x.debit || "-", x.credit || "-"]), ["", "Totals", td, tc]], boldRows: [rows.length], numericCols: [2, 3] }],
      };
    }

    // ---- Operational reports ----
    case "savings": {
      const total = ADMIN_PRODUCT_DISTRIBUTION.reduce((a, p) => a + p.value, 0);
      return {
        title: "Savings Portfolio Summary",
        summary: [["Total savings", formatCurrency(total)], ["Growth (month)", `${ADMIN_KPI.total_savings.change}%`]],
        sections: [{ columns: ["Product", "Balance (UGX)", "Share of portfolio"], rows: [...ADMIN_PRODUCT_DISTRIBUTION.map((p) => [p.name, p.value, pct((p.value / total) * 100)]), ["Total", total, "100%"]], boldRows: [ADMIN_PRODUCT_DISTRIBUTION.length], numericCols: [1, 2] }],
      };
    }
    case "loans":
      return {
        title: "Loan Portfolio Report",
        summary: [["Gross loan book", formatCurrency(ADMIN_KPI.total_loan_book.value)], ["PAR > 30 days", `${ADMIN_KPI.par_30.value}%`]],
        sections: [
          { heading: `Disbursements vs recoveries (${perfRange})`, columns: ["Month", "Disbursed (UGX)", "Recovered (UGX)"], rows: perf.map((m) => [perfLabel(m.key), m.disbursed, m.recovered]), numericCols: [1, 2] },
          { heading: "Borrowers", columns: ["SV No.", "Member", "Outstanding (UGX)"], rows: ADMIN_MEMBERS_LIST.filter((m) => m.loans > 0).map((m) => [m.sv_number, m.name, m.loans]), numericCols: [2] },
        ],
      };
    case "par":
      return {
        title: "Portfolio at Risk (PAR) Report",
        summary: [["PAR > 30 days", `${ADMIN_KPI.par_30.value}%`]],
        sections: [{ columns: ["Ageing bucket", "Amount (UGX)", "% of portfolio"], rows: PORTFOLIO_QUALITY.map((p) => [p.category, p.amount, `${p.percent}%`]), numericCols: [1, 2] }],
      };
    case "members":
      return {
        title: "Member Register",
        orientation: "landscape",
        summary: [["Members listed", String(ADMIN_MEMBERS_LIST.length)]],
        sections: [{ columns: ["SV No.", "Name", "Phone", "Status", "KYC", "Savings", "Loans", "Shares", "Joined"], rows: ADMIN_MEMBERS_LIST.map((m) => [m.sv_number, m.name, m.phone, m.status, m.kyc, m.savings, m.loans, m.shares, formatDate(m.joined)]), numericCols: [5, 6, 7] }],
      };
  }

  // ---- Catalogue reports with their own layouts ----
  switch (r.id) {
    case "dormant": {
      const dormant = ADMIN_MEMBERS_LIST.filter((m) => m.status === "dormant");
      const atRisk = ADMIN_MEMBERS_LIST.filter((m) => m.status === "suspended");
      const row = (m: (typeof ADMIN_MEMBERS_LIST)[number]) => [m.sv_number, m.name, m.phone, LAST_ACTIVITY[m.sv_number] ? formatDate(LAST_ACTIVITY[m.sv_number]) : "—", m.savings, m.shares];
      const cols = ["SV No.", "Member", "Phone", "Last activity", "Savings (UGX)", "Shares (UGX)"];
      return {
        title: "Dormant Accounts",
        summary: [
          ["Dormant members (whole register)", formatNumber(ADMIN_KPI.total_members.dormant)],
          ["Dormant in this extract", String(dormant.length)],
          ["Savings held in dormant accounts", formatCurrency(dormant.reduce((a, m) => a + m.savings, 0))],
        ],
        sections: [
          { heading: "Dormant — no activity for 6+ months", columns: cols, rows: dormant.map(row), numericCols: [4, 5] },
          { heading: "Watch list — suspended accounts", columns: cols, rows: atRisk.map(row), numericCols: [4, 5] },
        ],
      };
    }
    case "interest": {
      const products = ADMIN_PRODUCT_DISTRIBUTION.map((p) => ({ name: p.name, balance: p.value, rate: PRODUCT_RATES[p.name] ?? 0 }));
      const monthly = (b: number, rate: number) => Math.round((b * rate) / 100 / 12);
      const total = products.reduce((a, p) => a + monthly(p.balance, p.rate), 0);
      const totalBal = products.reduce((a, p) => a + p.balance, 0);
      const regRate = PRODUCT_RATES["Regular Savings"];
      const members = ADMIN_MEMBERS_LIST.filter((m) => m.savings > 0);
      return {
        title: "Interest Computation",
        summary: [["Savings balances", formatCurrency(totalBal)], ["Monthly interest accrual", formatCurrency(total)], ["Method", "Balance × annual rate ÷ 12"]],
        sections: [
          { heading: `By product — ${monthLabel(today, true)}`, columns: ["Product", "Balance (UGX)", "Rate p.a.", "Monthly interest (UGX)"], rows: [...products.map((p) => [p.name, p.balance, `${p.rate}%`, monthly(p.balance, p.rate)]), ["Total", totalBal, "", total]], boldRows: [products.length], numericCols: [1, 2, 3] },
          { heading: `Member accruals (savings balance at ${regRate}% p.a.)`, columns: ["SV No.", "Member", "Savings (UGX)", "Monthly interest (UGX)"], rows: members.map((m) => [m.sv_number, m.name, m.savings, monthly(m.savings, regRate)]), numericCols: [2, 3] },
        ],
      };
    }
    case "disbursement": {
      const total = perf.reduce((a, m) => a + m.disbursed, 0);
      const approved = ADMIN_LOAN_APPLICATIONS.filter((a) => a.status === "approved" && isRevealed(a.applied_date, today));
      return {
        title: "Disbursement Report",
        summary: [[`Disbursed (${perfRange})`, formatCurrency(total)], ["Average per month", formatCurrency(Math.round(total / Math.max(1, perf.length)))], ["Approved, awaiting disbursement", String(approved.length)]],
        sections: [
          { heading: "Monthly disbursements", columns: ["Month", "Disbursed (UGX)", "Share of period"], rows: [...perf.map((m) => [perfLabel(m.key), m.disbursed, pct((m.disbursed / total) * 100)]), ["Total", total, "100%"]], boldRows: [perf.length], numericCols: [1, 2] },
          { heading: "Approved applications", columns: ["SV No.", "Member", "Product", "Term", "Amount (UGX)"], rows: approved.map((a) => [a.sv, a.member, a.product, a.term, a.amount]), numericCols: [4] },
        ],
      };
    }
    case "collection": {
      const total = perf.reduce((a, m) => a + m.recovered, 0);
      const mc = ADMIN_KPI.monthly_collections;
      return {
        title: "Collection Report",
        summary: [[`Collected (${perfRange})`, formatCurrency(total)], [`${monthLabel(today)} vs target`, `${formatCurrency(mc.value)} of ${formatCurrency(mc.target)} (${mc.percent}%)`]],
        sections: [
          { heading: "Loan repayments received", columns: ["Month", "Disbursed (UGX)", "Recovered (UGX)", "Recovery ratio"], rows: [...perf.map((m) => [perfLabel(m.key), m.disbursed, m.recovered, pct((m.recovered / m.disbursed) * 100)]), ["Total", perf.reduce((a, m) => a + m.disbursed, 0), total, ""]], boldRows: [perf.length], numericCols: [1, 2, 3] },
          { heading: "Monthly collections target", columns: ["Measure", "Amount (UGX)"], rows: [["Target", mc.target], ["Collected", mc.value], ["Shortfall", mc.target - mc.value]], boldRows: [2], numericCols: [1] },
        ],
      };
    }
    case "arrears": {
      const buckets = PORTFOLIO_QUALITY.filter((p) => p.category !== "Current");
      const arrears = buckets.reduce((a, p) => a + p.amount, 0);
      const borrowers = ADMIN_MEMBERS_LIST.filter((m) => m.loans > 0);
      return {
        title: "Arrears Report",
        summary: [["Loans in arrears", formatCurrency(arrears)], ["PAR > 30 days", `${ADMIN_KPI.par_30.value}%`], ["Borrowers reviewed", String(borrowers.length)]],
        sections: [
          { heading: "Arrears by ageing bucket", columns: ["Bucket", "Outstanding (UGX)", "% of portfolio"], rows: [...buckets.map((p) => [p.category, p.amount, `${p.percent}%`]), ["Total in arrears", arrears, `${buckets.reduce((a, p) => a + p.percent, 0)}%`]], boldRows: [buckets.length], numericCols: [1, 2] },
          { heading: `Borrower follow-up — as at ${formatDate(today)}`, columns: ["SV No.", "Member", "Outstanding (UGX)", "Days in arrears", "Follow-up"], rows: borrowers.map((m) => { const f = arrearsStatus(m.sv_number, today); return [m.sv_number, m.name, m.loans, f.days, f.action]; }), numericCols: [2, 3] },
        ],
      };
    }
    case "registrations": {
      // Registrations in the current fiscal year (July–June), and 12 months of growth ending this month.
      const fy = fyOf(today);
      const joined = ADMIN_MEMBERS_LIST.filter((m) => m.joined >= fyStartOf(today) && m.joined <= today);
      const series = memberGrowth(today);
      const growth = series.map((g, i) => [monthLabel(`${g.key}-01`), g.members, i === 0 ? "—" : g.members - series[i - 1].members]);
      const net = series[series.length - 1].members - series[0].members;
      return {
        title: "New Registrations",
        summary: [["Members now", formatNumber(ADMIN_KPI.total_members.value)], [`Net new since ${monthLabel(`${series[0].key}-01`)}`, formatNumber(net)], [`Joined in ${fy} (this extract)`, String(joined.length)]],
        sections: [
          { heading: `Members registered in ${fy}`, columns: ["SV No.", "Member", "Joined", "Status", "KYC"], rows: joined.map((m) => [m.sv_number, m.name, formatDate(m.joined), m.status, m.kyc]) },
          { heading: "Membership growth", columns: ["Month", "Members", "Net new"], rows: growth, numericCols: [1, 2] },
        ],
      };
    }
    case "kyc": {
      const statuses = Array.from(new Set(ADMIN_MEMBERS_LIST.map((m) => m.kyc)));
      const n = ADMIN_MEMBERS_LIST.length;
      const outstanding = ADMIN_MEMBERS_LIST.filter((m) => m.kyc !== "verified");
      const verified = n - outstanding.length;
      return {
        title: "KYC Compliance",
        summary: [["Members reviewed", String(n)], ["Verified", `${verified} (${pct((verified / n) * 100, 0)})`], ["Outstanding", String(outstanding.length)]],
        sections: [
          { heading: "By KYC status", columns: ["Status", "Members", "Share"], rows: statuses.map((s) => { const c = ADMIN_MEMBERS_LIST.filter((m) => m.kyc === s).length; return [s[0].toUpperCase() + s.slice(1), c, pct((c / n) * 100, 0)]; }), numericCols: [1, 2] },
          { heading: "Members with outstanding KYC", columns: ["SV No.", "Member", "KYC status", "Member status", "Phone"], rows: outstanding.map((m) => [m.sv_number, m.name, m.kyc, m.status, m.phone]) },
        ],
      };
    }
    case "umra": {
      const loans = bal("1200");
      const deposits = bal("2000");
      const liquid = bal("1000") + bal("1100") + bal("1150");
      const capital = st.totalEquity;
      const parAmount = PORTFOLIO_QUALITY.filter((p) => /31|61|90/.test(p.category)).reduce((a, p) => a + p.amount, 0);
      const ratios: [string, number, string, boolean][] = [
        ["Core capital / total assets", (capital / st.totalAssets) * 100, "≥ 10%", capital / st.totalAssets >= 0.1],
        ["Liquid assets / member deposits", (liquid / deposits) * 100, "≥ 10%", liquid / deposits >= 0.1],
        ["Loans / member deposits", (loans / deposits) * 100, "≤ 80%", loans / deposits <= 0.8],
        ["Portfolio at risk > 30 days", ADMIN_KPI.par_30.value, "≤ 5%", ADMIN_KPI.par_30.value <= 5],
        ["Loan-loss allowance / PAR > 30", (bal("1250") / parAmount) * 100, "Monitor", true],
      ];
      return {
        title: "UMRA Quarterly Return",
        summary: [["Return period", `${lastCompletedQuarter(today)}, updated to ${formatDate(today)}`], ["Total assets", formatCurrency(st.totalAssets)], ["Ratios within limits", `${ratios.filter((x) => x[3]).length} of ${ratios.length}`]],
        sections: [
          { heading: "Prudential ratios", columns: ["Ratio", "Value", "Requirement", "Status"], rows: ratios.map(([label, v, req, ok]) => [label, pct(v), req, ok ? "Compliant" : "Breach"]), numericCols: [1] },
          { heading: "Key balances", columns: ["Item", "Amount (UGX)"], rows: [["Gross loans to members", loans], ["Member savings deposits", deposits], ["Cash, bank & mobile money", liquid], ["Core capital (share capital + reserves + surplus)", capital], ["Total assets", st.totalAssets]], numericCols: [1] },
        ],
      };
    }
    case "aml": {
      // Trailing three calendar months up to today; future-dated transactions stay hidden.
      const from = addMonthsKey(today, -2);
      const inWindow = LARGE_CASH_TXNS.filter((t) => t.date >= from && isRevealed(t.date, today));
      const reportable = inWindow.filter((t) => t.amount >= LCT_THRESHOLD);
      const flagged = LARGE_CASH_TXNS.filter((t) => t.amount < LCT_THRESHOLD && isRevealed(t.date, today));
      const strs = STR_FILED.filter((d) => monthKey(d) === monthKey(today) && isRevealed(d, today)).length;
      const row = (t: (typeof LARGE_CASH_TXNS)[number]) => [formatDate(t.date), t.sv, memberBySv(t.sv)?.name ?? t.sv, t.type, t.amount, t.status];
      return {
        title: "AML/CTF Report",
        summary: [["Large cash threshold", formatCurrency(LCT_THRESHOLD)], [`Reportable transactions (${monthRange([monthKey(from), monthKey(today)])})`, String(reportable.length)], ["Under review", String(flagged.length)], ["Suspicious transaction reports", `${strs} filed in ${monthLabel(today)}`]],
        sections: [
          { heading: `Cash transactions ≥ ${formatCurrency(LCT_THRESHOLD)}`, columns: ["Date", "SV No.", "Member", "Type", "Amount (UGX)", "Status"], rows: reportable.map(row), numericCols: [4] },
          { heading: "Flagged for review (possible structuring)", columns: ["Date", "SV No.", "Member", "Type", "Amount (UGX)", "Status"], rows: flagged.map(row), numericCols: [4] },
        ],
      };
    }
    case "capital": {
      const share = bal("3000");
      const reserves = bal("3100");
      const capital = share + reserves + st.retained;
      const ratio = (capital / st.totalAssets) * 100;
      const institutional = ((reserves + st.retained) / st.totalAssets) * 100;
      return {
        title: "Capital Adequacy",
        summary: [["Capital adequacy ratio", pct(ratio)], ["Regulatory minimum", "10.0%"], ["Status", ratio >= 10 ? "Adequately capitalised" : "Below minimum"]],
        sections: [
          { heading: "Regulatory capital", columns: ["Component", "Amount (UGX)"], rows: [["Share capital", share], ["General reserves", reserves], ["Current-year surplus", st.retained], ["Total capital", capital], ["Total assets", st.totalAssets]], boldRows: [3], numericCols: [1] },
          { heading: "Ratios", columns: ["Ratio", "Value", "Minimum"], rows: [["Total capital / total assets", pct(ratio), "10.0%"], ["Institutional capital (reserves + surplus) / total assets", pct(institutional), "Monitor"]], numericCols: [1, 2] },
        ],
      };
    }
  }
  return { title: r.name, summary: [], sections: [] };
}

/** Subtitle printed under the title — identical on screen and in the PDF. */
function reportSubtitle(r: CatalogReport, today: string) {
  if (r.gen === "income") return `${fyOf(today)} · for the period ended ${formatDate(today)}`;
  if (r.gen === "cashflow") return `${fyOf(today)} · for the period ${periodText(today)}`;
  return `${r.category} · ${fyOf(today)} · as at ${formatDate(today)}`;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function runPdf(r: CatalogReport, ledger: Ledger, subtitle: string) {
  const { tb, st } = ledger;
  // The three named statements use the shared generators with the ledger's lines.
  if (r.gen === "income") return generateIncomeStatement(st.income, st.expenses);
  if (r.gen === "balance") return generateBalanceSheet(st.assets, st.liabilities, st.equity);
  if (r.gen === "trial") return generateTrialBalance(trialBalanceRows(tb));
  // Everything else (cash flow included) prints the exact spec the preview shows.
  const spec = buildSpec(r, ledger);
  return generateTablePdf({
    title: spec.title,
    subtitle,
    filename: `${slug(spec.title)}-${ledger.today}`,
    summary: spec.summary,
    orientation: spec.orientation,
    sections: spec.sections.map((s) => ({ ...s, rows: s.rows.map((row, i) => (r.gen === "cashflow" && !s.boldRows?.includes(i) ? [`   ${row[0]}`, ...row.slice(1)] : row)) })),
  });
}

function runCsv(kind: CsvKind) {
  if (kind === "members") {
    exportToCsv("member-register", ADMIN_MEMBERS_LIST, [
      { key: "sv_number", label: "SV No." }, { key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" },
      { key: "status", label: "Status" }, { key: "kyc", label: "KYC" }, { key: "savings", label: "Savings (UGX)" },
      { key: "loans", label: "Loans (UGX)" }, { key: "shares", label: "Shares (UGX)" }, { key: "joined", label: "Joined" },
    ]);
  } else if (kind === "loans") {
    exportToCsv("loan-portfolio", ADMIN_MEMBERS_LIST.filter((m) => m.loans > 0), [
      { key: "sv_number", label: "SV No." }, { key: "name", label: "Member" }, { key: "status", label: "Member status" }, { key: "loans", label: "Outstanding (UGX)" },
    ]);
  } else {
    const total = ADMIN_PRODUCT_DISTRIBUTION.reduce((a, p) => a + p.value, 0);
    exportToCsv("savings-summary", ADMIN_PRODUCT_DISTRIBUTION.map((p) => ({ product: p.name, balance: p.value, share: `${((p.value / total) * 100).toFixed(1)}%` })), [
      { key: "product", label: "Product" }, { key: "balance", label: "Balance (UGX)" }, { key: "share", label: "Share of portfolio" },
    ]);
  }
}

/** Stable pseudo file size so the list looks realistic without measuring the blob. */
function fileSize(reportId: string, format: "PDF" | "CSV") {
  const h = [...reportId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
  return format === "PDF" ? `${90 + (h % 320)} KB` : `${4 + (h % 40)} KB`;
}

/* ============================================================
 * Persisted records
 * ============================================================ */
interface RecentReport {
  id: string;
  report_id: string;
  name: string;
  category: string;
  generated_at: string;
  generated_by: string;
  format: "PDF" | "CSV";
  size: string;
}

type Frequency = "daily" | "weekly" | "monthly" | "quarterly";
interface Schedule {
  id: string;
  report_id: string;
  frequency: Frequency;
  /** weekday 0–6 for weekly, day of month 1–28 for monthly/quarterly */
  day: number;
  time: string;
  recipients: string;
  format: "PDF" | "CSV" | "PDF + CSV";
  enabled: boolean;
}

// Generation history across the story (Sep 2026 → Feb 2027). Future-dated rows are hidden
// until their date (reveal rule); monthly statements run on the 1st, the trial balance daily.
const SYS_RUN = "System (scheduled)";
const SARAH = "Sarah Nakamya";
const rr = (id: string, report_id: string, generated_at: string, generated_by: string, format: "PDF" | "CSV" = "PDF"): RecentReport => {
  const def = ALL_REPORTS.find((r) => r.id === report_id);
  return { id, report_id, name: def?.name ?? report_id, category: def?.category ?? "Financial", generated_at, generated_by, format, size: fileSize(report_id, format) };
};
const SEED_RECENT: RecentReport[] = [
  rr("rr-2702d", "income", "2027-02-15T10:20:00", SARAH),
  rr("rr-2702c", "cashflow", "2027-02-15T10:15:00", SARAH),
  rr("rr-2702b", "balance", "2027-02-15T10:10:00", SARAH),
  rr("rr-2702a", "income", "2027-02-01T07:00:00", SYS_RUN),
  rr("rr-2701c", "register", "2027-01-19T14:30:00", SARAH, "CSV"),
  rr("rr-2701b", "umra", "2027-01-05T15:40:00", SARAH),
  rr("rr-2701a", "income", "2027-01-01T07:00:00", SYS_RUN),
  rr("rr-2612c", "capital", "2026-12-11T16:05:00", SARAH),
  rr("rr-2612b", "loans", "2026-12-11T15:50:00", SARAH),
  rr("rr-2612a", "income", "2026-12-01T07:00:00", SYS_RUN),
  rr("rr-2611f", "trial", "2026-11-23T06:00:00", SYS_RUN),
  rr("rr-2611e", "par", "2026-11-23T08:00:00", SYS_RUN),
  rr("rr-2611d", "arrears", "2026-11-20T11:45:00", SARAH),
  rr("rr-2611c", "par", "2026-11-16T08:00:00", SYS_RUN),
  rr("rr-2611b", "aml", "2026-11-03T12:10:00", SARAH),
  rr("rr-2611a", "income", "2026-11-01T07:00:00", SYS_RUN),
  rr("rr-2610c", "register", "2026-10-28T11:05:00", SARAH, "CSV"),
  rr("rr-2610b", "umra", "2026-10-05T15:40:00", SARAH),
  rr("rr-2610a", "income", "2026-10-01T07:00:00", SYS_RUN),
  rr("rr-2609a", "income", "2026-09-01T07:00:00", SYS_RUN),
];

const SEED_SCHEDULES: Schedule[] = [
  { id: "sch-1", report_id: "collection", frequency: "daily", day: 1, time: "06:00", recipients: "loans@silvervibe.coop", format: "PDF", enabled: true },
  { id: "sch-2", report_id: "par", frequency: "weekly", day: 1, time: "08:00", recipients: "board@silvervibe.coop", format: "PDF", enabled: true },
  { id: "sch-3", report_id: "income", frequency: "monthly", day: 1, time: "07:00", recipients: "admin@silvervibe.coop, finance@silvervibe.coop", format: "PDF", enabled: true },
  { id: "sch-4", report_id: "umra", frequency: "quarterly", day: 5, time: "09:00", recipients: "compliance@silvervibe.coop", format: "PDF + CSV", enabled: false },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Sentence-case description; keeps proper names (weekdays, months) capitalised. */
function describeSchedule(s: Schedule) {
  const t = s.time ? ` at ${s.time}` : "";
  if (s.frequency === "daily") return `Every day${t}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[s.day] ?? "Monday"}${t}`;
  if (s.frequency === "monthly") return `The ${ordinal(s.day)} of every month${t}`;
  return `The ${ordinal(s.day)} of Jan, Apr, Jul and Oct${t}`;
}

/** Next run strictly after `now`. */
function nextRun(s: Schedule, now: Date): Date {
  const [hh, mm] = s.time.split(":").map(Number);
  const at = (y: number, m: number, d: number) => new Date(y, m, d, hh || 0, mm || 0);
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (s.frequency === "daily") {
    const c = at(y, m, d);
    return c > now ? c : at(y, m, d + 1);
  }
  if (s.frequency === "weekly") {
    const diff = (s.day - now.getDay() + 7) % 7;
    const c = at(y, m, d + diff);
    return c > now ? c : at(y, m, d + diff + 7);
  }
  const step = s.frequency === "monthly" ? 1 : 3;
  // Quarterly runs in Jan/Apr/Jul/Oct; monthly in every month.
  let month = s.frequency === "monthly" ? m : m - (m % 3);
  for (let i = 0; i < 6; i++, month += step) {
    const c = at(y, month, s.day);
    if (c > now) return c;
  }
  return at(y, month, s.day);
}

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Persisted list that falls back to seed data if an older build stored a different shape. */
function hasField<T>(arr: unknown, field: keyof T): arr is T[] {
  return Array.isArray(arr) && arr.every((x) => x && typeof x === "object" && field in x);
}
function useSafeList<T>(key: string, seed: T[], field: keyof T) {
  const [raw, setRaw] = usePersistedState<T[]>(key, seed);
  const list = hasField<T>(raw, field) ? raw : seed;
  const update = useCallback(
    (fn: (prev: T[]) => T[]) => setRaw((prev) => fn(hasField<T>(prev, field) ? prev : seed)),
    [setRaw, seed, field]
  );
  return [list, update] as const;
}

/* ============================================================
 * Module-level presentational pieces
 * ============================================================ */
/** Numbers print without the "UGX" prefix (it's in the column header) so tables fit at 390px. */
const fmtCell = (c: Cell) => (typeof c === "number" ? formatNumber(Math.round(c)) : c);

function PreviewTables({ spec }: { spec: ReportSpec }) {
  return (
    <div className="space-y-5">
      {spec.summary.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {spec.summary.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b dm-border py-1">
              <dt className="dm-text-secondary">{k}</dt>
              <dd className="font-semibold dm-text text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {spec.sections.map((s, i) => {
        const numeric = new Set(s.numericCols ?? []);
        const bold = new Set(s.boldRows ?? []);
        return (
          <div key={i}>
            {s.heading && <p className="text-sm font-semibold mb-2">{s.heading}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] sm:text-xs border-collapse">
                <thead>
                  <tr>
                    {s.columns.map((c, j) => (
                      <th key={j} className={cn("py-2 px-1.5 sm:px-2 border-b dm-border font-semibold", numeric.has(j) ? "text-right" : "text-left")}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.length === 0 ? (
                    <tr><td colSpan={s.columns.length} className="py-3 px-2 text-center dm-text-secondary">No records for this period</td></tr>
                  ) : s.rows.map((row, k) => (
                    <tr key={k} className={cn(bold.has(k) && "font-semibold")}>
                      {row.map((cell, j) => (
                        <td key={j} className={cn("py-1.5 px-1.5 sm:px-2 border-b dm-border", numeric.has(j) ? "text-right whitespace-nowrap tabular-nums" : "text-left", j === 0 && "min-w-[7rem]")}>{fmtCell(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type TabId = "catalog" | "recent" | "scheduled";
const TAB_IDS: TabId[] = ["catalog", "recent", "scheduled"];
const REPORT_OPTIONS = ALL_REPORTS.map((r) => ({ value: r.id, label: `${r.name} (${r.category})` }));
const EMPTY_SCHEDULE: Schedule = { id: "", report_id: "income", frequency: "monthly", day: 1, time: "07:00", recipients: "", format: "PDF", enabled: true };

/* ============================================================
 * Page
 * ============================================================ */
export default function AdminReportsPage() {
  return (
    <Suspense>
      <ReportsInner />
    </Suspense>
  );
}

function ReportsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const tabParam = params.get("tab") as TabId | null;
  const tab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "catalog";
  const setTab = (t: TabId) => router.replace(`/admin/reports?tab=${t}`, { scroll: false });

  // Demo clock: ANCHOR on the server/first paint, then the visitor's date clamped to the story window.
  const today = useDemoToday();
  // Versioned key: the history is re-authored across Sep 2026 → Feb 2027.
  const [allRecent, setRecent] = useSafeList<RecentReport>("admin_recent_reports_v2", SEED_RECENT, "report_id");
  // Reveal rule: future-dated history rows appear once their date arrives. Newest first.
  const recent = useMemo(
    () => allRecent.filter((r) => isRevealed(r.generated_at, today)).sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
    [allRecent, today]
  );
  // Same persisted journal and reveal rule as the Accounting page, so the statements agree.
  const [journal] = usePersistedState<JournalEntry[]>(JOURNAL_KEY, DEFAULT_JOURNAL);
  const ledger = useMemo<Ledger>(() => ({ ...buildLedger(safeJournal(journal), today), today }), [journal, today]);
  const [schedules, setSchedules] = useSafeList<Schedule>("admin_scheduled_reports", SEED_SCHEDULES, "frequency");

  const [expanded, setExpanded] = useState<string[]>(["Financial Reports"]);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null); // "<reportId>:<format>" while generating
  const [preview, setPreview] = useState<CatalogReport | null>(null);
  const [recentDelete, setRecentDelete] = useState<RecentReport | null>(null);
  const [schedDraft, setSchedDraft] = useState<Schedule | null>(null);
  const [schedErr, setSchedErr] = useState<string | null>(null);
  const [schedDelete, setSchedDelete] = useState<Schedule | null>(null);

  // Before hydration use the anchor date so server and client render the same text; after
  // that, the current time on the demo clock (real time, date clamped to the story window).
  const now = hydrated ? new Date(demoNowISO()) : parseDate(ANCHOR);

  /** Latest generation per catalog report: the later of the schedule-derived run and the visible history. */
  const lastGenerated = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of ALL_REPORTS) map[r.id] = lastRunOn(r, today);
    for (const r of recent) if (!map[r.report_id] || r.generated_at.slice(0, 10) > map[r.report_id]) map[r.report_id] = r.generated_at.slice(0, 10);
    return map;
  }, [recent, today]);

  const generatedBy = user?.name ?? DEMO_ADMIN.full_name;

  const record = (r: CatalogReport, format: "PDF" | "CSV") => {
    const entry: RecentReport = {
      id: uid("rr"), report_id: r.id, name: r.name, category: r.category, generated_at: demoNowISO(),
      generated_by: generatedBy, format, size: fileSize(r.id, format),
    };
    setRecent((prev) => [entry, ...prev].slice(0, 50));
  };

  const generate = async (r: CatalogReport, opts: { log: boolean } = { log: true }) => {
    if (busy) return;
    setBusy(`${r.id}:PDF`);
    try {
      await runPdf(r, ledger, reportSubtitle(r, today));
      if (opts.log) record(r, "PDF");
      showToast(`${r.name} downloaded`);
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setBusy(null);
    }
  };

  const downloadCsv = (r: CatalogReport, opts: { log: boolean } = { log: true }) => {
    if (!r.csv) return;
    runCsv(r.csv);
    if (opts.log) record(r, "CSV");
    showToast(`${r.name} exported as CSV`);
  };

  const redownload = (rr: RecentReport) => {
    const r = findReport(rr.report_id);
    if (!r) return showToast("This report is no longer in the catalog", "error");
    if (rr.format === "CSV" && r.csv) downloadCsv(r, { log: false });
    else void generate(r, { log: false });
  };

  /* ---------- catalog filtering ---------- */
  const q = query.trim().toLowerCase();
  const visibleCategories = CATEGORIES.filter((c) => catFilter === "all" || c.title === catFilter)
    .map((c) => ({ ...c, reports: c.reports.filter((r) => !q || `${r.name} ${r.desc}`.toLowerCase().includes(q)) }))
    .filter((c) => c.reports.length > 0);

  /* ---------- schedules ---------- */
  const openSchedule = (s?: Schedule) => {
    setSchedDraft(s ? { ...s } : { ...EMPTY_SCHEDULE, recipients: user?.email ?? DEMO_ADMIN.email });
    setSchedErr(null);
  };
  const saveSchedule = () => {
    if (!schedDraft) return;
    const emails = schedDraft.recipients.split(/[,;\s]+/).filter(Boolean);
    if (emails.length === 0) return setSchedErr("Add at least one recipient email.");
    const bad = emails.find((e) => !isEmail(e));
    if (bad) return setSchedErr(`"${bad}" is not a valid email address.`);
    if (!/^\d{2}:\d{2}$/.test(schedDraft.time)) return setSchedErr("Choose a run time.");
    const clean = { ...schedDraft, recipients: emails.join(", ") };
    const name = findReport(clean.report_id)?.name ?? "Report";
    if (clean.id) {
      setSchedules((prev) => prev.map((s) => (s.id === clean.id ? clean : s)));
      showToast(`Schedule for ${name} updated`);
    } else {
      setSchedules((prev) => [...prev, { ...clean, id: uid("sch") }]);
      showToast(`${name} scheduled: ${describeSchedule(clean)}`);
    }
    setSchedDraft(null);
  };
  const toggleSchedule = (s: Schedule) => {
    setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
    showToast(`${findReport(s.report_id)?.name ?? "Schedule"} ${s.enabled ? "disabled" : "enabled"}`, s.enabled ? "info" : "success");
  };

  const pdfCount = recent.filter((r) => r.format === "PDF").length;
  const thisMonth = recent.filter((r) => monthKey(r.generated_at) === monthKey(today)).length;
  const activeSchedules = schedules.filter((s) => s.enabled);
  const upcoming = activeSchedules.map((s) => nextRun(s, now)).sort((a, b) => a.getTime() - b.getTime())[0];

  const tabs = [
    { id: "catalog" as const, label: "Report Catalog", count: ALL_REPORTS.length },
    { id: "recent" as const, label: "Recently Generated", count: recent.length },
    { id: "scheduled" as const, label: "Scheduled", count: schedules.length },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Generate, download, print and schedule SACCO reports"
        actions={<Button onClick={() => { setTab("scheduled"); openSchedule(); }}><Plus className="w-4 h-4" /> New Schedule</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Reports in catalog" value={ALL_REPORTS.length} sub={`${CATEGORIES.length} categories`} icon={FileText} />
        <StatCard label={`Generated in ${monthLabel(today)}`} value={thisMonth} sub={`${pdfCount} PDF · ${recent.length - pdfCount} CSV in history`} icon={Download} color="#22c55e" />
        <StatCard label="Active schedules" value={activeSchedules.length} sub={`${schedules.length - activeSchedules.length} disabled`} icon={CalendarClock} color="#f59e0b" />
        <StatCard label="Next scheduled run" value={upcoming ? formatDate(upcoming) : "—"} sub={upcoming ? formatDateTime(upcoming).split(", ")[1] ?? "" : "No active schedules"} icon={Clock} color="#a855f7" />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ================= Catalog ================= */}
      {tab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 dm-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <TextInput value={query} onChange={setQuery} placeholder="Search reports…" className="pl-9" aria-label="Search reports" />
            </div>
            <div className="sm:w-56">
              <SelectInput
                value={catFilter}
                onChange={setCatFilter}
                options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.title, label: c.title }))]}
              />
            </div>
          </div>

          {visibleCategories.length === 0 ? (
            <div className="glass-card rounded-xl">
              <EmptyState icon={Search} title="No reports match" hint="Try a different search or category." action={<Button variant="secondary" onClick={() => { setQuery(""); setCatFilter("all"); }}>Clear filters</Button>} />
            </div>
          ) : (
            visibleCategories.map((cat) => {
              // While searching, show matches without needing to expand each category.
              const isOpen = !!q || catFilter !== "all" || expanded.includes(cat.title);
              return (
                <div key={cat.title} className="glass-card rounded-xl overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded((prev) => (prev.includes(cat.title) ? prev.filter((t) => t !== cat.title) : [...prev, cat.title]))}
                    className="w-full px-5 py-4 flex items-center justify-between hover:dm-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}1a` }}>
                        <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold dm-text text-sm">{cat.title}</h3>
                        <p className="text-xs dm-text-secondary">{cat.reports.length} report{cat.reports.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 dm-text-secondary transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="border-t dm-border">
                      {cat.reports.map((def) => {
                        const r = findReport(def.id)!;
                        const last = lastGenerated[r.id] ?? lastRunOn(r, today);
                        const pdfBusy = busy === `${r.id}:PDF`;
                        return (
                          <div key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dm-border last:border-0 hover:dm-surface-hover">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium dm-text">{r.name}</p>
                              <p className="text-xs dm-text-secondary">{r.desc}</p>
                              <div className="flex gap-3 mt-1 text-[11px] dm-text-secondary">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.frequency}</span>
                                <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Last generated {formatDate(last.slice(0, 10))}</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button className="px-3 py-1.5 text-xs rounded-lg" disabled={!!busy} onClick={() => generate(r)}>
                                {pdfBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                {pdfBusy ? "Generating…" : "Generate PDF"}
                              </Button>
                              {r.csv && (
                                <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => downloadCsv(r)}>
                                  <FileSpreadsheet className="w-3 h-3" /> CSV
                                </Button>
                              )}
                              <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => setPreview(r)} aria-label={`Preview ${r.name}`}>
                                <Eye className="w-3 h-3" /> Preview
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= Recently generated ================= */}
      {tab === "recent" && (
        <div className="glass-card rounded-xl overflow-hidden">
          {recent.length === 0 ? (
            <EmptyState icon={FileText} title="No reports generated yet" hint="Generate one from the catalog." action={<Button variant="secondary" onClick={() => setTab("catalog")}>Open catalog</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dm-surface-hover border-b dm-border">
                    {["Report", "Category", "Generated by", "Date", "Format", "Size"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">{h}</th>
                    ))}
                    <th className="text-center px-4 py-3 text-xs font-semibold dm-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((rr) => {
                    const def = findReport(rr.report_id);
                    return (
                      <tr key={rr.id} className="border-b dm-border last:border-0 hover:dm-surface-hover">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {rr.format === "PDF" ? <FileText className="w-4 h-4 text-[#ef4444]" /> : <FileSpreadsheet className="w-4 h-4 text-[#16a34a]" />}
                            <span className="text-xs font-medium dm-text">{rr.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs dm-text-secondary">{rr.category}</td>
                        <td className="px-4 py-3 text-xs dm-text-secondary">{rr.generated_by}</td>
                        <td className="px-4 py-3 text-xs dm-text-secondary whitespace-nowrap">{formatDateTime(rr.generated_at)}</td>
                        <td className="px-4 py-3"><Badge status={rr.format} tone={rr.format === "PDF" ? "red" : "green"} className="uppercase" /></td>
                        <td className="px-4 py-3 text-xs dm-text-secondary">{rr.size}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" title="Download again" aria-label={`Download ${rr.name}`} disabled={!!busy} onClick={() => redownload(rr)} className="p-1.5 rounded-lg hover:dm-surface-hover disabled:opacity-40">
                              {busy === `${rr.report_id}:PDF` ? <Loader2 className="w-3.5 h-3.5 animate-spin dm-text-secondary" /> : <Download className="w-3.5 h-3.5 dm-text-secondary" />}
                            </button>
                            <button type="button" title="Print" aria-label={`Print ${rr.name}`} disabled={!def} onClick={() => def && setPreview(def)} className="p-1.5 rounded-lg hover:dm-surface-hover disabled:opacity-40">
                              <Printer className="w-3.5 h-3.5 dm-text-secondary" />
                            </button>
                            <button type="button" title="Delete" aria-label={`Delete ${rr.name}`} onClick={() => setRecentDelete(rr)} className="p-1.5 rounded-lg hover:bg-[#ef4444]/10">
                              <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= Scheduled ================= */}
      {tab === "scheduled" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openSchedule()}><Plus className="w-4 h-4" /> New Schedule</Button>
          </div>
          {schedules.length === 0 ? (
            <div className="glass-card rounded-xl">
              <EmptyState icon={CalendarClock} title="No scheduled reports" hint="Schedule a report to be emailed automatically." action={<Button variant="secondary" onClick={() => openSchedule()}>New schedule</Button>} />
            </div>
          ) : (
            schedules.map((s) => {
              const def = findReport(s.report_id);
              return (
                <div key={s.id} className={cn("glass-card rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3", !s.enabled && "opacity-70")}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold dm-text text-sm">{def?.name ?? "Unknown report"}</h3>
                      <Badge status={s.enabled ? "active" : "disabled"} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs dm-text-secondary">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {describeSchedule(s)}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {s.format}</span>
                      <span className="flex items-center gap-1 break-all"><Users className="w-3 h-3 shrink-0" /> {s.recipients}</span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> Next run: {s.enabled ? formatDateTime(nextRun(s, now)) : "paused"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => openSchedule(s)}><Edit2 className="w-3 h-3" /> Edit</Button>
                    <Button variant="secondary" className={cn("px-3 py-1.5 text-xs rounded-lg", s.enabled ? "text-[#d97706]" : "text-[#16a34a]")} onClick={() => toggleSchedule(s)}>
                      <Power className="w-3 h-3" /> {s.enabled ? "Disable" : "Enable"}
                    </Button>
                    <button type="button" aria-label="Delete schedule" title="Delete" onClick={() => setSchedDelete(s)} className="p-2 rounded-lg border dm-border hover:bg-[#ef4444]/10">
                      <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= Modals ================= */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.name} — preview` : "Preview"}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>Close</Button>
            {preview && (
              <Button variant="secondary" disabled={!!busy} onClick={() => generate(preview)}>
                {busy === `${preview.id}:PDF` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
              </Button>
            )}
            <Button onClick={printArea}><Printer className="w-4 h-4" /> Print</Button>
          </>
        }
      >
        {preview && (
          <div id="print-area">
            <p className="text-xs opacity-70">SilverVibe Fraternity Cooperative Society Ltd</p>
            <h2 className="text-lg font-bold">{buildSpec(preview, ledger).title}</h2>
            <p className="text-xs opacity-70 mb-4">{reportSubtitle(preview, today)}</p>
            <PreviewTables spec={buildSpec(preview, ledger)} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!recentDelete}
        onClose={() => setRecentDelete(null)}
        onConfirm={() => {
          if (!recentDelete) return;
          setRecent((prev) => prev.filter((r) => r.id !== recentDelete.id));
          showToast("Removed from history", "info");
        }}
        title="Remove report"
        message={<>Remove <b>{recentDelete?.name}</b> ({recentDelete && formatDateTime(recentDelete.generated_at)}) from the history?</>}
        confirmLabel="Remove"
        danger
      />

      <Modal
        open={!!schedDraft}
        onClose={() => setSchedDraft(null)}
        title={schedDraft?.id ? "Edit schedule" : "New schedule"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSchedDraft(null)}>Cancel</Button>
            <Button variant="accent" onClick={saveSchedule}>{schedDraft?.id ? "Save Schedule" : "Create Schedule"}</Button>
          </>
        }
      >
        {schedDraft && (
          <div className="space-y-4">
            <FormField label="Report" required>
              <SelectInput value={schedDraft.report_id} onChange={(v) => setSchedDraft({ ...schedDraft, report_id: v })} options={REPORT_OPTIONS} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Frequency">
                <SelectInput
                  value={schedDraft.frequency}
                  onChange={(v) => setSchedDraft({ ...schedDraft, frequency: v as Frequency, day: 1 })}
                  options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }]}
                />
              </FormField>
              {schedDraft.frequency === "weekly" && (
                <FormField label="Day of week">
                  <SelectInput value={String(schedDraft.day)} onChange={(v) => setSchedDraft({ ...schedDraft, day: Number(v) })} options={WEEKDAYS.map((w, i) => ({ value: String(i), label: w }))} />
                </FormField>
              )}
              {(schedDraft.frequency === "monthly" || schedDraft.frequency === "quarterly") && (
                <FormField label="Day of month">
                  <SelectInput value={String(schedDraft.day)} onChange={(v) => setSchedDraft({ ...schedDraft, day: Number(v) })} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) }))} />
                </FormField>
              )}
              <FormField label="Time" required>
                <TextInput type="time" value={schedDraft.time} onChange={(v) => setSchedDraft({ ...schedDraft, time: v })} />
              </FormField>
            </div>
            <FormField label="Recipients" required hint="Comma-separated email addresses">
              <TextInput value={schedDraft.recipients} onChange={(v) => { setSchedDraft({ ...schedDraft, recipients: v }); setSchedErr(null); }} placeholder="board@silvervibe.coop, admin@silvervibe.coop" />
            </FormField>
            <FormField label="Format">
              <SelectInput
                value={schedDraft.format}
                onChange={(v) => setSchedDraft({ ...schedDraft, format: v as Schedule["format"] })}
                options={[{ value: "PDF", label: "PDF" }, { value: "CSV", label: "CSV" }, { value: "PDF + CSV", label: "PDF + CSV" }]}
              />
            </FormField>
            <p className="text-xs dm-text-secondary">
              {describeSchedule(schedDraft)}
              {schedDraft.time ? ` · next run ${formatDateTime(nextRun(schedDraft, now))}` : " · choose a run time to see the next run"}
            </p>
            {schedErr && <p className="text-xs text-[#ef4444]" role="alert">{schedErr}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!schedDelete}
        onClose={() => setSchedDelete(null)}
        onConfirm={() => {
          if (!schedDelete) return;
          setSchedules((prev) => prev.filter((s) => s.id !== schedDelete.id));
          showToast("Schedule deleted", "info");
        }}
        title="Delete schedule"
        message={<>Stop sending <b>{schedDelete && findReport(schedDelete.report_id)?.name}</b>? It is currently scheduled for: {schedDelete && describeSchedule(schedDelete)}.</>}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
