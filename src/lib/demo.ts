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
  ADMIN_MEMBERS_LIST,
  ADMIN_NOTIFICATIONS,
  MEMBER_SAVINGS,
  NOTIFICATIONS_DATA,
  RECENT_TRANSACTIONS,
} from "@/lib/mock-data";
import { formatCurrency, todayISO, uid } from "@/lib/utils";
// Savings seeds, loan-application shape and balance rules are shared with the admin
// pages so the sample activity lands exactly where (and how) the pages expect it.
import {
  DEFAULT_SAVINGS_PRODUCTS,
  DEFAULT_SAVINGS_TXN,
  SAVINGS_PRODUCTS_KEY,
  SAVINGS_TXN_KEY,
  applyToMembers,
  applyToProducts,
  nextLoanAppId,
  nextTxnId,
  type LoanApp,
  type Member,
  type SavingsProduct,
  type SavingsTxn,
} from "@/app/admin/(shell)/_lib/seeds";

// ------------------------------------------------------------------
// Record shapes (mirroring the pages that own each key)
// ------------------------------------------------------------------

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

const ANNOUNCEMENTS_KEY = "admin_announcements";
const LOADED_KEY = "demo_sample_loaded";
const RUNS_KEY = "demo_sample_runs";

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
  const txns = loadFromStorage<SavingsTxn[]>(SAVINGS_TXN_KEY, DEFAULT_SAVINGS_TXN);
  let products = loadFromStorage<SavingsProduct[]>(SAVINGS_PRODUCTS_KEY, DEFAULT_SAVINGS_PRODUCTS);
  let members = loadFromStorage<Member[]>(KEYS.adminMembers, ADMIN_MEMBERS_LIST);
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
  const newTxns: SavingsTxn[] = [];
  for (const d of drafts) {
    const id = nextTxnId([...newTxns, ...txns]);
    newTxns.push({ ...d, id, date: today, reference: `${CHANNEL_PREFIX[d.channel] ?? "TRF"}-${id.slice(4)}` });
  }
  // Posted transactions move product balances and the member register's savings column.
  for (const t of newTxns) {
    if (t.status !== "posted") continue;
    products = applyToProducts(products, t);
    members = applyToMembers(members, t);
  }
  // Page lists newest first.
  saveToStorage(SAVINGS_TXN_KEY, [...newTxns.slice().reverse(), ...txns]);
  saveToStorage(SAVINGS_PRODUCTS_KEY, products);
  saveToStorage(KEYS.adminMembers, members);
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
  // Sequential LA-<year>-#### ids, same scheme as the admin Loans page.
  const newApps: LoanApp[] = [];
  for (const a of appPairs[v % 2]) {
    newApps.push({ ...a, id: nextLoanAppId([...newApps, ...apps], today.slice(0, 4)), status: "pending_review", applied_date: today });
  }
  saveToStorage(KEYS.adminLoanApps, [...newApps, ...apps]);
  added += newApps.length;
  // The dashboard's Pending Approvals derives loan and withdrawal items from these
  // records, so nothing extra is written to its list.
  const firstApp = newApps[0];

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
