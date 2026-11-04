"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard, TrendingUp, AlertTriangle, Clock, CheckCircle2, XCircle, Download, Plus, Eye,
  Users, Percent, Target, Banknote, CalendarDays, Edit2, Loader2, FileText, Wallet, Inbox,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatDate, formatNumber, todayISO } from "@/lib/utils";
import {
  ADMIN_KPI, ADMIN_LOAN_APPLICATIONS, ADMIN_LOAN_PERFORMANCE, ADMIN_MEMBERS_LIST, DEMO_TODAY, PORTFOLIO_QUALITY,
} from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { exportToCsv } from "@/lib/export";
import { generateLoanSchedulePdf } from "@/lib/pdf-reports";
import Modal, { Button, FormField, SelectInput, TextAreaInput, TextInput } from "@/components/Modal";
import { Badge, EmptyState, PageHeader, StatCard, Tabs } from "@/components/ui";
import { isPendingLoanStatus, nextLoanAppId, type LoanApp } from "../_lib/seeds";

/* ================================================================== */
/* Types                                                              */
/* ================================================================== */

type TabId = "overview" | "applications" | "active" | "products";
type AppFilter = "all" | "pending" | "approved" | "disbursed" | "rejected";
type Member = (typeof ADMIN_MEMBERS_LIST)[number];

interface Repayment { date: string; amount: number; principal: number; interest: number }

interface ActiveLoan {
  id: string;
  sv: string;
  member: string;
  product: string;
  principal: number;
  balance: number;
  rate: number; // % p.a.
  term: number; // months
  disbursed: string;
  first_due: string;
  repayments: Repayment[];
}

interface LoanProduct {
  code: string;
  name: string;
  rate: number;
  max_amount: number;
  max_term: number;
  processing_fee: number; // % of principal
  max_multiple: number; // × savings
  active: number;
  portfolio: number;
  par: number;
}

interface ScheduleRow {
  installment: number;
  due_date: string;
  principal: number;
  interest: number;
  total: number;
  balance: number;
  status: string;
}

/* ================================================================== */
/* Pure helpers                                                        */
/* ================================================================== */

const LOANS_KEY = "admin_active_loans";
const PRODUCTS_KEY = "admin_loan_products";

function termMonths(t: string | number | undefined): number {
  const n = parseInt(String(t ?? ""), 10);
  return n > 0 ? n : 12;
}
const termLabel = (t: string | number | undefined) => `${termMonths(t)} months`;

/** First day of the month `n` months after the month of `iso` (YYYY-MM-DD). */
function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Reducing-balance amortisation: equal installments P·r / (1 − (1 + r)^−n), interest on
 * the outstanding balance each month. The last row absorbs rounding so principal sums exactly.
 */
function amortise(principal: number, ratePct: number, months: number, firstDue: string) {
  const r = ratePct / 100 / 12;
  const installment = r === 0 ? Math.round(principal / months) : Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
  let balance = principal;
  return Array.from({ length: months }, (_, i) => {
    const interest = Math.round(balance * r);
    const principalPart = i === months - 1 ? balance : Math.min(balance, installment - interest);
    balance -= principalPart;
    return { installment: i + 1, due_date: addMonths(firstDue, i), principal: principalPart, interest, total: principalPart + interest, balance };
  });
}

/** Schedule with Paid / Overdue / Pending status derived from how much principal is repaid. */
function loanSchedule(loan: ActiveLoan): ScheduleRow[] {
  const repaid = loan.principal - loan.balance;
  let cumulative = 0;
  return amortise(loan.principal, loan.rate, loan.term, loan.first_due).map((row) => {
    cumulative += row.principal;
    const status = cumulative <= repaid + 1 ? "Paid" : row.due_date < DEMO_TODAY ? "Overdue" : "Pending";
    return { ...row, status };
  });
}

function loanHealth(loan: ActiveLoan, schedule: ScheduleRow[]): "current" | "watch" | "arrears" | "closed" {
  if (loan.balance <= 0) return "closed";
  const overdue = schedule.filter((s) => s.status === "Overdue").length;
  return overdue === 0 ? "current" : overdue <= 2 ? "watch" : "arrears";
}

/**
 * Seed loan whose outstanding balance equals the member register's loans column
 * (ADMIN_MEMBERS_LIST), so Members, Loans and the portal agree. Installments are marked
 * repaid in schedule order; any remainder is folded into the last repayment as an
 * extra principal payment.
 */
function seedLoan(id: string, sv: string, product: string, principal: number, rate: number, term: number, firstDue: string): ActiveLoan {
  const rows = amortise(principal, rate, term, firstDue);
  const m = ADMIN_MEMBERS_LIST.find((x) => x.sv_number === sv);
  const balance = Math.min(principal, m?.loans ?? principal);
  const repaid = principal - balance;
  const repayments: Repayment[] = [];
  let cumulative = 0;
  for (const r of rows) {
    if (cumulative + r.principal > repaid) break;
    cumulative += r.principal;
    repayments.push({ date: r.due_date, amount: r.total, principal: r.principal, interest: r.interest });
  }
  const rest = repaid - cumulative;
  if (rest > 0) {
    const last = repayments[repayments.length - 1];
    if (last) repayments[repayments.length - 1] = { ...last, amount: last.amount + rest, principal: last.principal + rest };
    else repayments.push({ date: firstDue, amount: rest, principal: rest, interest: 0 });
  }
  return {
    id, sv, member: m?.name ?? sv, product, principal, rate, term, balance,
    disbursed: addMonths(firstDue, -1),
    first_due: firstDue,
    repayments,
  };
}

// Names/SV numbers match ADMIN_MEMBERS_LIST and each balance equals that member's loans
// column. SV-LN-2026-0042 mirrors James Mukasa's portal loan (UGX 4,178,544 outstanding).
// Terms are chosen so health varies: David is on watch, Christine (suspended) in arrears.
const SEED_LOANS: ActiveLoan[] = [
  seedLoan("SV-LN-2026-0042", "SV-0042", "Short-Term Loan", 8_000_000, 18, 12, "2026-06-01"),
  seedLoan("LN-2026-0118", "SV-0023", "Short-Term Loan", 12_000_000, 18, 24, "2026-04-01"),
  seedLoan("LN-2026-0097", "SV-0001", "Development Loan", 8_500_000, 20, 24, "2026-01-01"),
  seedLoan("LN-2026-0061", "SV-0034", "School Fees Loan", 5_000_000, 16, 24, "2026-02-01"),
  seedLoan("LN-2026-0131", "SV-0056", "Business Loan", 14_200_000, 19, 36, "2026-05-01"),
  seedLoan("LN-2025-0388", "SV-0089", "Business Loan", 23_100_000, 19, 36, "2025-09-01"),
  seedLoan("LN-2026-0074", "SV-0095", "Emergency Loan", 6_000_000, 15, 12, "2026-06-01"),
];

// Portfolio totals sum to the UGX 2.15B loan book shown on the dashboard.
const SEED_PRODUCTS: LoanProduct[] = [
  { code: "LN-STL", name: "Short-Term Loan", rate: 18, max_amount: 20_000_000, max_term: 12, processing_fee: 1, max_multiple: 3, active: 145, portfolio: 580_000_000, par: 2.1 },
  { code: "LN-DVL", name: "Development Loan", rate: 20, max_amount: 50_000_000, max_term: 36, processing_fee: 1.5, max_multiple: 5, active: 67, portfolio: 760_000_000, par: 4.5 },
  { code: "LN-EMG", name: "Emergency Loan", rate: 15, max_amount: 5_000_000, max_term: 6, processing_fee: 0.5, max_multiple: 2, active: 82, portfolio: 120_000_000, par: 1.2 },
  { code: "LN-SCH", name: "School Fees Loan", rate: 16, max_amount: 10_000_000, max_term: 12, processing_fee: 1, max_multiple: 4, active: 56, portfolio: 350_000_000, par: 3.8 },
  { code: "LN-BIZ", name: "Business Loan", rate: 19, max_amount: 50_000_000, max_term: 36, processing_fee: 2, max_multiple: 4, active: 38, portfolio: 340_000_000, par: 5.6 },
];

const DECLINE_REASONS = [
  { value: "", label: "Select a reason..." },
  { value: "Insufficient savings balance", label: "Insufficient savings balance" },
  { value: "Poor credit history", label: "Poor credit history" },
  { value: "Missing/inadequate guarantors", label: "Missing/inadequate guarantors" },
  { value: "Existing active loan not cleared", label: "Existing active loan not cleared" },
  { value: "Incomplete documentation", label: "Incomplete documentation" },
  { value: "Other", label: "Other (specify below)" },
];

const PQ_COLORS: Record<string, string> = {
  Current: "#22c55e", "Watch (1-30)": "#f59e0b", "Substandard (31-60)": "#f97316",
  // #991b1b was unreadable on the dark theme; #dc2626 reads on both.
  "Doubtful (61-90)": "#ef4444", "Loss (90+)": "#dc2626",
};

const isPending = isPendingLoanStatus;

/** Accessible green for success buttons (white text on #22c55e fails contrast). */
const GREEN_BTN = "bg-[#16a34a] hover:bg-[#15803d]";

/**
 * Deterministic credit score (20–98): savings cover of the request, KYC and status,
 * minus existing debt relative to savings.
 */
function creditScore(m: Member | undefined, amount: number): number {
  if (!m || amount <= 0) return 0;
  let s = 40 + Math.min(30, Math.round((m.savings / amount) * 15));
  if (m.kyc === "verified") s += 10;
  if (m.status === "active") s += 10;
  s -= Math.min(20, Math.round((m.loans / Math.max(m.savings, 1)) * 20));
  return Math.max(20, Math.min(98, s));
}

const scoreTone = (s: number) => (s >= 80 ? "green" : s >= 60 ? "amber" : "red");

/* ================================================================== */
/* Module-level presentational components                              */
/* ================================================================== */

function InfoCell({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] dm-text-secondary">{label}</p>
      <p className="text-sm font-semibold dm-text">{value}</p>
    </div>
  );
}

interface NewAppForm { sv: string; product: string; amount: string; term: string; purpose: string; g1: string; g2: string }
type NewAppErrors = Partial<Record<keyof NewAppForm, string>>;

function NewApplicationFields({
  form, onChange, errors, members, products,
}: {
  form: NewAppForm;
  onChange: (patch: Partial<NewAppForm>) => void;
  errors: NewAppErrors;
  members: Member[];
  products: LoanProduct[];
}) {
  const product = products.find((p) => p.name === form.product);
  const applicant = members.find((m) => m.sv_number === form.sv);
  const amount = Number(form.amount) || 0;
  const score = creditScore(applicant, amount);
  const memberOptions = [{ value: "", label: "Select member..." }, ...members.map((m) => ({ value: m.sv_number, label: `${m.name} (${m.sv_number})${m.status !== "active" ? ` · ${m.status}` : ""}` }))];
  const guarantorOptions = [{ value: "", label: "Select guarantor..." }, ...members.filter((m) => m.sv_number !== form.sv).map((m) => ({ value: m.sv_number, label: `${m.name} (${m.sv_number})` }))];

  return (
    <div className="space-y-4">
      <FormField label="Member" required error={errors.sv}>
        <SelectInput value={form.sv} onChange={(v) => onChange({ sv: v })} options={memberOptions} />
      </FormField>
      {applicant && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="dm-surface-hover rounded-lg p-2"><p className="dm-text-secondary">Savings</p><p className="font-semibold dm-text">{formatCurrency(applicant.savings)}</p></div>
          <div className="dm-surface-hover rounded-lg p-2"><p className="dm-text-secondary">Existing loans</p><p className="font-semibold dm-text">{formatCurrency(applicant.loans)}</p></div>
          <div className="dm-surface-hover rounded-lg p-2"><p className="dm-text-secondary">KYC</p><p className="font-semibold dm-text capitalize">{applicant.kyc}</p></div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Product" required error={errors.product}>
          <SelectInput value={form.product} onChange={(v) => onChange({ product: v })}
            options={products.map((p) => ({ value: p.name, label: `${p.name} · ${p.rate}%` }))} />
        </FormField>
        <FormField label="Amount (UGX)" required error={errors.amount}
          hint={product ? `Max ${formatCurrency(product.max_amount)} · up to ${product.max_multiple}× savings` : undefined}>
          <TextInput type="number" min={0} value={form.amount} onChange={(v) => onChange({ amount: v })} placeholder="e.g. 5000000" />
        </FormField>
        <FormField label="Term (months)" required error={errors.term} hint={product ? `Max ${product.max_term} months` : undefined}>
          <TextInput type="number" min={1} value={form.term} onChange={(v) => onChange({ term: v })} />
        </FormField>
        <FormField label="Indicative credit score">
          <div className="h-[42px] flex items-center">
            {score > 0 ? <Badge status={`${score} / 100`} tone={scoreTone(score)} /> : <span className="text-xs dm-text-secondary">Pick a member and amount</span>}
          </div>
        </FormField>
        <FormField label="Guarantor 1" required error={errors.g1}>
          <SelectInput value={form.g1} onChange={(v) => onChange({ g1: v })} options={guarantorOptions} />
        </FormField>
        <FormField label="Guarantor 2" error={errors.g2} hint="Optional">
          <SelectInput value={form.g2} onChange={(v) => onChange({ g2: v })} options={guarantorOptions} />
        </FormField>
      </div>
      <FormField label="Purpose" required error={errors.purpose}>
        <TextAreaInput value={form.purpose} onChange={(v) => onChange({ purpose: v })} rows={2} maxLength={200} placeholder="e.g. Restocking shop inventory" />
      </FormField>
    </div>
  );
}

interface ProductForm { code: string; name: string; rate: string; max_amount: string; max_term: string; processing_fee: string; max_multiple: string }
type ProductErrors = Partial<Record<keyof ProductForm, string>>;

function ProductFields({ form, onChange, errors, isEdit }: { form: ProductForm; onChange: (p: Partial<ProductForm>) => void; errors: ProductErrors; isEdit: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Product name" required error={errors.name} hint={isEdit ? "Name is referenced by applications and cannot change" : undefined}>
        <TextInput value={form.name} onChange={(v) => onChange({ name: v })} disabled={isEdit} placeholder="e.g. Asset Financing Loan" />
      </FormField>
      <FormField label="Code" required error={errors.code}>
        <TextInput value={form.code} onChange={(v) => onChange({ code: v.toUpperCase() })} disabled={isEdit} placeholder="LN-AST" />
      </FormField>
      <FormField label="Interest rate (% p.a.)" required error={errors.rate}>
        <TextInput type="number" step="0.1" min={0} value={form.rate} onChange={(v) => onChange({ rate: v })} />
      </FormField>
      <FormField label="Processing fee (%)" required error={errors.processing_fee}>
        <TextInput type="number" step="0.1" min={0} value={form.processing_fee} onChange={(v) => onChange({ processing_fee: v })} />
      </FormField>
      <FormField label="Max amount (UGX)" required error={errors.max_amount}>
        <TextInput type="number" min={0} value={form.max_amount} onChange={(v) => onChange({ max_amount: v })} />
      </FormField>
      <FormField label="Max term (months)" required error={errors.max_term}>
        <TextInput type="number" min={1} value={form.max_term} onChange={(v) => onChange({ max_term: v })} />
      </FormField>
      <FormField label="Max multiple of savings (×)" required error={errors.max_multiple}>
        <TextInput type="number" step="0.5" min={0} value={form.max_multiple} onChange={(v) => onChange({ max_multiple: v })} />
      </FormField>
    </div>
  );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

export default function AdminLoansPage() {
  // useSearchParams needs a Suspense boundary on a statically prerendered page.
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto py-16 text-center text-sm dm-text-secondary">Loading loans…</div>}>
      <LoansInner />
    </Suspense>
  );
}

const TAB_IDS: TabId[] = ["overview", "applications", "active", "products"];
const emptyNewApp = (product: string): NewAppForm => ({ sv: "", product, amount: "", term: "12", purpose: "", g1: "", g2: "" });

function LoansInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [applications, setApplications] = usePersistedState<LoanApp[]>(KEYS.adminLoanApps, ADMIN_LOAN_APPLICATIONS);
  const [loans, setLoans] = usePersistedState<ActiveLoan[]>(LOANS_KEY, SEED_LOANS);
  const [products, setProducts] = usePersistedState<LoanProduct[]>(PRODUCTS_KEY, SEED_PRODUCTS);
  const [members, setMembers] = usePersistedState<Member[]>(KEYS.adminMembers, ADMIN_MEMBERS_LIST);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");

  // Application modals
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [declineNotes, setDeclineNotes] = useState("");
  const [declineError, setDeclineError] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<NewAppForm>(() => emptyNewApp(SEED_PRODUCTS[0].name));
  const [newErrors, setNewErrors] = useState<NewAppErrors>({});

  // Active loan modals
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayError, setRepayError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Product modal (edit when productCode is set, add otherwise)
  const [productOpen, setProductOpen] = useState(false);
  const [productCode, setProductCode] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({ code: "", name: "", rate: "", max_amount: "", max_term: "", processing_fee: "", max_multiple: "" });
  const [productErrors, setProductErrors] = useState<ProductErrors>({});

  const openNewApplication = () => {
    setNewForm(emptyNewApp(products[0]?.name ?? SEED_PRODUCTS[0].name));
    setNewErrors({});
    setNewOpen(true);
  };

  // Deep links: ?tab=applications|active|products|overview and ?action=new.
  const paramKey = params.toString();
  const [appliedParams, setAppliedParams] = useState<string | null>(null);
  if (appliedParams !== paramKey) {
    setAppliedParams(paramKey);
    const t = params.get("tab") as TabId | null;
    if (t && TAB_IDS.includes(t)) setActiveTab(t);
    if (params.get("action") === "new") openNewApplication();
  }

  // Drop ?action= once applied so a refresh or Back doesn't reopen the modal.
  useEffect(() => {
    if (!params.get("action")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("action");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const changeTab = (t: TabId) => {
    setActiveTab(t);
    // Keep the URL shareable without adding history entries.
    router.replace(`${pathname}?tab=${t}`, { scroll: false });
  };

  /* ---------- derived ---------- */

  const selectedApp = applications.find((a) => a.id === selectedAppId) ?? null;
  const selectedLoan = loans.find((l) => l.id === selectedLoanId) ?? null;
  const selectedSchedule = selectedLoan ? loanSchedule(selectedLoan) : [];

  const pendingApps = applications.filter((a) => isPending(a.status));
  const appCounts: Record<AppFilter, number> = {
    all: applications.length,
    pending: pendingApps.length,
    approved: applications.filter((a) => a.status === "approved").length,
    disbursed: applications.filter((a) => a.status === "disbursed").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };
  const filteredApps = applications
    .filter((a) => appFilter === "all" || (appFilter === "pending" ? isPending(a.status) : a.status === appFilter))
    .sort((a, b) => b.applied_date.localeCompare(a.applied_date));

  const loanRows = loans.map((l) => {
    const schedule = loanSchedule(l);
    const next = schedule.find((s) => s.status !== "Paid");
    return { loan: l, schedule, health: loanHealth(l, schedule), next };
  });
  const openLoans = loanRows.filter((r) => r.health !== "closed");

  const portfolio = products.reduce((a, p) => a + p.portfolio, 0);
  const activeCount = products.reduce((a, p) => a + p.active, 0);

  const productByName = (name: string) => products.find((p) => p.name === name);
  const memberBySv = (sv: string) => members.find((m) => m.sv_number === sv);
  const nameOf = (sv: string) => memberBySv(sv)?.name ?? sv;

  /* ---------- application actions ---------- */

  const updateApp = (id: string, patch: Partial<LoanApp>) =>
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const openApprove = (a: LoanApp) => { setSelectedAppId(a.id); setApproveNote(""); setReviewOpen(false); setApproveOpen(true); };
  const openDecline = (a: LoanApp) => { setSelectedAppId(a.id); setDeclineReason(""); setDeclineNotes(""); setDeclineError(null); setReviewOpen(false); setDeclineOpen(true); };
  const openDisburse = (a: LoanApp) => { setSelectedAppId(a.id); setReviewOpen(false); setDisburseOpen(true); };

  const handleApprove = () => {
    if (!selectedApp) return;
    updateApp(selectedApp.id, { status: "approved", approve_note: approveNote.trim() || undefined, decided_date: todayISO() });
    setApproveOpen(false);
    showToast(`${selectedApp.id} approved for ${selectedApp.member}`);
  };

  const handleDecline = () => {
    if (!selectedApp) return;
    if (!declineReason) return setDeclineError("Choose a reason");
    if (declineReason === "Other" && !declineNotes.trim()) return setDeclineError("Describe the reason in the notes");
    updateApp(selectedApp.id, { status: "rejected", decline_reason: declineReason, decline_notes: declineNotes.trim() || undefined, decided_date: todayISO() });
    setDeclineOpen(false);
    showToast(`${selectedApp.id} declined`, "info");
  };

  const handleDisburse = () => {
    if (!selectedApp) return;
    const product = productByName(selectedApp.product);
    const today = todayISO();
    // Next free loan number for this year.
    const year = today.slice(0, 4);
    let n = 140 + loans.length;
    while (loans.some((l) => l.id === `LN-${year}-${String(n).padStart(4, "0")}`)) n++;
    const loan: ActiveLoan = {
      id: `LN-${year}-${String(n).padStart(4, "0")}`,
      sv: selectedApp.sv,
      member: selectedApp.member,
      product: selectedApp.product,
      principal: selectedApp.amount,
      balance: selectedApp.amount,
      rate: product?.rate ?? 18,
      term: termMonths(selectedApp.term),
      disbursed: today,
      first_due: addMonths(today, 1),
      repayments: [],
    };
    setLoans((prev) => [loan, ...prev]);
    updateApp(selectedApp.id, { status: "disbursed", loan_id: loan.id });
    setProducts((prev) => prev.map((p) => (p.name === loan.product ? { ...p, active: p.active + 1, portfolio: p.portfolio + loan.principal } : p)));
    setMembers((prev) => prev.map((m) => (m.sv_number === loan.sv ? { ...m, loans: m.loans + loan.principal } : m)));
    setDisburseOpen(false);
    showToast(`${formatCurrency(loan.principal)} disbursed to ${loan.member} · ${loan.id}`);
  };

  const handleCreateApplication = () => {
    const errs: NewAppErrors = {};
    const applicant = memberBySv(newForm.sv);
    const product = productByName(newForm.product);
    const amount = Number(newForm.amount);
    const term = parseInt(newForm.term, 10);
    if (!applicant) errs.sv = "Select the applying member";
    else if (applicant.status === "suspended") errs.sv = "Suspended members cannot apply for loans";
    if (!product) errs.product = "Select a product";
    if (!amount || amount <= 0) errs.amount = "Enter an amount";
    else if (product && amount > product.max_amount) errs.amount = `Exceeds the ${formatCurrency(product.max_amount)} product limit`;
    if (!term || term < 1) errs.term = "Enter a term in months";
    else if (product && term > product.max_term) errs.term = `Maximum term is ${product.max_term} months`;
    if (!newForm.g1) errs.g1 = "At least one guarantor is required";
    if (newForm.g2 && newForm.g2 === newForm.g1) errs.g2 = "Choose a different guarantor";
    if (newForm.purpose.trim().length < 5) errs.purpose = "Describe the purpose of the loan";
    setNewErrors(errs);
    if (Object.keys(errs).length || !applicant || !product) return;

    const app: LoanApp = {
      // Sequential LA-<year>-#### (tolerates the portal's uid-style ids).
      id: nextLoanAppId(applications, todayISO().slice(0, 4)),
      sv: applicant.sv_number,
      member: applicant.name,
      product: product.name,
      amount,
      term: `${term} months`,
      status: "pending_review",
      applied_date: todayISO(),
      score: creditScore(applicant, amount),
      guarantors: [newForm.g1, newForm.g2].filter(Boolean).map(nameOf),
      purpose: newForm.purpose.trim(),
    };
    setApplications((prev) => [app, ...prev]);
    setNewOpen(false);
    setAppFilter("all");
    changeTab("applications");
    showToast(`Application for ${app.member} submitted for review`);
  };

  /* ---------- active loan actions ---------- */

  const openSchedule = (l: ActiveLoan) => { setSelectedLoanId(l.id); setScheduleOpen(true); };
  const openRepay = (l: ActiveLoan) => {
    const next = loanSchedule(l).find((s) => s.status !== "Paid");
    setSelectedLoanId(l.id);
    setRepayAmount(String(next ? Math.min(next.total, l.balance + Math.round(l.balance * (l.rate / 1200))) : l.balance));
    setRepayError(null);
    setScheduleOpen(false);
    setRepayOpen(true);
  };

  // Interest for the month is settled first; the rest reduces principal.
  const repaySplit = (l: ActiveLoan, amount: number) => {
    const interest = Math.min(amount, Math.round(l.balance * (l.rate / 1200)));
    const principal = Math.min(l.balance, amount - interest);
    return { interest, principal };
  };

  const handleRepay = () => {
    if (!selectedLoan) return;
    const amount = Number(repayAmount);
    if (!amount || amount <= 0) return setRepayError("Enter the amount received");
    const maxPayable = selectedLoan.balance + Math.round(selectedLoan.balance * (selectedLoan.rate / 1200));
    if (amount > maxPayable) return setRepayError(`Maximum to clear the loan is ${formatCurrency(maxPayable)}`);
    const { interest, principal } = repaySplit(selectedLoan, amount);
    const newBalance = selectedLoan.balance - principal;
    setLoans((prev) =>
      prev.map((l) =>
        l.id === selectedLoan.id
          ? { ...l, balance: newBalance, repayments: [...l.repayments, { date: todayISO(), amount, principal, interest }] }
          : l
      )
    );
    setProducts((prev) => prev.map((p) => (p.name === selectedLoan.product ? { ...p, portfolio: Math.max(0, p.portfolio - principal), active: newBalance <= 0 ? Math.max(0, p.active - 1) : p.active } : p)));
    setMembers((prev) => prev.map((m) => (m.sv_number === selectedLoan.sv ? { ...m, loans: Math.max(0, m.loans - principal) } : m)));
    setRepayOpen(false);
    showToast(newBalance <= 0 ? `${selectedLoan.id} fully repaid and closed` : `Repayment of ${formatCurrency(amount)} recorded for ${selectedLoan.member}`);
  };

  const downloadSchedule = async (l: ActiveLoan) => {
    setPdfBusy(true);
    try {
      await generateLoanSchedulePdf(
        { loan_number: l.id, product: l.product, principal: l.principal, interest_rate: `${l.rate}%`, member: `${l.member} (${l.sv})` },
        loanSchedule(l)
      );
      showToast(`Schedule for ${l.id} downloaded`);
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  /* ---------- product actions ---------- */

  const openProduct = (p?: LoanProduct) => {
    setProductCode(p?.code ?? null);
    setProductForm(
      p
        ? { code: p.code, name: p.name, rate: String(p.rate), max_amount: String(p.max_amount), max_term: String(p.max_term), processing_fee: String(p.processing_fee), max_multiple: String(p.max_multiple) }
        : { code: "", name: "", rate: "18", max_amount: "10000000", max_term: "12", processing_fee: "1", max_multiple: "3" }
    );
    setProductErrors({});
    setProductOpen(true);
  };

  const handleSaveProduct = () => {
    const f = productForm;
    const errs: ProductErrors = {};
    const rate = parseFloat(f.rate);
    const fee = parseFloat(f.processing_fee);
    const maxAmount = parseFloat(f.max_amount);
    const maxTerm = parseInt(f.max_term, 10);
    const multiple = parseFloat(f.max_multiple);
    if (!productCode) {
      if (f.name.trim().length < 3) errs.name = "Enter a product name";
      else if (products.some((p) => p.name.toLowerCase() === f.name.trim().toLowerCase())) errs.name = "A product with this name exists";
      if (!/^[A-Z0-9-]{3,10}$/.test(f.code.trim())) errs.code = "3–10 letters, digits or dashes";
      else if (products.some((p) => p.code === f.code.trim())) errs.code = "Code already in use";
    }
    if (!(rate >= 0 && rate <= 60)) errs.rate = "Enter a rate between 0 and 60";
    if (!(fee >= 0 && fee <= 10)) errs.processing_fee = "Enter a fee between 0 and 10";
    if (!(maxAmount > 0)) errs.max_amount = "Enter a maximum amount";
    if (!(maxTerm >= 1 && maxTerm <= 120)) errs.max_term = "Enter 1–120 months";
    if (!(multiple > 0)) errs.max_multiple = "Enter a multiple above 0";
    setProductErrors(errs);
    if (Object.keys(errs).length) return;

    if (productCode) {
      setProducts((prev) => prev.map((p) => (p.code === productCode ? { ...p, rate, processing_fee: fee, max_amount: maxAmount, max_term: maxTerm, max_multiple: multiple } : p)));
      showToast(`${f.name} updated`);
    } else {
      setProducts((prev) => [...prev, { code: f.code.trim(), name: f.name.trim(), rate, processing_fee: fee, max_amount: maxAmount, max_term: maxTerm, max_multiple: multiple, active: 0, portfolio: 0, par: 0 }]);
      showToast(`${f.name.trim()} added`);
    }
    setProductOpen(false);
  };

  /* ---------- export ---------- */

  const handleExport = () => {
    const stamp = todayISO();
    if (activeTab === "applications") {
      if (!filteredApps.length) return showToast("No applications to export", "error");
      exportToCsv(`loan-applications-${stamp}`, filteredApps.map((a) => ({
        ...a, term: termLabel(a.term), score: a.score ?? "", guarantors: a.guarantors ?? [],
      })), [
        { key: "id", label: "ID" }, { key: "sv", label: "SV Number" }, { key: "member", label: "Member" },
        { key: "product", label: "Product" }, { key: "amount", label: "Amount (UGX)" }, { key: "term", label: "Term" },
        { key: "status", label: "Status" }, { key: "applied_date", label: "Applied" }, { key: "score", label: "Score" },
        { key: "guarantors", label: "Guarantors" }, { key: "purpose", label: "Purpose" }, { key: "approve_note", label: "Approval note" },
        { key: "decline_reason", label: "Decline reason" }, { key: "decline_notes", label: "Decline notes" }, { key: "loan_id", label: "Loan ID" },
      ]);
      showToast(`Exported ${filteredApps.length} applications`);
    } else if (activeTab === "active") {
      exportToCsv(`active-loans-${stamp}`, loanRows.map(({ loan, health, next }) => ({
        id: loan.id, sv: loan.sv, member: loan.member, product: loan.product, principal: loan.principal, balance: loan.balance,
        rate: `${loan.rate}%`, term: `${loan.term} months`, status: health, next_due: next?.due_date ?? "", next_amount: next?.total ?? "", disbursed: loan.disbursed,
      })), [
        { key: "id", label: "Loan ID" }, { key: "sv", label: "SV Number" }, { key: "member", label: "Member" }, { key: "product", label: "Product" },
        { key: "principal", label: "Principal (UGX)" }, { key: "balance", label: "Balance (UGX)" }, { key: "rate", label: "Rate" }, { key: "term", label: "Term" },
        { key: "status", label: "Status" }, { key: "next_due", label: "Next due" }, { key: "next_amount", label: "Next installment (UGX)" }, { key: "disbursed", label: "Disbursed" },
      ]);
      showToast(`Exported ${loanRows.length} loans`);
    } else if (activeTab === "products") {
      exportToCsv(`loan-products-${stamp}`, products.map((p) => ({ ...p })), [
        { key: "code", label: "Code" }, { key: "name", label: "Product" }, { key: "rate", label: "Rate (% p.a.)" },
        { key: "processing_fee", label: "Processing fee (%)" }, { key: "max_amount", label: "Max amount (UGX)" }, { key: "max_term", label: "Max term (months)" },
        { key: "max_multiple", label: "Max × savings" }, { key: "active", label: "Active loans" }, { key: "portfolio", label: "Portfolio (UGX)" }, { key: "par", label: "PAR (%)" },
      ]);
      showToast(`Exported ${products.length} products`);
    } else {
      exportToCsv(`loan-portfolio-quality-${stamp}`, PORTFOLIO_QUALITY.map((p) => ({ ...p })), [
        { key: "category", label: "Category" }, { key: "amount", label: "Amount (UGX)" }, { key: "percent", label: "Share (%)" },
      ]);
      showToast("Portfolio quality exported");
    }
  };

  /* ---------- render ---------- */

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "applications", label: "Applications", count: applications.length },
    { id: "active", label: "Active Loans", count: openLoans.length },
    { id: "products", label: "Products", count: products.length },
  ];

  const repayAmountNum = Number(repayAmount) || 0;
  const repayPreview = selectedLoan && repayAmountNum > 0 ? repaySplit(selectedLoan, repayAmountNum) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Loans Management"
        subtitle="Process applications, monitor the portfolio and manage collections"
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
            <Button onClick={openNewApplication}><Plus className="w-4 h-4" /> New Application</Button>
          </>
        }
      />

      <Tabs tabs={tabs} active={activeTab} onChange={changeTab} />

      {/* ================= OVERVIEW ================= */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Loan Portfolio" value={formatCurrency(portfolio)} sub={`${products.length} products`} icon={CreditCard} color="#a855f7" />
            <StatCard label="Active Loans" value={activeCount} sub={`${openLoans.length} tracked in demo`} icon={TrendingUp} color="#22c55e" />
            <StatCard label="PAR > 30 Days" value={`${ADMIN_KPI.par_30.value}%`} icon={AlertTriangle} color="#ef4444"
              sub={
                // A falling PAR is good news, so the trend is green.
                <span className={ADMIN_KPI.par_30.change <= 0 ? "text-[#16a34a]" : "text-[#dc2626]"}>
                  {ADMIN_KPI.par_30.change <= 0 ? "▼" : "▲"} {Math.abs(ADMIN_KPI.par_30.change)} pts vs last month · target &lt; 5%
                </span>
              } />
            <button type="button" onClick={() => changeTab("applications")} className="text-left">
              <StatCard label="Pending Applications" value={pendingApps.length} sub={<span className="text-[#4A90D9]">Review now →</span>} icon={Clock} color="#f59e0b" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-4 text-sm">Disbursement vs Recovery</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ADMIN_LOAN_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="disbursed" fill="#4A90D9" radius={[4, 4, 0, 0]} name="Disbursed" />
                    <Bar dataKey="recovered" fill="#22c55e" radius={[4, 4, 0, 0]} name="Recovered" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-4 text-sm">Portfolio Quality</h3>
              <div className="space-y-3 mt-6">
                {PORTFOLIO_QUALITY.map((pq) => (
                  <div key={pq.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="dm-text-secondary">{pq.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium dm-text">{formatCurrency(pq.amount)}</span>
                        <span className="font-semibold" style={{ color: PQ_COLORS[pq.category] }}>{pq.percent}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#94a3b8]/25 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pq.percent}%`, backgroundColor: PQ_COLORS[pq.category] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= APPLICATIONS ================= */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "disbursed", "rejected"] as AppFilter[]).map((f) => (
              <button key={f} type="button" onClick={() => setAppFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors ${
                  appFilter === f ? "bg-[#4A90D9] text-white border-[#4A90D9]" : "dm-border dm-text-secondary hover:bg-[#f1f5f9]"
                }`}>
                {f} ({appCounts[f]})
              </button>
            ))}
          </div>

          {filteredApps.length === 0 ? (
            <div className="glass-card rounded-xl">
              <EmptyState icon={Inbox} title={`No ${appFilter === "all" ? "" : appFilter + " "}applications`}
                hint="New applications from the member portal or the New Application button appear here."
                action={<Button onClick={openNewApplication}><Plus className="w-4 h-4" /> New Application</Button>} />
            </div>
          ) : (
            filteredApps.map((app) => (
              <div key={app.id} className="glass-card rounded-xl p-5 hover:shadow-sm transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono dm-text-secondary">{app.id}</span>
                      <Badge status={app.status} tone={app.status === "under_appraisal" ? "blue" : undefined} />
                      {typeof app.score === "number" && <Badge status={`Score ${app.score}`} tone={scoreTone(app.score)} />}
                      {app.loan_id && <span className="text-[10px] font-mono dm-text-secondary">→ {app.loan_id}</span>}
                    </div>
                    <h3 className="font-semibold dm-text mb-1">{app.member} ({app.sv})</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs dm-text-secondary">
                      <span>Product: <b className="dm-text">{app.product}</b></span>
                      <span>Amount: <b className="dm-text">{formatCurrency(app.amount)}</b></span>
                      <span>Term: <b className="dm-text">{termLabel(app.term)}</b></span>
                      <span>Applied: <b className="dm-text">{formatDate(app.applied_date)}</b></span>
                    </div>
                    {!!app.guarantors?.length && (
                      <p className="text-xs dm-text-secondary mt-1">Guarantors: <span className="dm-text">{app.guarantors.join(", ")}</span></p>
                    )}
                    {app.purpose && <p className="text-xs dm-text-secondary mt-1">Purpose: <span className="dm-text">{app.purpose}</span></p>}
                    {app.approve_note && <p className="text-xs text-[#16a34a] mt-1">Approval note: {app.approve_note}</p>}
                    {app.decline_reason && (
                      <p className="text-xs text-[#dc2626] mt-1">Declined: {app.decline_reason}{app.decline_notes ? ` — ${app.decline_notes}` : ""}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="py-2 text-xs" onClick={() => { setSelectedAppId(app.id); setReviewOpen(true); }}>
                      <Eye className="w-3.5 h-3.5" /> Review
                    </Button>
                    {isPending(app.status) && (
                      <>
                        <Button variant="success" className={`py-2 text-xs ${GREEN_BTN}`} onClick={() => openApprove(app)}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
                        <Button variant="danger" className="py-2 text-xs" onClick={() => openDecline(app)}><XCircle className="w-3.5 h-3.5" /> Decline</Button>
                      </>
                    )}
                    {app.status === "approved" && (
                      <Button variant="accent" className="py-2 text-xs" onClick={() => openDisburse(app)}><Banknote className="w-3.5 h-3.5" /> Disburse</Button>
                    )}
                    {app.status === "disbursed" && (
                      <Button variant="secondary" className="py-2 text-xs" onClick={() => { const l = loans.find((x) => x.id === app.loan_id); if (l) openSchedule(l); else changeTab("active"); }}>
                        <CalendarDays className="w-3.5 h-3.5" /> Schedule
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= ACTIVE LOANS ================= */}
      {activeTab === "active" && (
        <div className="glass-card rounded-xl overflow-hidden">
          {loanRows.length === 0 ? (
            <EmptyState icon={CreditCard} title="No active loans" hint="Approved applications appear here once disbursed." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                    {/* Product and rate sit under the ID/principal so Actions never clips at laptop widths. */}
                    {["Loan", "Member", "Principal", "Balance", "Status", "Next Due", "Actions"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-[#64748b] whitespace-nowrap ${i === 2 || i === 3 ? "text-right" : i === 6 ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loanRows.map(({ loan: l, health, next }) => {
                    const progress = ((l.principal - l.balance) / l.principal) * 100;
                    return (
                      <tr key={l.id} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs font-mono dm-text-secondary">{l.id}</p>
                          <p className="text-[11px] dm-text-secondary">{l.product}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs dm-text font-medium">{l.member}</p>
                          <p className="text-[11px] dm-text-secondary">{l.sv}</p>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <p className="text-xs dm-text">{formatCurrency(l.principal)}</p>
                          <p className="text-[11px] dm-text-secondary">{l.rate}% · {l.term} mo</p>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <p className="text-xs font-medium dm-text">{formatCurrency(l.balance)}</p>
                          <div className="w-16 bg-[#94a3b8]/25 rounded-full h-1 mt-1 ml-auto">
                            <div className="bg-[#22c55e] h-1 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge status={health} tone={health === "watch" ? "amber" : health === "arrears" ? "red" : undefined} /></td>
                        <td className="px-4 py-3 text-xs dm-text-secondary whitespace-nowrap">
                          {next ? <>{formatDate(next.due_date)}<br /><span className="dm-text">{formatCurrency(next.total)}</span></> : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => openSchedule(l)} title="View schedule" aria-label={`View schedule for ${l.id}`} className="p-1.5 rounded-lg hover:bg-[#f1f5f9]">
                              <CalendarDays className="w-3.5 h-3.5 dm-text-secondary" />
                            </button>
                            <button type="button" onClick={() => openRepay(l)} disabled={health === "closed"} title="Record repayment" aria-label={`Record repayment for ${l.id}`} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] disabled:opacity-40">
                              <Wallet className="w-3.5 h-3.5 text-[#16a34a]" />
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

      {/* ================= PRODUCTS ================= */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => openProduct()}><Plus className="w-4 h-4" /> Add product</Button>
          </div>
          {products.map((p) => (
            <div key={p.code} className="glass-card rounded-xl p-5 hover:shadow-sm transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold dm-text">{p.name}</h3>
                    <span className="text-[10px] font-mono dm-text-secondary">{p.code}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs dm-text-secondary">
                    <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Rate: <b className="dm-text">{p.rate}% p.a.</b></span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Max: <b className="dm-text">{formatCurrency(p.max_amount)} · {p.max_multiple}× savings</b></span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Term: <b className="dm-text">up to {p.max_term} months</b></span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Fee: <b className="dm-text">{p.processing_fee}%</b></span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Active: <b className="dm-text">{p.active}</b></span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs dm-text-secondary">Portfolio</p>
                    <p className="text-lg font-bold dm-text">{formatCurrency(p.portfolio)}</p>
                    <p className="text-xs mt-1 dm-text-secondary">PAR: <span className={`font-semibold ${p.par > 3 ? "text-[#dc2626]" : "text-[#16a34a]"}`}>{p.par}%</span></p>
                  </div>
                  <Button variant="secondary" className="py-2 text-xs" onClick={() => openProduct(p)}><Edit2 className="w-3.5 h-3.5" /> Edit</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== NEW APPLICATION ======== */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Loan Application" size="lg"
        footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={handleCreateApplication}><Plus className="w-4 h-4" /> Submit application</Button></>}>
        <NewApplicationFields form={newForm} onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))} errors={newErrors} members={members} products={products} />
      </Modal>

      {/* ======== REVIEW ======== */}
      <Modal open={reviewOpen && !!selectedApp} onClose={() => setReviewOpen(false)} title={`Loan Review — ${selectedApp?.id ?? ""}`} size="lg"
        footer={selectedApp && (
          <>
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>Close</Button>
            {isPending(selectedApp.status) && (
              <>
                <Button variant="danger" onClick={() => openDecline(selectedApp)}><XCircle className="w-4 h-4" /> Decline</Button>
                <Button variant="success" className={GREEN_BTN} onClick={() => openApprove(selectedApp)}><CheckCircle2 className="w-4 h-4" /> Approve</Button>
              </>
            )}
            {selectedApp.status === "approved" && <Button variant="accent" onClick={() => openDisburse(selectedApp)}><Banknote className="w-4 h-4" /> Disburse</Button>}
          </>
        )}>
        {selectedApp && (
          <div className="space-y-5">
            <div className="dm-surface-hover rounded-xl p-4 grid grid-cols-2 gap-4">
              <InfoCell label="Applicant" value={`${selectedApp.member} (${selectedApp.sv})`} />
              <InfoCell label="Product" value={selectedApp.product} />
              <InfoCell label="Amount requested" value={formatCurrency(selectedApp.amount)} />
              <InfoCell label="Term" value={termLabel(selectedApp.term)} />
              <InfoCell label="Application date" value={formatDate(selectedApp.applied_date)} />
              <InfoCell label="Credit score" value={typeof selectedApp.score === "number" ? <Badge status={`${selectedApp.score} / 100`} tone={scoreTone(selectedApp.score)} /> : "Not scored"} />
              {(() => {
                const m = memberBySv(selectedApp.sv);
                return m ? (
                  <>
                    <InfoCell label="Member savings" value={formatCurrency(m.savings)} />
                    <InfoCell label="Existing loans" value={formatCurrency(m.loans)} />
                  </>
                ) : null;
              })()}
              {selectedApp.purpose && <InfoCell className="col-span-2" label="Purpose" value={selectedApp.purpose} />}
            </div>
            <div>
              <p className="text-xs font-medium dm-text-secondary mb-2">Guarantors</p>
              {selectedApp.guarantors?.length ? (
                <div className="flex gap-2 flex-wrap">
                  {selectedApp.guarantors.map((g) => <span key={g} className="px-3 py-1.5 bg-[#4A90D9]/10 text-[#4A90D9] rounded-lg text-xs font-medium">{g}</span>)}
                </div>
              ) : <p className="text-xs dm-text-secondary">None listed</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border dm-border">
              <span className="text-xs dm-text-secondary">Status:</span> <Badge status={selectedApp.status} tone={selectedApp.status === "under_appraisal" ? "blue" : undefined} />
              {selectedApp.decided_date && <span className="text-xs dm-text-secondary">· decided {formatDate(selectedApp.decided_date)}</span>}
              {selectedApp.loan_id && <span className="text-xs dm-text-secondary">· loan {selectedApp.loan_id}</span>}
            </div>
            {selectedApp.approve_note && (
              <div className="p-3 rounded-xl bg-[#22c55e]/10 text-xs"><b className="text-[#16a34a]">Approval note:</b> <span className="dm-text">{selectedApp.approve_note}</span></div>
            )}
            {selectedApp.decline_reason && (
              <div className="p-3 rounded-xl bg-[#ef4444]/10 text-xs space-y-1">
                <p><b className="text-[#dc2626]">Decline reason:</b> <span className="dm-text">{selectedApp.decline_reason}</span></p>
                {selectedApp.decline_notes && <p><b className="text-[#dc2626]">Notes:</b> <span className="dm-text">{selectedApp.decline_notes}</span></p>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======== APPROVE ======== */}
      <Modal open={approveOpen && !!selectedApp} onClose={() => setApproveOpen(false)} title="Approve Loan" size="md"
        footer={<><Button variant="secondary" onClick={() => setApproveOpen(false)}>Cancel</Button><Button variant="success" className={GREEN_BTN} onClick={handleApprove}><CheckCircle2 className="w-4 h-4" /> Confirm Approval</Button></>}>
        {selectedApp && (
          <div className="space-y-4">
            <div className="p-3 bg-[#22c55e]/10 rounded-xl border border-[#22c55e]/20">
              <p className="text-sm dm-text">Approve <b>{formatCurrency(selectedApp.amount)}</b> {selectedApp.product} for <b>{selectedApp.member}</b>?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="dm-surface-hover rounded-lg p-3"><InfoCell label="Credit score" value={typeof selectedApp.score === "number" ? `${selectedApp.score}/100` : "—"} /></div>
              <div className="dm-surface-hover rounded-lg p-3"><InfoCell label="Guarantors" value={selectedApp.guarantors?.length ?? 0} /></div>
            </div>
            <FormField label="Approval note" hint="Optional — conditions or remarks, saved on the application">
              <TextAreaInput value={approveNote} onChange={setApproveNote} rows={3} maxLength={300} placeholder="Add any conditions or notes..." />
            </FormField>
          </div>
        )}
      </Modal>

      {/* ======== DECLINE ======== */}
      <Modal open={declineOpen && !!selectedApp} onClose={() => setDeclineOpen(false)} title="Decline Loan Application" size="md"
        footer={<><Button variant="secondary" onClick={() => setDeclineOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDecline}><XCircle className="w-4 h-4" /> Confirm Decline</Button></>}>
        {selectedApp && (
          <div className="space-y-4">
            <div className="p-3 bg-[#ef4444]/10 rounded-xl border border-[#ef4444]/20">
              <p className="text-sm dm-text">Decline the <b>{formatCurrency(selectedApp.amount)}</b> {selectedApp.product} application from <b>{selectedApp.member}</b>?</p>
            </div>
            <FormField label="Reason for decline" required error={declineError}>
              <SelectInput value={declineReason} onChange={(v) => { setDeclineReason(v); setDeclineError(null); }} options={DECLINE_REASONS} />
            </FormField>
            <FormField label="Additional notes" required={declineReason === "Other"}>
              <TextAreaInput value={declineNotes} onChange={(v) => { setDeclineNotes(v); setDeclineError(null); }} rows={2} maxLength={300} placeholder="Additional notes..." />
            </FormField>
          </div>
        )}
      </Modal>

      {/* ======== DISBURSE ======== */}
      <Modal open={disburseOpen && !!selectedApp} onClose={() => setDisburseOpen(false)} title="Disburse Loan" size="md"
        footer={<><Button variant="secondary" onClick={() => setDisburseOpen(false)}>Cancel</Button><Button variant="accent" onClick={handleDisburse}><Banknote className="w-4 h-4" /> Disburse</Button></>}>
        {selectedApp && (() => {
          const product = productByName(selectedApp.product);
          const rate = product?.rate ?? 18;
          const months = termMonths(selectedApp.term);
          const preview = amortise(selectedApp.amount, rate, months, "2026-12-01");
          const fee = Math.round(selectedApp.amount * ((product?.processing_fee ?? 0) / 100));
          return (
            <div className="space-y-4">
              <p className="text-sm dm-text-secondary">This opens loan account for <b className="dm-text">{selectedApp.member}</b> and moves it into Active Loans.</p>
              <div className="dm-surface-hover rounded-xl p-4 grid grid-cols-2 gap-4">
                <InfoCell label="Principal" value={formatCurrency(selectedApp.amount)} />
                <InfoCell label="Rate" value={`${rate}% p.a. reducing`} />
                <InfoCell label="Term" value={`${months} months`} />
                <InfoCell label="Monthly installment" value={formatCurrency(preview[0]?.total ?? 0)} />
                <InfoCell label="Processing fee" value={formatCurrency(fee)} />
                <InfoCell label="Net to member" value={formatCurrency(selectedApp.amount - fee)} />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ======== SCHEDULE ======== */}
      <Modal open={scheduleOpen && !!selectedLoan} onClose={() => setScheduleOpen(false)} title={`Repayment Schedule — ${selectedLoan?.id ?? ""}`} size="xl"
        footer={selectedLoan && (
          <>
            <Button variant="secondary" disabled={pdfBusy} onClick={() => downloadSchedule(selectedLoan)}>
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {pdfBusy ? "Generating…" : "Download schedule"}
            </Button>
            <Button variant="success" className={GREEN_BTN} disabled={selectedLoan.balance <= 0} onClick={() => openRepay(selectedLoan)}><Wallet className="w-4 h-4" /> Record repayment</Button>
          </>
        )}>
        {selectedLoan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="dm-surface-hover rounded-lg p-3"><InfoCell label="Member" value={`${selectedLoan.member} (${selectedLoan.sv})`} /></div>
              <div className="dm-surface-hover rounded-lg p-3"><InfoCell label="Principal" value={formatCurrency(selectedLoan.principal)} /></div>
              <div className="dm-surface-hover rounded-lg p-3"><InfoCell label="Outstanding" value={formatCurrency(selectedLoan.balance)} /></div>
              <div className="dm-surface-hover rounded-lg p-3"><InfoCell label="Rate / term" value={`${selectedLoan.rate}% · ${selectedLoan.term} mo`} /></div>
            </div>
            <div className="overflow-x-auto border dm-border rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                    {/* Amounts are in UGX (stated in the headers) so cells fit on a phone. */}
                    {["#", "Due date", "Principal (UGX)", "Interest (UGX)", "Installment (UGX)", "Balance (UGX)", "Status"].map((h, i) => (
                      <th key={h} className={`px-3 py-2 font-semibold text-[#64748b] ${i >= 2 && i <= 5 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedSchedule.map((s) => (
                    <tr key={s.installment} className="border-b border-[#e2e8f0] last:border-0">
                      <td className="px-3 py-2 dm-text-secondary">{s.installment}</td>
                      <td className="px-3 py-2 dm-text whitespace-nowrap">{formatDate(s.due_date)}</td>
                      <td className="px-3 py-2 text-right dm-text">{formatNumber(s.principal)}</td>
                      <td className="px-3 py-2 text-right dm-text">{formatNumber(s.interest)}</td>
                      <td className="px-3 py-2 text-right font-medium dm-text">{formatNumber(s.total)}</td>
                      <td className="px-3 py-2 text-right dm-text-secondary">{formatNumber(s.balance)}</td>
                      <td className="px-3 py-2"><Badge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedLoan.repayments.length > 0 && (
              <p className="text-xs dm-text-secondary">
                {selectedLoan.repayments.length} repayment{selectedLoan.repayments.length === 1 ? "" : "s"} received, last on {formatDate(selectedLoan.repayments[selectedLoan.repayments.length - 1].date)}.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ======== REPAYMENT ======== */}
      <Modal open={repayOpen && !!selectedLoan} onClose={() => setRepayOpen(false)} title={`Record Repayment — ${selectedLoan?.id ?? ""}`} size="md"
        footer={<><Button variant="secondary" onClick={() => setRepayOpen(false)}>Cancel</Button><Button variant="success" className={GREEN_BTN} onClick={handleRepay}><Wallet className="w-4 h-4" /> Record repayment</Button></>}>
        {selectedLoan && (
          <div className="space-y-4">
            <div className="dm-surface-hover rounded-xl p-4 grid grid-cols-2 gap-4">
              <InfoCell label="Member" value={selectedLoan.member} />
              <InfoCell label="Outstanding principal" value={formatCurrency(selectedLoan.balance)} />
            </div>
            <FormField label="Amount received (UGX)" required error={repayError} hint="Defaults to the next installment">
              <TextInput type="number" min={0} value={repayAmount} onChange={(v) => { setRepayAmount(v); setRepayError(null); }} />
            </FormField>
            {repayPreview && (
              <div className="text-xs dm-text-secondary space-y-1 p-3 rounded-xl border dm-border">
                <p>Interest for the month: <b className="dm-text">{formatCurrency(repayPreview.interest)}</b></p>
                <p>Principal reduction: <b className="dm-text">{formatCurrency(repayPreview.principal)}</b></p>
                <p>New balance: <b className="dm-text">{formatCurrency(Math.max(0, selectedLoan.balance - repayPreview.principal))}</b></p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======== PRODUCT ADD / EDIT ======== */}
      <Modal open={productOpen} onClose={() => setProductOpen(false)} title={productCode ? `Edit ${productForm.name}` : "Add Loan Product"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setProductOpen(false)}>Cancel</Button><Button onClick={handleSaveProduct}>{productCode ? "Save changes" : "Add product"}</Button></>}>
        <ProductFields form={productForm} onChange={(p) => setProductForm((f) => ({ ...f, ...p }))} errors={productErrors} isEdit={!!productCode} />
      </Modal>
    </div>
  );
}
