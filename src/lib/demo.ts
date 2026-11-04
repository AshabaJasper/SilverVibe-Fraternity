// ============================================================
// Guided demo mode helpers: "Load sample activity" and "Reset demo data".
//
// loadSampleActivity() appends a morning's worth of realistic SACCO activity,
// dated today, to the same persisted keys the pages read. Each key is read with
// the seed its page uses, so the new records sit on top of whatever the viewer
// has already done in this browser. saveToStorage() fires the change event, so
// mounted pages and header badges re-render immediately.
// ============================================================
"use client";

import { clearAllStorage, loadFromStorage, saveToStorage } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import {
  ADMIN_LOAN_APPLICATIONS,
  ADMIN_NOTIFICATIONS,
  ADMIN_PENDING_APPROVALS,
  MEMBER_SAVINGS,
  NOTIFICATIONS_DATA,
  RECENT_TRANSACTIONS,
} from "@/lib/mock-data";
import { formatCurrency, todayISO, uid } from "@/lib/utils";

// ------------------------------------------------------------------
// Record shapes (mirroring the pages that own each key)
// ------------------------------------------------------------------

/** admin/(shell)/savings/page.tsx → SavingsTxn */
interface SavingsTxn {
  id: string;
  sv: string;
  member: string;
  type: "Deposit" | "Withdrawal" | "Transfer";
  product: string;
  toProduct?: string;
  amount: number;
  date: string;
  channel: string;
  reference: string;
  status: "posted" | "pending" | "reversed" | "rejected";
}

/** admin/(shell)/savings/page.tsx → SavingsProduct */
interface SavingsProduct {
  code: string;
  name: string;
  rate: number;
  min: number;
  members: number;
  balance: number;
  status: "active" | "draft" | "suspended";
  description: string;
  color: string;
}

/** KEYS.adminLoanApps (admin loans page / portal AdminLoanApp) */
interface LoanApp {
  id: string;
  sv: string;
  member: string;
  product: string;
  amount: number;
  term: string | number;
  status: string;
  applied_date: string;
  score?: number;
  guarantors?: string[];
  purpose?: string;
}

type PendingApproval = (typeof ADMIN_PENDING_APPROVALS)[number];
type AdminNotification = (typeof ADMIN_NOTIFICATIONS)[number];
type MemberNotification = (typeof NOTIFICATIONS_DATA)[number];

/** admin/(shell)/communications/page.tsx → Announcement */
interface Announcement {
  id: string;
  title: string;
  message: string;
  channel: "SMS" | "Email" | "Push";
  audience: "all" | "active" | "defaulters" | "member";
  member_sv: string | null;
  status: "draft" | "scheduled" | "sent";
  created_at: string;
  scheduled_for: string | null;
  sent_at: string | null;
}

/** portal/(shell)/_lib/usePortalData.ts → PortalTxn */
interface PortalTxn {
  id: string;
  date: string;
  type: string;
  account: string;
  account_id: string;
  source_id?: string;
  amount: number;
  channel: string;
  status: string;
  direction: string;
}

/** portal/(shell)/_lib/usePortalData.ts → PortalAccount (fields we touch) */
interface PortalAccount {
  id: string;
  code: string;
  balance: number;
  available_balance: number;
  last_activity: string;
  [k: string]: unknown;
}

// ------------------------------------------------------------------
// Seeds the pages use but do not export (kept identical to the page sources).
// ------------------------------------------------------------------

const SAVINGS_TXN_KEY = "admin_savings_txn";
const SAVINGS_PRODUCTS_KEY = "admin_savings_products";
const PENDING_KEY = "admin_pending_approvals";
const ANNOUNCEMENTS_KEY = "admin_announcements";
const LOADED_KEY = "demo_sample_loaded";
const RUNS_KEY = "demo_sample_runs";

// Mirrors DEFAULT_PRODUCTS in src/app/admin/(shell)/savings/page.tsx
const SEED_SAVINGS_PRODUCTS: SavingsProduct[] = [
  { code: "SV-REG", name: "Regular Savings", rate: 5, min: 50_000, members: 789, balance: 2_100_000_000, status: "active", color: "#4A90D9", description: "Mandatory monthly savings that build members' borrowing power." },
  { code: "SV-FLEX", name: "Flexi/Wallet", rate: 3, min: 0, members: 512, balance: 850_000_000, status: "active", color: "#C0C0C0", description: "Voluntary wallet with free deposits and withdrawals via mobile money." },
  { code: "SV-FIX", name: "Fixed Savings", rate: 12, min: 1_000_000, members: 143, balance: 1_200_000_000, status: "active", color: "#22c55e", description: "Locked 6–24 month deposits earning a higher fixed rate." },
  { code: "SV-YSV", name: "Young Savers", rate: 6, min: 10_000, members: 96, balance: 180_000_000, status: "active", color: "#a855f7", description: "Savings for members' children under 18, managed by a parent." },
  { code: "SV-LGS", name: "Loan Guarantee", rate: 3, min: 0, members: 274, balance: 490_000_000, status: "active", color: "#f59e0b", description: "Savings held under lien as security for member loans." },
];

// Mirrors DEFAULT_TXN in src/app/admin/(shell)/savings/page.tsx
const SEED_SAVINGS_TXN: SavingsTxn[] = [
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

// Mirrors SEED_ANNOUNCEMENTS in src/app/admin/(shell)/communications/page.tsx
const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-agm", title: "AGM 2026 — notice of meeting", channel: "Email", audience: "all", member_sv: null, status: "sent",
    message: "Dear Member, you are invited to the SilverVibe Annual General Meeting on 12 December 2026 at Silver Springs Hotel, Kampala, from 9:00 AM. Agenda: FY 2025 financial statements, dividend declaration and board elections.",
    created_at: "2026-10-20T09:00:00", scheduled_for: null, sent_at: "2026-10-20T10:15:00",
  },
  {
    id: "ann-fixed", title: "New fixed savings rate", channel: "SMS", audience: "active", member_sv: null, status: "sent",
    message: "SilverVibe: Fixed savings now earn 13% p.a. on 12-month tenor from 1 Dec 2026. Visit any branch or the portal to lock in.",
    created_at: "2026-10-08T08:30:00", scheduled_for: null, sent_at: "2026-10-08T11:00:00",
  },
  {
    id: "ann-reminder", title: "Loan arrears reminder", channel: "SMS", audience: "defaulters", member_sv: null, status: "scheduled",
    message: "Dear {name}, your loan instalment of {amount} was due on {date}. Please pay via *165# or at any branch to avoid penalties.",
    created_at: "2026-11-03T15:20:00", scheduled_for: "2026-11-10T09:00", sent_at: null,
  },
  {
    id: "ann-agm-push", title: "AGM reminder — RSVP", channel: "Push", audience: "all", member_sv: null, status: "draft",
    message: "The AGM is on 12 Dec 2026 at Silver Springs Hotel. Tap to RSVP and download the FY 2025 report.",
    created_at: "2026-11-02T16:40:00", scheduled_for: null, sent_at: null,
  },
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Same "max existing + 1" scheme as nextTxnId() on the savings page. */
function nextTxnNumber(txns: SavingsTxn[]): number {
  return txns.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, "")) || 0), 4800) + 1;
}

/** Same as applyToProducts(…, 1) on the savings page, for posted transactions. */
function applyToProducts(products: SavingsProduct[], t: SavingsTxn): SavingsProduct[] {
  return products.map((p) => {
    let delta = 0;
    if (t.type === "Deposit" && p.code === t.product) delta = t.amount;
    if (t.type === "Withdrawal" && p.code === t.product) delta = -t.amount;
    if (t.type === "Transfer") {
      if (p.code === t.product) delta = -t.amount;
      if (p.code === t.toProduct) delta = t.amount;
    }
    return delta ? { ...p, balance: p.balance + delta } : p;
  });
}

const CHANNEL_PREFIX: Record<string, string> = { "Mobile Money": "MM", Bank: "BNK", Cash: "CSH", Internal: "TRF" };

/** Round to the nearest UGX 10,000 so amounts look like real deposits. */
const round10k = (n: number) => Math.max(10_000, Math.round(n / 10_000) * 10_000);

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * `count` local datetimes ("YYYY-MM-DDTHH:MM:00") spread over this morning, oldest
 * first, always earlier than now so "x min ago" labels stay sensible.
 */
function morningTimes(today: string, count: number): string[] {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const slots = [7 * 60 + 40, 8 * 60 + 25, 9 * 60 + 10, 9 * 60 + 55, 10 * 60 + 40, 11 * 60 + 20];
  const picked = slots.slice(0, count);
  // Early in the day: squeeze the slots into the minutes before now instead.
  const latest = picked[picked.length - 1] ?? 0;
  const mins = latest < nowMin ? picked : picked.map((_, i) => Math.max(0, nowMin - (count - i) * 6));
  return mins.map((m) => `${today}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Append a fresh morning of activity (dated today) across admin and member data.
 * Safe to call repeatedly: each run varies the amounts (and some members) using a
 * run counter, so repeated loads look like more activity rather than duplicates.
 */
export function loadSampleActivity(): { added: number } {
  if (typeof window === "undefined") return { added: 0 };

  const today = todayISO();
  const runs = loadFromStorage<number>(RUNS_KEY, 0);
  const loadedToday = loadFromStorage<string | null>(LOADED_KEY, null) === today;
  // Variation index: 0 on the first load of a day keeps the "canonical" sample.
  const v = loadedToday ? runs : 0;
  const scale = 1 + (v % 4) * 0.25 + Math.floor(v / 4) * 0.1;
  const amt = (base: number) => round10k(base * scale);
  let added = 0;

  // ---- Member portal: James's deposit (also mirrored in admin savings) ----
  const jamesDeposit = amt(300_000);

  // ---- Admin savings transactions ----
  const txns = loadFromStorage<SavingsTxn[]>(SAVINGS_TXN_KEY, SEED_SAVINGS_TXN);
  let products = loadFromStorage<SavingsProduct[]>(SAVINGS_PRODUCTS_KEY, SEED_SAVINGS_PRODUCTS);
  const bigWithdrawer = v % 2 === 0
    ? { sv: "SV-0089", member: "Samuel Byaruhanga", base: 4_500_000 }
    : { sv: "SV-0012", member: "Robert Kizza", base: 3_800_000 };
  const drafts: Omit<SavingsTxn, "id" | "reference" | "date">[] = [
    { sv: "SV-0001", member: "Alice Namugga", type: "Deposit", product: "SV-REG", amount: amt(450_000), channel: "Cash", status: "posted" },
    { sv: "SV-0042", member: "James Mukasa", type: "Deposit", product: "SV-REG", amount: jamesDeposit, channel: "Mobile Money", status: "posted" },
    { sv: "SV-0056", member: "Fatima Nankya", type: "Deposit", product: "SV-FLEX", amount: amt(750_000), channel: "Mobile Money", status: "posted" },
    { sv: "SV-0023", member: "Grace Nabirye", type: "Deposit", product: "SV-FIX", amount: amt(2_000_000), channel: "Bank", status: "posted" },
    { sv: "SV-0034", member: "David Ssempala", type: "Transfer", product: "SV-FLEX", toProduct: "SV-LGS", amount: amt(600_000), channel: "Internal", status: "posted" },
    // Above the UGX 2M threshold → waits for a second officer (maker-checker).
    { sv: bigWithdrawer.sv, member: bigWithdrawer.member, type: "Withdrawal", product: "SV-REG", amount: amt(bigWithdrawer.base), channel: "Bank", status: "pending" },
  ];
  let n = nextTxnNumber(txns);
  const newTxns: SavingsTxn[] = drafts.map((d) => {
    const id = `TXN-${n++}`;
    return { ...d, id, date: today, reference: `${CHANNEL_PREFIX[d.channel] ?? "TRF"}-${id.slice(4)}` };
  });
  for (const t of newTxns) if (t.status === "posted") products = applyToProducts(products, t);
  // Page lists newest first.
  saveToStorage(SAVINGS_TXN_KEY, [...newTxns.slice().reverse(), ...txns]);
  saveToStorage(SAVINGS_PRODUCTS_KEY, products);
  added += newTxns.length;
  const pendingWithdrawal = newTxns[newTxns.length - 1];

  // ---- Loan applications (never SV-0042, never suspended members) ----
  const apps = loadFromStorage<LoanApp[]>(KEYS.adminLoanApps, ADMIN_LOAN_APPLICATIONS);
  const appPairs: Omit<LoanApp, "id" | "applied_date" | "status">[][] = [
    [
      { sv: "SV-0001", member: "Alice Namugga", product: "School Fees Loan", amount: Math.min(10_000_000, amt(4_000_000)), term: "12 months", score: 84, guarantors: ["Robert Kizza", "Grace Nabirye"], purpose: "Term 1 school fees for two children" },
      { sv: "SV-0012", member: "Robert Kizza", product: "Development Loan", amount: Math.min(50_000_000, amt(15_000_000)), term: "24 months", score: 88, guarantors: ["Samuel Byaruhanga", "Alice Namugga"], purpose: "Roofing and finishing a rental unit in Mukono" },
    ],
    [
      { sv: "SV-0089", member: "Samuel Byaruhanga", product: "Business Loan", amount: Math.min(50_000_000, amt(18_000_000)), term: "24 months", score: 91, guarantors: ["Fatima Nankya", "Robert Kizza"], purpose: "Restocking hardware shop ahead of the festive season" },
      { sv: "SV-0023", member: "Grace Nabirye", product: "Emergency Loan", amount: Math.min(5_000_000, amt(2_500_000)), term: "6 months", score: 76, guarantors: ["Alice Namugga"], purpose: "Hospital bills for a family member" },
    ],
  ];
  const newApps: LoanApp[] = appPairs[v % 2].map((a) => ({ ...a, id: uid("la"), status: "pending_review", applied_date: today }));
  saveToStorage(KEYS.adminLoanApps, [...newApps, ...apps]);
  added += newApps.length;

  // ---- Pending approval on the dashboard (loan decision syncs to Loans) ----
  const pending = loadFromStorage<PendingApproval[]>(PENDING_KEY, ADMIN_PENDING_APPROVALS);
  const firstApp = newApps[0];
  const newPending: PendingApproval = {
    id: uid("pa"),
    type: "Loan Application",
    member: `${firstApp.member} (${firstApp.sv})`,
    amount: firstApp.amount,
    submitted: today,
    priority: "high",
  };
  saveToStorage(PENDING_KEY, [newPending, ...pending]);
  added += 1;

  // ---- Admin notifications (unread, spread over the morning) ----
  const adminNotifs = loadFromStorage<AdminNotification[]>(KEYS.adminNotifications, ADMIN_NOTIFICATIONS);
  const [t1, t2, t3] = morningTimes(today, 3);
  const newAdminNotifs: AdminNotification[] = [
    { id: uid("an"), title: "Withdrawal awaiting approval", desc: `${pendingWithdrawal.member} (${pendingWithdrawal.sv}) requested ${formatCurrency(pendingWithdrawal.amount)}`, time: t3, read: false, href: "/admin/savings?tab=transactions" },
    { id: uid("an"), title: "Loan approval pending", desc: `${firstApp.member} (${firstApp.sv}) applied for ${formatCurrency(firstApp.amount)}`, time: t2, read: false, href: "/admin/loans?tab=applications" },
    { id: uid("an"), title: "Savings deposit", desc: `${formatCurrency(jamesDeposit)} deposited by James Mukasa (SV-0042)`, time: t1, read: false, href: "/admin/savings?tab=transactions" },
  ];
  saveToStorage(KEYS.adminNotifications, [...newAdminNotifs, ...adminNotifs]);
  added += newAdminNotifs.length;

  // ---- Scheduled announcement ----
  const anns = loadFromStorage<Announcement[]>(ANNOUNCEMENTS_KEY, SEED_ANNOUNCEMENTS);
  const newAnn: Announcement = {
    id: uid("ann"),
    title: "Savings day reminder",
    message: "Dear {name}, tomorrow is SilverVibe savings day. Deposit your monthly contribution via *165# or the member portal to keep your streak going.",
    channel: "SMS",
    audience: "active",
    member_sv: null,
    status: "scheduled",
    created_at: t2,
    scheduled_for: `${tomorrowISO()}T09:00`,
    sent_at: null,
  };
  saveToStorage(ANNOUNCEMENTS_KEY, [newAnn, ...anns]);
  added += 1;

  // ---- Member portal: posted deposit + matching balance ----
  const portalTxns = loadFromStorage<PortalTxn[]>(KEYS.portalTransactions, RECENT_TRANSACTIONS);
  const newPortalTxn: PortalTxn = {
    id: uid("t"),
    date: today,
    type: "Deposit",
    account: "Regular Savings",
    account_id: "sa-001",
    amount: jamesDeposit,
    channel: "Mobile Money",
    status: "Posted",
    direction: "credit",
  };
  saveToStorage(KEYS.portalTransactions, [newPortalTxn, ...portalTxns]);
  added += 1;

  const accounts = loadFromStorage<PortalAccount[]>(KEYS.portalAccounts, MEMBER_SAVINGS as unknown as PortalAccount[]);
  saveToStorage(
    KEYS.portalAccounts,
    accounts.map((a) =>
      a.id === "sa-001"
        ? { ...a, balance: a.balance + jamesDeposit, available_balance: a.available_balance + jamesDeposit, last_activity: today }
        : a
    )
  );

  // ---- Member notifications (unread) ----
  const memberNotifs = loadFromStorage<MemberNotification[]>(KEYS.memberNotifications, NOTIFICATIONS_DATA);
  const newMemberNotifs: MemberNotification[] = [
    { id: uid("n"), type: "transaction", title: "Deposit Confirmed", message: `Your deposit of ${formatCurrency(jamesDeposit)} to Regular Savings has been posted.`, date: today, read: false, href: "/portal/savings" },
    { id: uid("n"), type: "announcement", title: "Savings Day Tomorrow", message: "Tomorrow is SilverVibe savings day. Deposit your monthly contribution to keep your streak going.", date: today, read: false, href: "/portal" },
  ];
  saveToStorage(KEYS.memberNotifications, [...newMemberNotifs, ...memberNotifs]);
  added += newMemberNotifs.length;

  saveToStorage(LOADED_KEY, today);
  saveToStorage(RUNS_KEY, loadedToday ? runs + 1 : 1);

  return { added };
}

/** Wipe every demo change in this browser and reload with the original data. */
export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  clearAllStorage();
  window.location.reload();
}
