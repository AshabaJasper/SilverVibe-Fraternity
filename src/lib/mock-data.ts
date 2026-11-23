// ============================================================
// DEMO DATA — SilverVibe Fraternity Cooperative Society Ltd
//
// The data tells one story from Sep 2026 to Feb 2027 (see demo-clock.ts).
// Everything up to ANCHOR (23 Nov 2026) is history; records dated after it
// are revealed as the real date reaches them.
// ============================================================
import { ANCHOR, TIMELINE_EVENTS as EV, trailingSeries, monthKey } from "./demo-clock";

export const DEMO_MEMBER = {
  id: "m-001",
  sv_number: "SV-0042",
  full_name: "James Mukasa",
  gender: "Male",
  date_of_birth: "1991-02-15",
  national_id: "CM84029485HDKFJ",
  email: "james.mukasa@silvervibe.coop",
  phone: "+256 770 123 456",
  phone2: "+256 700 987 654",
  address: "Plot 14, Kampala Road, Kampala",
  status: "Active",
  kyc_status: "Verified",
  date_joined: "2023-11-10",
  profile_photo: null,
};

export const DEMO_ADMIN = {
  id: "a-001",
  full_name: "Sarah Nakamya",
  email: "admin@silvervibe.coop",
  role: "Super Admin",
  last_login: "2026-11-23T08:30:00",
};

// Member savings accounts
export const MEMBER_SAVINGS = [
  {
    id: "sa-001",
    product: "SilverVibe Regular Savings",
    code: "SV-REG",
    account_number: "SV-0042-REG",
    balance: 12_450_000,
    available_balance: 8_450_000,
    accrued_interest: 186_750,
    minimum_balance: 4_000_000,
    monthly_target: 200_000,
    monthly_contributed: 200_000,
    status: "Active",
    last_activity: "2026-11-02",
    streak: 6,
    color: "#1A1A1A",
  },
  {
    id: "sa-002",
    product: "SilverVibe Flexi/Wallet",
    code: "SV-FLEX",
    account_number: "SV-0042-FLEX",
    balance: 3_250_000,
    available_balance: 3_250_000,
    accrued_interest: 24_375,
    minimum_balance: 0,
    monthly_target: 0,
    monthly_contributed: 0,
    status: "Active",
    last_activity: "2026-11-19",
    streak: 0,
    color: "#4A90D9",
  },
  {
    id: "sa-003",
    product: "SilverVibe Fixed Savings",
    code: "SV-FIX",
    account_number: "SV-0042-FIX",
    balance: 10_000_000,
    available_balance: 0,
    accrued_interest: 500_000,
    minimum_balance: 5_000_000,
    monthly_target: 0,
    monthly_contributed: 0,
    status: "Active",
    last_activity: "2026-04-15",
    maturity_date: "2027-04-15",
    tenor: "12 months",
    interest_rate: "12%",
    streak: 0,
    color: "#22c55e",
  },
  {
    id: "sa-004",
    product: "Loan Guarantee Savings",
    code: "SV-LGS",
    account_number: "SV-0042-LGS",
    balance: 2_000_000,
    available_balance: 0,
    accrued_interest: 30_000,
    minimum_balance: 2_000_000,
    lien_amount: 2_000_000,
    monthly_target: 0,
    monthly_contributed: 0,
    status: "Active",
    last_activity: "2026-08-01",
    streak: 0,
    color: "#f59e0b",
  },
];

// Loan schedule is computed so the numbers always reconcile with the principal.
// Reducing-balance amortisation: installment = P·r / (1 − (1 + r)^−n)
function buildSchedule(principal: number, annualRatePct: number, months: number, firstDue: string, paidCount: number) {
  const r = annualRatePct / 100 / 12;
  const installment = Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
  const [y0, m0] = firstDue.split("-").map(Number);
  let balance = principal;
  return Array.from({ length: months }, (_, i) => {
    const interest = Math.round(balance * r);
    // Final installment absorbs rounding so principal sums exactly.
    const principalPart = i === months - 1 ? balance : installment - interest;
    balance -= principalPart;
    const d = new Date(y0, m0 - 1 + i, 1);
    const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return {
      installment: i + 1,
      due_date: due,
      principal: principalPart,
      interest,
      total: principalPart + interest,
      balance,
      status: i < paidCount ? "Paid" : "Pending",
    };
  });
}

export const LOAN_SCHEDULE = buildSchedule(8_000_000, 18, 12, "2026-06-01", 6);

const _pending = LOAN_SCHEDULE.filter((s) => s.status === "Pending");
const _paid = LOAN_SCHEDULE.filter((s) => s.status === "Paid");

export const MEMBER_LOANS = [
  {
    id: "ln-001",
    product: "Short-Term Loan",
    loan_number: "SV-LN-2026-0042",
    principal: 8_000_000,
    outstanding_principal: _pending.reduce((a, s) => a + s.principal, 0),
    outstanding_interest: _pending.reduce((a, s) => a + s.interest, 0),
    total_outstanding: _pending.reduce((a, s) => a + s.total, 0),
    interest_rate: "18%",
    interest_method: "Reducing Balance",
    disbursement_date: "2026-05-01",
    maturity_date: LOAN_SCHEDULE[LOAN_SCHEDULE.length - 1].due_date,
    next_payment_date: _pending[0].due_date,
    next_payment_amount: _pending[0].total,
    monthly_installment: LOAN_SCHEDULE[0].total,
    status: "Active",
    days_in_arrears: 0,
    repayment_progress: Math.round((_paid.length / LOAN_SCHEDULE.length) * 100),
    payments_made: _paid.length,
    total_payments: LOAN_SCHEDULE.length,
  },
];

export const MEMBER_SHARES = {
  num_shares: 250,
  share_value: 20_000,
  total_value: 5_000_000,
  share_premium: 0,
  certificates: [
    { number: "SV-CERT-0042", shares: 100, date: "2023-11-10", amount: 2_000_000 },
    { number: "SV-CERT-0089", shares: 75, date: "2024-09-15", amount: 1_500_000 },
    { number: "SV-CERT-0134", shares: 75, date: "2026-02-20", amount: 1_500_000 },
  ],
  dividends: [
    { year: "FY 2023/24", rate: "8%", amount: 160_000, paid_date: "2025-03-15" },
    { year: "FY 2024/25", rate: "10%", amount: 350_000, paid_date: "2026-03-20" },
  ],
};

export const MEMBER_IU = {
  unit_balance: 15,
  total_invested: 1_500_000,
  accrued_returns: 225_000,
  current_value: 1_725_000,
};

export const RECENT_TRANSACTIONS = [
  { id: "t-001", date: "2026-11-19", type: "Deposit", account: "Flexi/Wallet", account_id: "sa-002", amount: 500_000, channel: "Mobile Money", status: "Posted", direction: "credit" },
  { id: "t-002", date: "2026-11-02", type: "Deposit", account: "Regular Savings", account_id: "sa-001", amount: 200_000, channel: "Standing Order", status: "Posted", direction: "credit" },
  { id: "t-003", date: "2026-11-01", type: "Loan Repayment", account: "Short-Term Loan", account_id: "ln-001", amount: 733_440, channel: "Standing Order", status: "Posted", direction: "debit" },
  { id: "t-004", date: "2026-10-09", type: "Withdrawal", account: "Flexi/Wallet", account_id: "sa-002", amount: 1_000_000, channel: "Bank Transfer", status: "Posted", direction: "debit" },
  { id: "t-005", date: "2026-10-02", type: "Deposit", account: "Regular Savings", account_id: "sa-001", amount: 200_000, channel: "Standing Order", status: "Posted", direction: "credit" },
  { id: "t-006", date: "2026-10-01", type: "Loan Repayment", account: "Short-Term Loan", account_id: "ln-001", amount: 733_440, channel: "Standing Order", status: "Posted", direction: "debit" },
  { id: "t-007", date: "2026-09-10", type: "Share Purchase", account: "Share Capital", account_id: "shares", amount: 500_000, channel: "Cash", status: "Posted", direction: "debit" },
  { id: "t-008", date: "2026-09-02", type: "Deposit", account: "Regular Savings", account_id: "sa-001", amount: 200_000, channel: "Standing Order", status: "Posted", direction: "credit" },
  { id: "t-009", date: "2026-09-01", type: "Loan Repayment", account: "Short-Term Loan", account_id: "ln-001", amount: 733_440, channel: "Standing Order", status: "Posted", direction: "debit" },
];

/** Member savings by account for the 6 months ending at `today` (Regular grows by the standing order). */
export function savingsHistory(today: string) {
  const regular = trailingSeries(today, 6, 12_450_000, [EV.savingsStandingOrderAmount / 12_000_000]);
  const flexi = trailingSeries(today, 6, 3_250_000, [0.06, -0.03, 0.08, 0.02]);
  return regular.map((r, i) => ({ key: r.key, month: r.month, regular: r.value, flexi: Math.round(flexi[i].value / 10_000) * 10_000, fixed: 10_000_000 }));
}
/** @deprecated use savingsHistory(today) */
export const SAVINGS_HISTORY = savingsHistory(ANCHOR);

/** Member-facing announcements. Future-dated ones appear when their date arrives. */
export const ANNOUNCEMENTS = [
  {
    id: "ann-agm-notice",
    title: "Notice of Annual General Meeting",
    content: `Dear Members, the Annual General Meeting will be held on Saturday 20 February 2027 at ${EV.agmVenue} from 9:00 AM. Agenda: FY 2025/26 audited accounts, dividend declaration and board elections. Please confirm attendance through the portal.`,
    date: "2027-01-20",
    priority: "high",
  },
  {
    id: "ann-festive",
    title: "Festive season office hours",
    content: "Our offices will be closed from 24 December 2026 and reopen on Monday 4 January 2027. Mobile Money deposits and the member portal remain available throughout.",
    date: "2026-12-18",
    priority: "normal",
  },
  {
    id: "ann-agm-save-date",
    title: "Save the date: AGM on 20 February 2027",
    content: `The Annual General Meeting will take place on 20 February 2027 at ${EV.agmVenue}. The FY 2025/26 dividend will be declared at the meeting.`,
    date: "2026-11-21",
    priority: "high",
  },
  {
    id: "ann-fixed-rate",
    title: "New fixed savings rate from 1 January",
    content: "We are pleased to announce an increased fixed savings rate of 13% p.a. for the 12-month tenor, effective 1 January 2027. Lock in your savings today!",
    date: "2026-11-20",
    priority: "normal",
  },
  {
    id: "ann-momo",
    title: "Mobile Money deposits now available",
    content: "You can now deposit directly from your mobile money account. Dial *165# and follow the prompts to deposit into your SilverVibe account.",
    date: "2026-10-05",
    priority: "normal",
  },
];

/**
 * Member notifications. Records dated after ANCHOR are revealed on their date
 * (pages and the header filter with isRevealed). Dates are YYYY-MM-DD.
 */
export const NOTIFICATIONS_DATA = [
  // ---- future, revealed as the date arrives ----
  { id: "n-2027-02-20", type: "announcement", title: "FY 2025/26 dividend declared", message: "The AGM declared an 11% dividend for FY 2025/26, payable on 15 March 2027.", date: "2027-02-20", read: false, href: "/portal/shares" },
  { id: "n-2027-02-13", type: "reminder", title: "AGM this Saturday", message: "Reminder: the AGM is on 20 February 2027 at Silver Springs Hotel from 9:00 AM.", date: "2027-02-13", read: false, href: "/portal" },
  { id: "n-2027-02-01", type: "system", title: "Statement Ready", message: "Your January 2027 statement is ready for download.", date: "2027-02-01", read: false, href: "/portal/savings?action=statement" },
  { id: "n-2027-01-27", type: "reminder", title: "Loan Repayment Due", message: "Your loan repayment of UGX 733,440 will be collected on 1 February 2027.", date: "2027-01-27", read: false, href: "/portal/loans" },
  { id: "n-2027-01-20", type: "announcement", title: "AGM notice", message: "The Annual General Meeting will be held on 20 February 2027. Please confirm attendance.", date: "2027-01-20", read: false, href: "/portal" },
  { id: "n-2027-01-01", type: "system", title: "Statement Ready", message: "Your December 2026 statement is ready for download.", date: "2027-01-01", read: false, href: "/portal/savings?action=statement" },
  { id: "n-2026-12-27", type: "reminder", title: "Loan Repayment Due", message: "Your loan repayment of UGX 733,440 will be collected on 1 January 2027.", date: "2026-12-27", read: false, href: "/portal/loans" },
  { id: "n-2026-12-18", type: "announcement", title: "Festive season office hours", message: "Offices close on 24 December and reopen on 4 January. The portal stays open.", date: "2026-12-18", read: false, href: "/portal" },
  { id: "n-2026-12-01", type: "system", title: "Statement Ready", message: "Your November 2026 statement is ready for download.", date: "2026-12-01", read: false, href: "/portal/savings?action=statement" },
  { id: "n-2026-11-26", type: "reminder", title: "Loan Repayment Due", message: "Your loan repayment of UGX 733,440 will be collected on 1 December 2026.", date: "2026-11-26", read: false, href: "/portal/loans" },
  // ---- history up to ANCHOR ----
  { id: "n-001", type: "announcement", title: "Save the date: AGM", message: "The Annual General Meeting is on 20 February 2027 at Silver Springs Hotel.", date: "2026-11-21", read: false, href: "/portal" },
  { id: "n-002", type: "transaction", title: "Deposit Confirmed", message: "Your Mobile Money deposit of UGX 500,000 to Flexi/Wallet has been posted.", date: "2026-11-19", read: false, href: "/portal/savings" },
  { id: "n-003", type: "loan", title: "Guarantor Request", message: "Fatima Nankya (SV-0056) listed you as a guarantor for a Business Loan.", date: "2026-11-10", read: true, href: "/portal/loans" },
  { id: "n-004", type: "transaction", title: "Standing order paid", message: "UGX 200,000 was saved to Regular Savings by standing order.", date: "2026-11-02", read: true, href: "/portal/savings" },
  { id: "n-005", type: "transaction", title: "Loan Payment Received", message: "Your loan repayment of UGX 733,440 has been posted.", date: "2026-11-01", read: true, href: "/portal/loans" },
  { id: "n-006", type: "system", title: "Statement Ready", message: "Your October 2026 statement is ready for download.", date: "2026-11-01", read: true, href: "/portal/savings?action=statement" },
];

export type MemberNotification = (typeof NOTIFICATIONS_DATA)[number];

/** Admin bell notifications. Times after ANCHOR are revealed when reached. */
export const ADMIN_NOTIFICATIONS = [
  // ---- future, revealed as the time arrives ----
  { id: "an-2027-02-20", title: "AGM concluded", desc: "FY 2025/26 dividend of 11% declared; payable 15 Mar 2027", time: "2027-02-20T15:30:00", read: false, href: "/admin/shares?tab=dividends" },
  { id: "an-2027-01-20", title: "AGM notice sent", desc: "Notice of AGM sent to 847 members by SMS and email", time: "2027-01-20T09:01:00", read: false, href: "/admin/communications?tab=history" },
  { id: "an-2027-01-01", title: "Fixed savings rate updated", desc: "New 13% p.a. rate on 12-month fixed savings is now live", time: "2027-01-01T00:05:00", read: false, href: "/admin/savings?tab=products" },
  { id: "an-2026-12-12", title: "Board meeting today", desc: "Quarterly board meeting at 2:00 PM — PAR and AGM preparations", time: "2026-12-12T07:30:00", read: false, href: "/admin" },
  { id: "an-2026-12-01", title: "Arrears reminders sent", desc: "SMS reminders sent to members with overdue installments", time: "2026-12-01T09:01:00", read: false, href: "/admin/communications?tab=history" },
  // ---- history up to ANCHOR ----
  { id: "an-1", title: "Savings deposit", desc: "UGX 500,000 deposited by Fatima Nankya (SV-0056)", time: "2026-11-23T09:15:00", read: false, href: "/admin/savings?tab=transactions" },
  { id: "an-2", title: "Loan approval pending", desc: "Grace Nabirye (SV-0023) applied for UGX 5,000,000", time: "2026-11-22T15:02:00", read: false, href: "/admin/loans?tab=applications" },
  { id: "an-3", title: "New member registered", desc: "Martha Apio (SV-0078) submitted a registration form", time: "2026-11-22T10:45:00", read: false, href: "/admin/members?q=SV-0078" },
  { id: "an-4", title: "System backup completed", desc: "Daily backup completed successfully", time: "2026-11-23T03:00:00", read: true, href: "/admin/settings?tab=system" },
  { id: "an-5", title: "Interest computation done", desc: "Monthly interest calculated for all accounts", time: "2026-10-31T23:00:00", read: true, href: "/admin/accounting?tab=journal" },
];

export type AdminNotification = (typeof ADMIN_NOTIFICATIONS)[number];


// ============= Admin Data =============

export const ADMIN_KPI = {
  total_members: { value: 847, active: 789, inactive: 38, dormant: 20, change: 5.2 },
  total_savings: { value: 4_820_000_000, change: 8.4 },
  total_loan_book: { value: 2_150_000_000, change: 3.1 },
  par_30: { value: 4.2, change: -0.8 },
  total_share_capital: { value: 1_280_000_000, change: 12.5 },
  monthly_collections: { value: 380_000_000, target: 420_000_000, percent: 90.5 },
  pending_approvals: { value: 12 },
};

export const ADMIN_MEMBERS_LIST = [
  { sv_number: "SV-0001", name: "Alice Namugga", phone: "+256 770 111 111", email: "alice@email.com", status: "active", kyc: "verified", savings: 28_500_000, loans: 5_000_000, shares: 8_000_000, joined: "2020-09-15" },
  { sv_number: "SV-0012", name: "Robert Kizza", phone: "+256 700 222 222", email: "robert@email.com", status: "active", kyc: "verified", savings: 42_300_000, loans: 0, shares: 12_000_000, joined: "2020-11-22" },
  { sv_number: "SV-0023", name: "Grace Nabirye", phone: "+256 780 333 333", email: "grace@email.com", status: "active", kyc: "verified", savings: 15_700_000, loans: 8_000_000, shares: 5_000_000, joined: "2022-02-10" },
  { sv_number: "SV-0034", name: "David Ssempala", phone: "+256 750 444 444", email: "david@email.com", status: "active", kyc: "incomplete", savings: 8_900_000, loans: 3_500_000, shares: 3_000_000, joined: "2022-05-05" },
  { sv_number: "SV-0042", name: "James Mukasa", phone: "+256 770 123 456", email: "james.mukasa@silvervibe.coop", status: "active", kyc: "verified", savings: 27_700_000, loans: 4_178_544, shares: 5_000_000, joined: "2023-11-10" },
  { sv_number: "SV-0056", name: "Fatima Nankya", phone: "+256 700 555 555", email: "fatima@email.com", status: "active", kyc: "verified", savings: 35_600_000, loans: 12_000_000, shares: 7_000_000, joined: "2022-09-20" },
  { sv_number: "SV-0067", name: "Peter Okello", phone: "+256 780 666 666", email: "peter@email.com", status: "dormant", kyc: "verified", savings: 4_200_000, loans: 0, shares: 2_000_000, joined: "2021-04-12" },
  { sv_number: "SV-0078", name: "Martha Apio", phone: "+256 750 777 777", email: "martha@email.com", status: "pending", kyc: "pending", savings: 6_800_000, loans: 0, shares: 3_000_000, joined: "2026-07-08" },
  { sv_number: "SV-0089", name: "Samuel Byaruhanga", phone: "+256 770 888 888", email: "samuel@email.com", status: "active", kyc: "verified", savings: 52_100_000, loans: 15_000_000, shares: 15_000_000, joined: "2020-10-28" },
  { sv_number: "SV-0095", name: "Christine Tumwine", phone: "+256 700 999 999", email: "christine@email.com", status: "suspended", kyc: "verified", savings: 3_100_000, loans: 4_500_000, shares: 2_000_000, joined: "2023-03-14" },
];

/** Total savings for the 12 months ending at `today`; the last point equals the KPI. */
export function savingsGrowth(today: string) {
  return trailingSeries(today, 12, ADMIN_KPI.total_savings.value, [0.012, 0.02, 0.035, 0.03, 0.04, 0.035, 0.03, 0.03, 0.028, 0.02, 0.018, 0.015], 10_000_000)
    .map((p) => ({ key: p.key, month: p.month, amount: p.value }));
}
/** @deprecated use savingsGrowth(today) */
export const ADMIN_SAVINGS_GROWTH = savingsGrowth(ANCHOR);

/** Monthly disbursements vs recoveries, authored by calendar month across the story. */
const LOAN_PERFORMANCE_BY_MONTH: { key: string; disbursed: number; recovered: number }[] = [
  { key: "2026-03", disbursed: 240_000_000, recovered: 270_000_000 },
  { key: "2026-04", disbursed: 260_000_000, recovered: 285_000_000 },
  { key: "2026-05", disbursed: 300_000_000, recovered: 290_000_000 },
  { key: "2026-06", disbursed: 280_000_000, recovered: 310_000_000 },
  { key: "2026-07", disbursed: 320_000_000, recovered: 290_000_000 },
  { key: "2026-08", disbursed: 250_000_000, recovered: 305_000_000 },
  { key: "2026-09", disbursed: 190_000_000, recovered: 340_000_000 },
  { key: "2026-10", disbursed: 350_000_000, recovered: 280_000_000 },
  { key: "2026-11", disbursed: 300_000_000, recovered: 320_000_000 },
  { key: "2026-12", disbursed: 220_000_000, recovered: 335_000_000 },
  { key: "2027-01", disbursed: 380_000_000, recovered: 300_000_000 },
  { key: "2027-02", disbursed: 330_000_000, recovered: 325_000_000 },
];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The `n` months of loan performance ending at today's month. */
export function loanPerformance(today: string, n = 6) {
  const end = monthKey(today);
  return LOAN_PERFORMANCE_BY_MONTH.filter((m) => m.key <= end)
    .slice(-n)
    .map((m) => ({ key: m.key, month: SHORT[Number(m.key.slice(5, 7)) - 1], disbursed: m.disbursed, recovered: m.recovered }));
}
/** @deprecated use loanPerformance(today) */
export const ADMIN_LOAN_PERFORMANCE = loanPerformance(ANCHOR);

export const ADMIN_PRODUCT_DISTRIBUTION = [
  { name: "Regular Savings", value: 2_100_000_000, color: "#1A1A1A" },
  { name: "Flexi/Wallet", value: 850_000_000, color: "#4A90D9" },
  { name: "Fixed Savings", value: 1_200_000_000, color: "#22c55e" },
  { name: "Young Savers", value: 180_000_000, color: "#a855f7" },
  { name: "Loan Guarantee", value: 490_000_000, color: "#f59e0b" },
];

export const ADMIN_RECENT_ACTIVITY = [
  { id: "aa-1", time: "09:15 AM", action: "Deposit", detail: "SV-0056 deposited UGX 500,000 to Regular Savings", status: "posted", user: "System" },
  { id: "aa-2", time: "09:02 AM", action: "Loan Application", detail: "SV-0023 applied for Short-Term Loan of UGX 5,000,000", status: "pending", user: "Grace Nabirye" },
  { id: "aa-3", time: "08:45 AM", action: "Member Registration", detail: "New member Martha Apio (SV-0078) registered", status: "completed", user: "Savings Officer" },
  { id: "aa-4", time: "08:30 AM", action: "Withdrawal", detail: "SV-0012 withdrew UGX 2,000,000 from Flexi Savings", status: "approved", user: "Checker: CEO" },
  { id: "aa-5", time: "Yesterday", action: "Interest Posting", detail: "Monthly interest accrual computed for all accounts", status: "completed", user: "System" },
  { id: "aa-6", time: "Yesterday", action: "Loan Repayment", detail: "SV-0089 repaid UGX 1,200,000 on Business Loan", status: "posted", user: "System" },
];

export const ADMIN_PENDING_APPROVALS = [
  { id: "pa-1", type: "Loan Application", member: "Grace Nabirye (SV-0023)", amount: 5_000_000, submitted: "2026-11-22", priority: "high" },
  { id: "pa-2", type: "Withdrawal", member: "David Ssempala (SV-0034)", amount: 3_000_000, submitted: "2026-11-22", priority: "medium" },
  { id: "pa-3", type: "Profile Update", member: "Peter Okello (SV-0067)", amount: null, submitted: "2026-11-21", priority: "low" },
  { id: "pa-4", type: "Loan Disbursement", member: "Fatima Nankya (SV-0056)", amount: 12_000_000, submitted: "2026-11-21", priority: "high" },
  { id: "pa-5", type: "Manual Journal", member: "Accountant Entry", amount: 1_500_000, submitted: "2026-11-20", priority: "medium" },
];

export const ADMIN_LOAN_APPLICATIONS = [
  { id: "la-1", sv: "SV-0023", member: "Grace Nabirye", product: "Short-Term Loan", amount: 5_000_000, term: "12 months", status: "pending_review", applied_date: "2026-11-22", score: 78, guarantors: ["Alice Namugga", "Robert Kizza"] },
  { id: "la-2", sv: "SV-0056", member: "Fatima Nankya", product: "Business Loan", amount: 25_000_000, term: "36 months", status: "under_appraisal", applied_date: "2026-11-10", score: 92, guarantors: ["Samuel Byaruhanga", "James Mukasa"] },
  { id: "la-3", sv: "SV-0089", member: "Samuel Byaruhanga", product: "Emergency Loan", amount: 2_000_000, term: "3 months", status: "approved", applied_date: "2026-11-05", score: 95, guarantors: ["Fatima Nankya"] },
  { id: "la-4", sv: "SV-0034", member: "David Ssempala", product: "Short-Term Loan", amount: 10_000_000, term: "12 months", status: "rejected", applied_date: "2026-10-20", score: 45, guarantors: ["Peter Okello"] },
];

/** Member count for the 12 months ending at `today`; the last point equals the KPI. */
export function memberGrowth(today: string) {
  return trailingSeries(today, 12, ADMIN_KPI.total_members.value, [0.018, 0.016, 0.015, 0.012, 0.011, 0.01, 0.012, 0.014, 0.012, 0.011, 0.01, 0.009])
    .map((p) => ({ key: p.key, month: p.month, members: p.value }));
}
/** @deprecated use memberGrowth(today) */
export const MEMBER_GROWTH = memberGrowth(ANCHOR);

export const PORTFOLIO_QUALITY = [
  { category: "Current", amount: 1_720_000_000, percent: 80 },
  { category: "Watch (1-30)", amount: 215_000_000, percent: 10 },
  { category: "Substandard (31-60)", amount: 107_500_000, percent: 5 },
  { category: "Doubtful (61-90)", amount: 64_500_000, percent: 3 },
  { category: "Loss (90+)", amount: 43_000_000, percent: 2 },
];

/**
 * @deprecated Use useDemoToday() from "@/lib/demo-clock" for anything shown to
 * the user. Kept as the server-render anchor for older call sites.
 */
export const DEMO_TODAY = ANCHOR;
