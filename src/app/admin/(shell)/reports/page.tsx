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
import {
  generateBalanceSheet, generateCashFlow, generateCustomReport, generateIncomeStatement, generateLoanPortfolio,
  generateMemberRegister, generatePARReport, generateSavingsSummary, generateTrialBalance,
} from "@/lib/pdf-reports";
import type { StatementLine } from "@/lib/pdf-reports";
import {
  ADMIN_KPI, ADMIN_LOAN_PERFORMANCE, ADMIN_MEMBERS_LIST, ADMIN_PRODUCT_DISTRIBUTION, DEMO_ADMIN, DEMO_TODAY, PORTFOLIO_QUALITY,
} from "@/lib/mock-data";
import { cn, formatCurrency, formatDate, formatDateTime, formatNumber, parseDate, uid, useHydrated } from "@/lib/utils";

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
  /** Seed "last generated" date; replaced by the latest entry in Recently Generated. */
  last: string;
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
      { id: "income", name: "Income Statement", desc: "Revenue and expense summary", frequency: "Monthly", gen: "income", last: "2026-11-01" },
      { id: "balance", name: "Statement of Financial Position", desc: "Balance sheet: assets, liabilities and equity", frequency: "Monthly", gen: "balance", last: "2026-11-01" },
      { id: "cashflow", name: "Cash Flow Statement", desc: "Operating, investing and financing flows", frequency: "Monthly", gen: "cashflow", last: "2026-11-01" },
      { id: "trial", name: "Trial Balance", desc: "All general-ledger account balances", frequency: "Daily", gen: "trial", last: "2026-11-04" },
    ],
  },
  {
    title: "Savings Reports", icon: PiggyBank, color: "#22c55e",
    reports: [
      { id: "savings", name: "Savings Portfolio Summary", desc: "Balances and share of portfolio by product", frequency: "Monthly", gen: "savings", csv: "savings", last: "2026-11-01" },
      { id: "dormant", name: "Dormant Accounts", desc: "Accounts with no activity for over 6 months", frequency: "Quarterly", gen: "custom", last: "2026-10-01" },
      { id: "interest", name: "Interest Computation", desc: "Monthly interest accrual per member", frequency: "Monthly", gen: "custom", last: "2026-11-03" },
    ],
  },
  {
    title: "Loan Reports", icon: CreditCard, color: "#f59e0b",
    reports: [
      { id: "loans", name: "Loan Portfolio Report", desc: "Disbursements, recoveries and borrowers", frequency: "Monthly", gen: "loans", csv: "loans", last: "2026-11-01" },
      { id: "par", name: "Portfolio at Risk (PAR)", desc: "Outstanding loans by ageing bucket", frequency: "Weekly", gen: "par", last: "2026-11-02" },
      { id: "disbursement", name: "Disbursement Report", desc: "Loans disbursed during the period", frequency: "Monthly", gen: "custom", last: "2026-11-01" },
      { id: "collection", name: "Collection Report", desc: "Loan repayments received", frequency: "Daily", gen: "custom", last: "2026-11-04" },
      { id: "arrears", name: "Arrears Report", desc: "Overdue loans and follow-up status", frequency: "Weekly", gen: "custom", last: "2026-11-02" },
    ],
  },
  {
    title: "Member Reports", icon: Users, color: "#a855f7",
    reports: [
      { id: "register", name: "Member Register", desc: "Complete list of members with balances", frequency: "On demand", gen: "members", csv: "members", last: "2026-10-28" },
      { id: "registrations", name: "New Registrations", desc: "Members registered during the period", frequency: "Monthly", gen: "custom", last: "2026-11-01" },
      { id: "kyc", name: "KYC Compliance", desc: "Member KYC verification status", frequency: "Quarterly", gen: "custom", last: "2026-10-01" },
    ],
  },
  {
    title: "Regulatory Reports", icon: Shield, color: "#ef4444",
    reports: [
      { id: "umra", name: "UMRA Quarterly Return", desc: "Uganda Microfinance Regulatory Authority submission", frequency: "Quarterly", gen: "custom", last: "2026-10-05" },
      { id: "aml", name: "AML/CTF Report", desc: "Suspicious transaction reporting", frequency: "Monthly", gen: "custom", last: "2026-11-01" },
      { id: "capital", name: "Capital Adequacy", desc: "Regulatory capital ratios", frequency: "Quarterly", gen: "custom", last: "2026-10-05" },
    ],
  },
];

const ALL_REPORTS = CATEGORIES.flatMap((c) => c.reports.map((r) => ({ ...r, category: c.title.replace(" Reports", "") })));
type CatalogReport = (typeof ALL_REPORTS)[number];
const findReport = (id: string) => ALL_REPORTS.find((r) => r.id === id);

/* ---------- report data (shared by PDF generation and the print preview) ---------- */
const INCOME: StatementLine[] = [
  { label: "Interest income — loans", amount: 412_500_000 },
  { label: "Interest income — investments", amount: 96_000_000 },
  { label: "Membership & entrance fees", amount: 18_400_000 },
  { label: "Loan processing fees", amount: 31_200_000 },
];
const EXPENSES: StatementLine[] = [
  { label: "Interest on member savings", amount: 168_000_000 },
  { label: "Salaries & benefits", amount: 142_000_000 },
  { label: "Office rent & utilities", amount: 38_600_000 },
  { label: "Loan loss provision", amount: 21_500_000 },
  { label: "Administration & IT", amount: 26_900_000 },
];
const ASSETS: StatementLine[] = [
  { label: "Cash & bank balances", amount: 610_000_000 },
  { label: "Loans to members (net)", amount: ADMIN_KPI.total_loan_book.value - 43_000_000 },
  { label: "Investments & fixed deposits", amount: 2_980_000_000 },
  { label: "Property & equipment", amount: 340_000_000 },
  { label: "Other receivables", amount: 63_000_000 },
];
const LIABILITIES: StatementLine[] = [
  { label: "Member savings deposits", amount: ADMIN_KPI.total_savings.value },
  { label: "Accrued interest payable", amount: 42_000_000 },
  { label: "Other payables", amount: 38_000_000 },
];
const EQUITY: StatementLine[] = [{ label: "Share capital", amount: ADMIN_KPI.total_share_capital.value }];
const CASH_FLOW: StatementLine[] = [
  { label: "Net surplus", amount: 163_100_000 },
  { label: "Add: loan loss provision", amount: 21_500_000 },
  { label: "Increase in member savings", amount: 320_000_000 },
  { label: "Net loans disbursed", amount: -170_000_000 },
  { label: "Purchase of equipment", amount: -24_000_000 },
  { label: "New share capital", amount: 142_000_000 },
];
const sum = (lines: StatementLine[]) => lines.reduce((a, l) => a + l.amount, 0);
// Balanced trial balance derived from the statement lines above.
const TRIAL_BALANCE = (() => {
  const rows = [
    ...ASSETS.map((l, i) => ({ code: `1${i + 1}00`, name: l.label, debit: l.amount, credit: 0 })),
    ...LIABILITIES.map((l, i) => ({ code: `2${i + 1}00`, name: l.label, debit: 0, credit: l.amount })),
    ...EQUITY.map((l, i) => ({ code: `3${i + 1}00`, name: l.label, debit: 0, credit: l.amount })),
    ...INCOME.map((l, i) => ({ code: `4${i + 1}00`, name: l.label, debit: 0, credit: l.amount })),
    ...EXPENSES.map((l, i) => ({ code: `5${i + 1}00`, name: l.label, debit: l.amount, credit: 0 })),
  ];
  const diff = rows.reduce((a, r) => a + r.debit - r.credit, 0);
  rows.push({ code: "3900", name: "Retained surplus & reserves", debit: diff < 0 ? -diff : 0, credit: diff > 0 ? diff : 0 });
  return rows;
})();

const KPI_ROWS: (string | number)[][] = [
  ["Total members", formatNumber(ADMIN_KPI.total_members.value)],
  ["Active members", formatNumber(ADMIN_KPI.total_members.active)],
  ["Total savings", formatCurrency(ADMIN_KPI.total_savings.value)],
  ["Loan book", formatCurrency(ADMIN_KPI.total_loan_book.value)],
  ["Share capital", formatCurrency(ADMIN_KPI.total_share_capital.value)],
  ["PAR > 30 days", `${ADMIN_KPI.par_30.value}%`],
  ["Monthly collections", formatCurrency(ADMIN_KPI.monthly_collections.value)],
];

interface PreviewSection {
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
}

const money = (n: number) => formatCurrency(n);
const linesSection = (heading: string, lines: StatementLine[], totalLabel: string): PreviewSection => ({
  heading, columns: ["Line item", "Amount"], rows: [...lines.map((l) => [l.label, money(l.amount)]), [totalLabel, money(sum(lines))]],
});

/** On-screen version of each report, used for the print preview. */
function previewSections(r: CatalogReport): PreviewSection[] {
  switch (r.gen) {
    case "income":
      return [linesSection("Income", INCOME, "Total income"), linesSection("Expenses", EXPENSES, "Total expenses"),
        { columns: ["", ""], rows: [["Net surplus", money(sum(INCOME) - sum(EXPENSES))]] }];
    case "balance": {
      const retained = sum(ASSETS) - sum(LIABILITIES) - sum(EQUITY);
      return [linesSection("Assets", ASSETS, "Total assets"), linesSection("Liabilities", LIABILITIES, "Total liabilities"),
        linesSection("Equity", [...EQUITY, { label: "Retained surplus & reserves", amount: retained }], "Total equity")];
    }
    case "cashflow":
      return [linesSection("Cash flows", CASH_FLOW, "Net increase in cash")];
    case "trial": {
      const td = TRIAL_BALANCE.reduce((a, x) => a + x.debit, 0);
      const tc = TRIAL_BALANCE.reduce((a, x) => a + x.credit, 0);
      return [{ columns: ["Code", "Account", "Debit", "Credit"], rows: [
        ...TRIAL_BALANCE.map((x) => [x.code, x.name, x.debit ? money(x.debit) : "-", x.credit ? money(x.credit) : "-"]),
        ["", "Totals", money(td), money(tc)],
      ] }];
    }
    case "savings": {
      const total = ADMIN_PRODUCT_DISTRIBUTION.reduce((a, p) => a + p.value, 0);
      return [{ columns: ["Product", "Balance", "Share"], rows: [
        ...ADMIN_PRODUCT_DISTRIBUTION.map((p) => [p.name, money(p.value), `${((p.value / total) * 100).toFixed(1)}%`]),
        ["Total", money(total), "100%"],
      ] }];
    }
    case "loans":
      return [
        { heading: "Disbursements vs recoveries", columns: ["Month", "Disbursed", "Recovered"], rows: ADMIN_LOAN_PERFORMANCE.map((m) => [m.month, money(m.disbursed), money(m.recovered)]) },
        { heading: "Borrowers", columns: ["SV No.", "Member", "Outstanding"], rows: ADMIN_MEMBERS_LIST.filter((m) => m.loans > 0).map((m) => [m.sv_number, m.name, money(m.loans)]) },
      ];
    case "par":
      return [{ columns: ["Ageing bucket", "Amount", "% of portfolio"], rows: PORTFOLIO_QUALITY.map((p) => [p.category, money(p.amount), `${p.percent}%`]) }];
    case "members":
      return [{ columns: ["SV No.", "Name", "Status", "KYC", "Savings", "Loans", "Shares"], rows: ADMIN_MEMBERS_LIST.map((m) => [m.sv_number, m.name, m.status, m.kyc, money(m.savings), money(m.loans), money(m.shares)]) }];
    default:
      return [{ heading: "Key indicators", columns: ["Indicator", "Value"], rows: KPI_ROWS }];
  }
}

async function runPdf(r: CatalogReport) {
  switch (r.gen) {
    case "income": return generateIncomeStatement(INCOME, EXPENSES);
    case "balance": return generateBalanceSheet(ASSETS, LIABILITIES, EQUITY);
    case "cashflow": return generateCashFlow();
    case "trial": return generateTrialBalance(TRIAL_BALANCE);
    case "savings": return generateSavingsSummary();
    case "loans": return generateLoanPortfolio();
    case "par": return generatePARReport();
    case "members": return generateMemberRegister();
    default: return generateCustomReport(r.name, r.category);
  }
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

const SEED_RECENT: RecentReport[] = [
  { id: "rr-1", report_id: "trial", name: "Trial Balance", category: "Financial", generated_at: "2026-11-04T06:00:00", generated_by: "System (scheduled)", format: "PDF", size: fileSize("trial", "PDF") },
  { id: "rr-2", report_id: "par", name: "Portfolio at Risk (PAR)", category: "Loan", generated_at: "2026-11-02T08:00:00", generated_by: "System (scheduled)", format: "PDF", size: fileSize("par", "PDF") },
  { id: "rr-3", report_id: "income", name: "Income Statement", category: "Financial", generated_at: "2026-11-01T07:30:00", generated_by: "Sarah Nakamya", format: "PDF", size: fileSize("income", "PDF") },
  { id: "rr-4", report_id: "register", name: "Member Register", category: "Member", generated_at: "2026-10-28T11:05:00", generated_by: "Sarah Nakamya", format: "CSV", size: fileSize("register", "CSV") },
  { id: "rr-5", report_id: "umra", name: "UMRA Quarterly Return", category: "Regulatory", generated_at: "2026-10-05T15:40:00", generated_by: "Sarah Nakamya", format: "PDF", size: fileSize("umra", "PDF") },
];

const SEED_SCHEDULES: Schedule[] = [
  { id: "sch-1", report_id: "collection", frequency: "daily", day: 1, time: "06:00", recipients: "loans@silvervibe.coop", format: "PDF", enabled: true },
  { id: "sch-2", report_id: "par", frequency: "weekly", day: 1, time: "08:00", recipients: "board@silvervibe.coop", format: "PDF", enabled: true },
  { id: "sch-3", report_id: "income", frequency: "monthly", day: 1, time: "07:00", recipients: "admin@silvervibe.coop, finance@silvervibe.coop", format: "PDF", enabled: true },
  { id: "sch-4", report_id: "umra", frequency: "quarterly", day: 5, time: "09:00", recipients: "compliance@silvervibe.coop", format: "PDF + CSV", enabled: false },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

function describeSchedule(s: Schedule) {
  const t = s.time;
  if (s.frequency === "daily") return `Every day at ${t}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[s.day] ?? "Monday"} at ${t}`;
  if (s.frequency === "monthly") return `${ordinal(s.day)} of every month at ${t}`;
  return `${ordinal(s.day)} of Jan, Apr, Jul & Oct at ${t}`;
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
function PreviewTables({ sections }: { sections: PreviewSection[] }) {
  return (
    <div className="space-y-5">
      {sections.map((s, i) => (
        <div key={i}>
          {s.heading && <p className="text-sm font-semibold mb-2">{s.heading}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {s.columns.map((c, j) => (
                    <th key={j} className={cn("py-2 px-2 border-b dm-border font-semibold", j === 0 ? "text-left" : "text-right")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((row, k) => (
                  <tr key={k} className={cn(k === s.rows.length - 1 && /total|net/i.test(String(row[0]) + String(row[1])) && "font-semibold")}>
                    {row.map((cell, j) => (
                      <td key={j} className={cn("py-1.5 px-2 border-b dm-border", j === 0 ? "text-left" : "text-right")}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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

  const [recent, setRecent] = useSafeList<RecentReport>("admin_recent_reports", SEED_RECENT, "report_id");
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

  // Before hydration use the fixed demo date so server and client render the same text.
  const now = hydrated ? new Date() : parseDate(DEMO_TODAY);

  /** Latest generation per catalog report: persisted history wins over the seed date. */
  const lastGenerated = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of recent) if (!map[r.report_id] || r.generated_at > map[r.report_id]) map[r.report_id] = r.generated_at;
    return map;
  }, [recent]);

  const generatedBy = user?.name ?? DEMO_ADMIN.full_name;

  const record = (r: CatalogReport, format: "PDF" | "CSV") => {
    const entry: RecentReport = {
      id: uid("rr"), report_id: r.id, name: r.name, category: r.category, generated_at: new Date().toISOString(),
      generated_by: generatedBy, format, size: fileSize(r.id, format),
    };
    setRecent((prev) => [entry, ...prev].slice(0, 50));
  };

  const generate = async (r: CatalogReport, opts: { log: boolean } = { log: true }) => {
    if (busy) return;
    setBusy(`${r.id}:PDF`);
    try {
      await runPdf(r);
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
      showToast(`${name} scheduled — ${describeSchedule(clean).toLowerCase()}`);
    }
    setSchedDraft(null);
  };
  const toggleSchedule = (s: Schedule) => {
    setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
    showToast(`${findReport(s.report_id)?.name ?? "Schedule"} ${s.enabled ? "disabled" : "enabled"}`, s.enabled ? "info" : "success");
  };

  const pdfCount = recent.filter((r) => r.format === "PDF").length;
  const thisMonth = recent.filter((r) => r.generated_at.startsWith("2026-11")).length;
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
        <StatCard label="Generated this month" value={thisMonth} sub={`${pdfCount} PDF · ${recent.length - pdfCount} CSV in history`} icon={Download} color="#22c55e" />
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
                        const last = lastGenerated[r.id] ?? r.last;
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
            <h2 className="text-lg font-bold">{preview.gen === "balance" ? "Statement of Financial Position" : preview.name}</h2>
            <p className="text-xs opacity-70 mb-4">{preview.category} · As at {formatDate(now)}</p>
            <PreviewTables sections={previewSections(preview)} />
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
              {describeSchedule(schedDraft)} · next run {formatDateTime(nextRun(schedDraft, now))}
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
        message={<>Stop sending <b>{schedDelete && findReport(schedDelete.report_id)?.name}</b> ({schedDelete && describeSchedule(schedDelete).toLowerCase()})?</>}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
