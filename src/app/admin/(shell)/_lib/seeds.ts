// ============================================================
// Seeds and pure helpers shared by admin pages (and src/lib/demo.ts).
//
// Several admin screens read the same persisted records: the dashboard derives its
// Pending Approvals from loan applications and savings transactions, and every page
// that moves money keeps the member register (KEYS.adminMembers) in step. Keeping the
// seeds and the balance rules here means each reader uses the same fallback data and
// the same arithmetic, so the demo never contradicts itself.
//
// Plain module: no React, no browser APIs.
// ============================================================

import { ADMIN_MEMBERS_LIST, ADMIN_PENDING_APPROVALS } from "@/lib/mock-data";
import { ANCHOR, addMonthsKey } from "@/lib/demo-clock";

export type Member = (typeof ADMIN_MEMBERS_LIST)[number];

// ------------------------------------------------------------------
// Savings
// ------------------------------------------------------------------

export const SAVINGS_PRODUCTS_KEY = "admin_savings_products";
export const SAVINGS_TXN_KEY = "admin_savings_txn";

export interface SavingsProduct {
  code: string;
  name: string;
  rate: number; // % p.a.
  min: number; // minimum balance (UGX)
  members: number;
  balance: number;
  status: "active" | "draft" | "suspended";
  description: string;
  color: string;
}

export type TxnType = "Deposit" | "Withdrawal" | "Transfer";
export type TxnStatus = "posted" | "pending" | "reversed" | "rejected";

export interface SavingsTxn {
  id: string;
  sv: string;
  member: string;
  type: TxnType;
  product: string; // product code
  toProduct?: string; // transfers only
  amount: number;
  date: string;
  channel: string;
  reference: string;
  status: TxnStatus;
}

// Names and balances match ADMIN_PRODUCT_DISTRIBUTION (total UGX 4.82B = dashboard KPI).
export const DEFAULT_SAVINGS_PRODUCTS: SavingsProduct[] = [
  { code: "SV-REG", name: "Regular Savings", rate: 5, min: 50_000, members: 789, balance: 2_100_000_000, status: "active", color: "#4A90D9", description: "Mandatory monthly savings that build members' borrowing power." },
  { code: "SV-FLEX", name: "Flexi/Wallet", rate: 3, min: 0, members: 512, balance: 850_000_000, status: "active", color: "#C0C0C0", description: "Voluntary wallet with free deposits and withdrawals via mobile money." },
  { code: "SV-FIX", name: "Fixed Savings", rate: 12, min: 1_000_000, members: 143, balance: 1_200_000_000, status: "active", color: "#22c55e", description: "Locked 6–24 month deposits earning a higher fixed rate." },
  { code: "SV-YSV", name: "Young Savers", rate: 6, min: 10_000, members: 96, balance: 180_000_000, status: "active", color: "#a855f7", description: "Savings for members' children under 18, managed by a parent." },
  { code: "SV-LGS", name: "Loan Guarantee", rate: 3, min: 0, members: 274, balance: 490_000_000, status: "active", color: "#f59e0b", description: "Savings held under lien as security for member loans." },
];

// Names/SV numbers match ADMIN_MEMBERS_LIST. One authored history from Sep 2026 to
// Feb 2027, ids in date order. Records up to ANCHOR (23 Nov 2026) are already in the
// product balances and member savings; later ones are revealed by date on the pages
// (isRevealed) and never re-applied to balances. Each future month's deposits and
// withdrawals are authored to net to zero, so the stored totals (UGX 4.82B) still hold.
// James Mukasa (SV-0042) mirrors the portal: UGX 200,000 standing order on the 2nd,
// the 9 Oct withdrawal and the 19 Nov Flexi deposit. TXN-4823 (David Ssempala, pending)
// is the withdrawal the dashboard asks to approve; TXN-4825 is Fatima's deposit today.
type SeedRow = [id: number, date: string, sv: string, type: TxnType, product: string, amount: number, channel: string, status?: TxnStatus, toProduct?: string];
const SEED_ROWS: SeedRow[] = [
  // ---- Sep 2026 ----
  [4801, "2026-09-02", "SV-0042", "Deposit", "SV-REG", 200_000, "Standing Order"],
  [4802, "2026-09-04", "SV-0001", "Deposit", "SV-REG", 400_000, "Mobile Money"],
  [4803, "2026-09-08", "SV-0089", "Deposit", "SV-FIX", 3_000_000, "Bank"],
  [4804, "2026-09-11", "SV-0012", "Withdrawal", "SV-FLEX", 1_500_000, "Bank"],
  [4805, "2026-09-15", "SV-0056", "Deposit", "SV-FLEX", 800_000, "Mobile Money"],
  [4806, "2026-09-19", "SV-0023", "Deposit", "SV-REG", 350_000, "Cash"],
  [4807, "2026-09-24", "SV-0034", "Deposit", "SV-LGS", 500_000, "Cash"],
  [4808, "2026-09-29", "SV-0078", "Deposit", "SV-REG", 250_000, "Cash"],
  // ---- Oct 2026 ----
  [4809, "2026-10-02", "SV-0042", "Deposit", "SV-REG", 200_000, "Standing Order"],
  [4810, "2026-10-05", "SV-0067", "Withdrawal", "SV-REG", 400_000, "Cash", "rejected"],
  [4811, "2026-10-09", "SV-0042", "Withdrawal", "SV-FLEX", 1_000_000, "Bank"],
  [4812, "2026-10-15", "SV-0078", "Deposit", "SV-REG", 300_000, "Cash"],
  [4813, "2026-10-21", "SV-0089", "Deposit", "SV-REG", 1_200_000, "Bank"],
  [4814, "2026-10-22", "SV-0023", "Transfer", "SV-FLEX", 1_000_000, "Internal", "posted", "SV-LGS"],
  [4815, "2026-10-28", "SV-0001", "Deposit", "SV-YSV", 150_000, "Cash"],
  [4816, "2026-10-30", "SV-0012", "Deposit", "SV-FLEX", 2_500_000, "Bank"],
  // ---- Nov 2026 (up to ANCHOR) ----
  [4817, "2026-11-01", "SV-0089", "Deposit", "SV-FIX", 5_000_000, "Bank"],
  [4818, "2026-11-02", "SV-0042", "Deposit", "SV-REG", 200_000, "Standing Order"],
  [4819, "2026-11-09", "SV-0023", "Deposit", "SV-REG", 350_000, "Mobile Money"],
  [4820, "2026-11-12", "SV-0001", "Deposit", "SV-REG", 400_000, "Mobile Money"],
  [4821, "2026-11-16", "SV-0034", "Deposit", "SV-LGS", 300_000, "Cash"],
  [4822, "2026-11-19", "SV-0042", "Deposit", "SV-FLEX", 500_000, "Mobile Money"],
  [4823, "2026-11-22", "SV-0034", "Withdrawal", "SV-REG", 3_000_000, "Cash", "pending"],
  [4824, "2026-11-23", "SV-0012", "Withdrawal", "SV-FLEX", 2_000_000, "Bank"],
  [4825, "2026-11-23", "SV-0056", "Deposit", "SV-REG", 500_000, "Mobile Money"],
  // ---- Dec 2026 (revealed by date; deposits 4.45M = withdrawals 4.45M) ----
  [4826, "2026-12-02", "SV-0042", "Deposit", "SV-REG", 200_000, "Standing Order"],
  [4827, "2026-12-04", "SV-0001", "Deposit", "SV-REG", 400_000, "Mobile Money"],
  [4828, "2026-12-07", "SV-0012", "Withdrawal", "SV-FLEX", 600_000, "Bank"],
  [4829, "2026-12-10", "SV-0089", "Deposit", "SV-FIX", 2_000_000, "Bank"],
  [4830, "2026-12-14", "SV-0056", "Withdrawal", "SV-FLEX", 2_000_000, "Mobile Money"],
  [4831, "2026-12-17", "SV-0023", "Deposit", "SV-REG", 350_000, "Mobile Money"],
  [4832, "2026-12-21", "SV-0001", "Withdrawal", "SV-FLEX", 350_000, "Mobile Money"],
  [4833, "2026-12-23", "SV-0056", "Deposit", "SV-FLEX", 1_500_000, "Mobile Money"],
  [4834, "2026-12-28", "SV-0089", "Withdrawal", "SV-FLEX", 1_500_000, "Mobile Money"],
  [4835, "2026-12-30", "SV-0023", "Transfer", "SV-FLEX", 500_000, "Internal", "posted", "SV-LGS"],
  // ---- Jan 2027 (deposits 9.0M = withdrawals 9.0M) ----
  [4836, "2027-01-02", "SV-0042", "Deposit", "SV-REG", 200_000, "Standing Order"],
  [4837, "2027-01-05", "SV-0012", "Deposit", "SV-FLEX", 3_000_000, "Bank"],
  [4838, "2027-01-06", "SV-0089", "Deposit", "SV-FIX", 5_000_000, "Bank"],
  [4839, "2027-01-08", "SV-0056", "Withdrawal", "SV-FLEX", 3_200_000, "Bank"],
  [4840, "2027-01-12", "SV-0001", "Deposit", "SV-YSV", 150_000, "Cash"],
  [4841, "2027-01-15", "SV-0089", "Withdrawal", "SV-FLEX", 5_000_000, "Bank"],
  [4842, "2027-01-19", "SV-0023", "Deposit", "SV-REG", 350_000, "Mobile Money"],
  [4843, "2027-01-22", "SV-0012", "Withdrawal", "SV-REG", 500_000, "Cash"],
  [4844, "2027-01-27", "SV-0078", "Deposit", "SV-REG", 300_000, "Cash"],
  [4845, "2027-01-29", "SV-0001", "Withdrawal", "SV-FLEX", 300_000, "Mobile Money"],
  // ---- Feb 2027 (deposits 4.35M = withdrawals 4.35M) ----
  [4846, "2027-02-02", "SV-0042", "Deposit", "SV-REG", 200_000, "Standing Order"],
  [4847, "2027-02-04", "SV-0056", "Deposit", "SV-REG", 600_000, "Mobile Money"],
  [4848, "2027-02-08", "SV-0012", "Withdrawal", "SV-FLEX", 800_000, "Bank"],
  [4849, "2027-02-11", "SV-0023", "Deposit", "SV-REG", 350_000, "Mobile Money"],
  [4850, "2027-02-15", "SV-0089", "Deposit", "SV-FIX", 2_500_000, "Bank"],
  [4851, "2027-02-18", "SV-0001", "Withdrawal", "SV-FLEX", 2_850_000, "Bank"],
  [4852, "2027-02-22", "SV-0034", "Deposit", "SV-LGS", 400_000, "Cash"],
  [4853, "2027-02-24", "SV-0023", "Withdrawal", "SV-FLEX", 400_000, "Mobile Money"],
  [4854, "2027-02-26", "SV-0078", "Deposit", "SV-REG", 300_000, "Cash"],
  [4855, "2027-02-27", "SV-0056", "Withdrawal", "SV-FLEX", 300_000, "Mobile Money"],
];

const REF_PREFIX: Record<string, string> = { "Mobile Money": "MM", Bank: "BNK", Cash: "CSH", Internal: "TRF", "Standing Order": "SO" };

/** Newest first, as the pages list them. */
export const DEFAULT_SAVINGS_TXN: SavingsTxn[] = SEED_ROWS.map(([n, date, sv, type, product, amount, channel, status = "posted", toProduct]) => ({
  id: `TXN-${n}`,
  sv,
  member: ADMIN_MEMBERS_LIST.find((m) => m.sv_number === sv)?.name ?? sv,
  type,
  product,
  ...(toProduct ? { toProduct } : {}),
  amount,
  date,
  channel,
  reference: `${REF_PREFIX[channel] ?? "REF"}-${20000 + (n - 4800) * 37}`,
  status,
})).reverse();

/** Apply (sign = 1) or undo (sign = -1) a posted transaction on product balances. */
export function applyToProducts(products: SavingsProduct[], t: SavingsTxn, sign: 1 | -1 = 1): SavingsProduct[] {
  return products.map((p) => {
    let delta = 0;
    if (t.type === "Deposit" && p.code === t.product) delta = t.amount;
    if (t.type === "Withdrawal" && p.code === t.product) delta = -t.amount;
    if (t.type === "Transfer") {
      if (p.code === t.product) delta = -t.amount;
      if (p.code === t.toProduct) delta = t.amount;
    }
    return delta ? { ...p, balance: p.balance + sign * delta } : p;
  });
}

/**
 * Apply (sign = 1) or undo (sign = -1) a posted transaction on the member register's
 * savings column. Transfers move money between the member's own products, so the
 * member's total savings is unchanged.
 */
export function applyToMembers<M extends { sv_number: string; savings: number }>(members: M[], t: SavingsTxn, sign: 1 | -1 = 1): M[] {
  const delta = t.type === "Deposit" ? t.amount : t.type === "Withdrawal" ? -t.amount : 0;
  if (!delta) return members;
  return members.map((m) => (m.sv_number === t.sv ? { ...m, savings: Math.max(0, m.savings + sign * delta) } : m));
}

/** Next transaction reference: max existing number + 1 (never below TXN-4801). */
export function nextTxnId(txns: SavingsTxn[]): string {
  const max = txns.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, "")) || 0), 4800);
  return `TXN-${max + 1}`;
}

// ------------------------------------------------------------------
// Active loans ("admin_active_loans") and their schedule on the demo clock
// ------------------------------------------------------------------

export const LOANS_KEY = "admin_active_loans";

export interface Repayment { date: string; amount: number; principal: number; interest: number; auto?: boolean }

/**
 * Stored loan. For seed loans `balance` and `repayments` describe the position at
 * ANCHOR; standing-order installments falling due after ANCHOR are derived on read
 * (deriveLoan) rather than written, so the loan moves with the visitor's date.
 * Repayments a user records are stored on top and reduce `balance` directly.
 */
export interface ActiveLoan {
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

export interface ScheduleRow {
  installment: number;
  due_date: string;
  principal: number;
  interest: number;
  total: number;
  balance: number;
  status: string;
}

/**
 * Reducing-balance amortisation: equal installments P·r / (1 − (1 + r)^−n), interest on
 * the outstanding balance each month. The last row absorbs rounding so principal sums
 * exactly. Same arithmetic as the portal's LOAN_SCHEDULE, so James's figures agree.
 */
export function amortise(principal: number, ratePct: number, months: number, firstDue: string) {
  const r = ratePct / 100 / 12;
  const installment = r === 0 ? Math.round(principal / months) : Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
  let balance = principal;
  return Array.from({ length: months }, (_, i) => {
    const interest = Math.round(balance * r);
    const principalPart = i === months - 1 ? balance : Math.min(balance, installment - interest);
    balance -= principalPart;
    return { installment: i + 1, due_date: addMonthsKey(firstDue, i), principal: principalPart, interest, total: principalPart + interest, balance };
  });
}

/**
 * Seed loan whose outstanding balance at ANCHOR equals the member register's loans
 * column (ADMIN_MEMBERS_LIST). Installments due on or before `paidThrough` are marked
 * repaid in schedule order; any remainder (a small prepayment) is folded into the
 * last of them as extra principal.
 */
function seedLoan(id: string, sv: string, product: string, principal: number, rate: number, term: number, firstDue: string, paidThrough: string = ANCHOR): ActiveLoan {
  const rows = amortise(principal, rate, term, firstDue);
  const m = ADMIN_MEMBERS_LIST.find((x) => x.sv_number === sv);
  const balance = Math.min(principal, m?.loans ?? principal);
  const repaid = principal - balance;
  const repayments: Repayment[] = [];
  let cumulative = 0;
  for (const r of rows) {
    if (r.due_date > paidThrough || cumulative + r.principal > repaid) break;
    cumulative += r.principal;
    repayments.push({ date: r.due_date, amount: r.total, principal: r.principal, interest: r.interest });
  }
  const rest = repaid - cumulative;
  if (rest > 0) {
    const last = repayments[repayments.length - 1];
    if (last) repayments[repayments.length - 1] = { ...last, amount: last.amount + rest, principal: last.principal + rest };
    else repayments.push({ date: firstDue, amount: rest, principal: rest, interest: 0 });
  }
  return { id, sv, member: m?.name ?? sv, product, principal, rate, term, balance, disbursed: addMonthsKey(firstDue, -1), first_due: firstDue, repayments };
}

// Names/SV numbers match ADMIN_MEMBERS_LIST and each balance at ANCHOR equals that
// member's loans column. SV-LN-2026-0042 is James Mukasa's portal loan (8M @18%,
// 12 × 733,440 from 1 Jun 2026; 4,178,544 outstanding after the 1 Nov installment).
// David (SV-0034) stopped paying after Sep 2026 and Christine (SV-0095, suspended)
// after Aug 2026, so their arrears grow as the date moves; everyone else pays by
// standing order on each due date.
export const SEED_LOANS: ActiveLoan[] = [
  seedLoan("SV-LN-2026-0042", "SV-0042", "Short-Term Loan", 8_000_000, 18, 12, "2026-06-01"),
  seedLoan("LN-2026-0118", "SV-0023", "Short-Term Loan", 12_000_000, 18, 24, "2026-04-01"),
  seedLoan("LN-2026-0097", "SV-0001", "Development Loan", 8_500_000, 20, 24, "2026-01-01"),
  seedLoan("LN-2026-0061", "SV-0034", "School Fees Loan", 5_000_000, 16, 24, "2026-02-01", "2026-09-30"),
  seedLoan("LN-2026-0131", "SV-0056", "Business Loan", 14_200_000, 19, 36, "2026-05-01"),
  seedLoan("LN-2025-0388", "SV-0089", "Business Loan", 23_100_000, 19, 36, "2025-09-01"),
  seedLoan("LN-2026-0074", "SV-0095", "Emergency Loan", 6_000_000, 15, 12, "2026-06-01", "2026-08-31"),
];

/** Seed loans repaid by standing order on every due date (all but the two in arrears). */
const STANDING_ORDER_LOANS = new Set(SEED_LOANS.map((l) => l.id).filter((id) => id !== "LN-2026-0061" && id !== "LN-2026-0074"));

/**
 * Standing-order installments that fell due after ANCHOR and on or before `today`
 * (none for loans in arrears or created by users). Capped at the stored balance, so a
 * loan a user has already cleared stops collecting.
 */
export function autoRepayments(loan: ActiveLoan, today: string): Repayment[] {
  if (!STANDING_ORDER_LOANS.has(loan.id) || today <= ANCHOR) return [];
  let left = loan.balance;
  const out: Repayment[] = [];
  for (const row of amortise(loan.principal, loan.rate, loan.term, loan.first_due)) {
    if (row.due_date <= ANCHOR) continue;
    if (row.due_date > today || left <= 0) break;
    const principal = Math.min(left, row.principal);
    left -= principal;
    out.push({ date: row.due_date, amount: principal + row.interest, principal, interest: row.interest, auto: true });
  }
  return out;
}

/** The loan as it stands on `today`: stored position minus standing-order installments since ANCHOR. */
export function deriveLoan(loan: ActiveLoan, today: string): ActiveLoan {
  const auto = autoRepayments(loan, today);
  if (!auto.length) return loan;
  const paid = auto.reduce((a, r) => a + r.principal, 0);
  return {
    ...loan,
    balance: Math.max(0, loan.balance - paid),
    repayments: [...loan.repayments, ...auto].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Schedule with Paid / Overdue / Pending derived from principal repaid and `today`. Pass a derived loan. */
export function loanSchedule(loan: ActiveLoan, today: string): ScheduleRow[] {
  const repaid = loan.principal - loan.balance;
  let cumulative = 0;
  return amortise(loan.principal, loan.rate, loan.term, loan.first_due).map((row) => {
    cumulative += row.principal;
    const status = cumulative <= repaid + 1 ? "Paid" : row.due_date < today ? "Overdue" : "Pending";
    return { ...row, status };
  });
}

export function loanHealth(loan: ActiveLoan, schedule: ScheduleRow[]): "current" | "watch" | "arrears" | "closed" {
  if (loan.balance <= 0) return "closed";
  const overdue = schedule.filter((s) => s.status === "Overdue").length;
  return overdue === 0 ? "current" : overdue <= 2 ? "watch" : "arrears";
}

/** Principal collected by standing order since ANCHOR across a member's loans. */
export function memberAutoPaid(sv: string, loans: ActiveLoan[], today: string): number {
  return loans
    .filter((l) => l.sv === sv)
    .reduce((a, l) => a + autoRepayments(l, today).reduce((s, r) => s + r.principal, 0), 0);
}

/**
 * The register's loans column on `today`. The stored column tracks disbursements and
 * recorded repayments; standing-order installments since ANCHOR are taken off here,
 * so Members and Loans agree on any date.
 */
export function memberLoanOutstanding(m: { sv_number: string; loans: number }, loans: ActiveLoan[], today: string): number {
  return Math.max(0, m.loans - memberAutoPaid(m.sv_number, loans, today));
}

// ------------------------------------------------------------------
// Loan applications (KEYS.adminLoanApps)
// ------------------------------------------------------------------

/**
 * Loan application. The member portal appends records to the same key with only the
 * core fields, so everything past `status` is optional and `term` may be "12 months" or 12.
 */
export interface LoanApp {
  id: string;
  sv: string;
  member: string;
  product: string;
  amount: number;
  term: string | number;
  status: string; // pending_review | under_appraisal | approved | rejected | disbursed
  applied_date: string;
  score?: number;
  guarantors?: string[];
  purpose?: string;
  approve_note?: string;
  decline_reason?: string;
  decline_notes?: string;
  decided_date?: string;
  loan_id?: string;
}

export const isPendingLoanStatus = (s: string) => s === "pending_review" || s === "under_appraisal";

/**
 * Next application number for `year`, e.g. "LA-2026-0005". Takes the highest existing
 * LA-<year>-#### and adds one; legacy ids (seed "la-1", portal "la-k3x9…") don't parse,
 * so the count of applications is used as a floor to keep numbers looking sequential.
 */
export function nextLoanAppId(apps: { id: string }[], year: string): string {
  const re = new RegExp(`^LA-${year}-(\\d+)$`, "i");
  const max = apps.reduce((m, a) => {
    const hit = re.exec(a.id);
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, apps.length);
  return `LA-${year}-${String(max + 1).padStart(4, "0")}`;
}

// ------------------------------------------------------------------
// Dashboard approvals that cannot be derived from another record
// ------------------------------------------------------------------

export const PENDING_KEY = "admin_pending_approvals";

export type ManualApproval = (typeof ADMIN_PENDING_APPROVALS)[number];

/**
 * Loan applications, disbursements and withdrawals are derived live on the dashboard
 * from their source records, so they never live in the persisted approvals list.
 */
export function isDerivedApprovalType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("loan") || t.includes("withdrawal");
}

/** Seed for "admin_pending_approvals": only Profile Update and Manual Journal items. */
export const MANUAL_APPROVALS_SEED: ManualApproval[] = ADMIN_PENDING_APPROVALS.filter((p) => !isDerivedApprovalType(p.type));
