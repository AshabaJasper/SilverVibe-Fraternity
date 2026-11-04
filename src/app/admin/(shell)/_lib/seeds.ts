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

// Names/SV numbers match ADMIN_MEMBERS_LIST; several mirror dashboard activity.
// TXN-4819 (David Ssempala, pending) is the withdrawal the dashboard asks to approve.
export const DEFAULT_SAVINGS_TXN: SavingsTxn[] = [
  { id: "TXN-4821", sv: "SV-0056", member: "Fatima Nankya", type: "Deposit", product: "SV-REG", amount: 500_000, date: "2026-11-04", channel: "Mobile Money", reference: "MM-882134", status: "posted" },
  { id: "TXN-4820", sv: "SV-0012", member: "Robert Kizza", type: "Withdrawal", product: "SV-FLEX", amount: 2_000_000, date: "2026-11-04", channel: "Bank", reference: "BNK-55102", status: "posted" },
  { id: "TXN-4819", sv: "SV-0034", member: "David Ssempala", type: "Withdrawal", product: "SV-REG", amount: 3_000_000, date: "2026-11-03", channel: "Cash", reference: "CSH-20931", status: "pending" },
  { id: "TXN-4818", sv: "SV-0042", member: "James Mukasa", type: "Deposit", product: "SV-REG", amount: 200_000, date: "2026-11-02", channel: "Mobile Money", reference: "MM-880017", status: "posted" },
  { id: "TXN-4817", sv: "SV-0089", member: "Samuel Byaruhanga", type: "Deposit", product: "SV-FIX", amount: 5_000_000, date: "2026-11-01", channel: "Bank", reference: "BNK-55087", status: "posted" },
  { id: "TXN-4816", sv: "SV-0001", member: "Alice Namugga", type: "Deposit", product: "SV-YSV", amount: 150_000, date: "2026-10-28", channel: "Cash", reference: "CSH-20877", status: "posted" },
  { id: "TXN-4815", sv: "SV-0023", member: "Grace Nabirye", type: "Transfer", product: "SV-FLEX", toProduct: "SV-LGS", amount: 1_000_000, date: "2026-10-22", channel: "Internal", reference: "TRF-1093", status: "posted" },
  { id: "TXN-4814", sv: "SV-0042", member: "James Mukasa", type: "Deposit", product: "SV-FLEX", amount: 500_000, date: "2026-10-18", channel: "Mobile Money", reference: "MM-861120", status: "posted" },
  { id: "TXN-4813", sv: "SV-0078", member: "Martha Apio", type: "Deposit", product: "SV-REG", amount: 300_000, date: "2026-10-15", channel: "Cash", reference: "CSH-20790", status: "posted" },
  { id: "TXN-4812", sv: "SV-0042", member: "James Mukasa", type: "Withdrawal", product: "SV-FLEX", amount: 1_000_000, date: "2026-10-09", channel: "Bank", reference: "BNK-54920", status: "posted" },
  { id: "TXN-4811", sv: "SV-0067", member: "Peter Okello", type: "Withdrawal", product: "SV-REG", amount: 400_000, date: "2026-10-05", channel: "Cash", reference: "CSH-20702", status: "rejected" },
];

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
