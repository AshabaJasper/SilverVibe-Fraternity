// ============================================================
// DEMO DATA — SilverVibe Fraternity Cooperative Society Ltd
// ============================================================

export const DEMO_MEMBER = {
  id: "m-001",
  sv_number: "SV-0042",
  full_name: "James Mukasa",
  gender: "Male",
  date_of_birth: "1990-06-15",
  national_id: "CM84029485HDKFJ",
  email: "james.mukasa@email.com",
  phone: "+256 770 123 456",
  phone2: "+256 700 987 654",
  address: "Plot 14, Kampala Road, Kampala",
  status: "Active",
  kyc_status: "Verified",
  date_joined: "2023-03-10",
  profile_photo: null,
};

export const DEMO_ADMIN = {
  id: "a-001",
  full_name: "Sarah Nakamya",
  email: "sarah@silvervibe.coop",
  role: "CEO / General Manager",
  last_login: "2026-02-13T08:30:00",
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
    last_activity: "2026-02-10",
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
    last_activity: "2026-02-12",
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
    last_activity: "2025-08-15",
    maturity_date: "2026-08-15",
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
    last_activity: "2025-12-01",
    streak: 0,
    color: "#f59e0b",
  },
];

export const MEMBER_LOANS = [
  {
    id: "ln-001",
    product: "Short-Term Loan",
    loan_number: "SV-LN-2025-0042",
    principal: 8_000_000,
    outstanding_principal: 3_200_000,
    outstanding_interest: 160_000,
    total_outstanding: 3_360_000,
    interest_rate: "18%",
    interest_method: "Reducing Balance",
    disbursement_date: "2025-08-01",
    maturity_date: "2026-08-01",
    next_payment_date: "2026-03-01",
    next_payment_amount: 740_000,
    monthly_installment: 740_000,
    status: "Active",
    days_in_arrears: 0,
    repayment_progress: 60,
    payments_made: 6,
    total_payments: 12,
  },
];

export const MEMBER_SHARES = {
  num_shares: 50,
  share_value: 100_000,
  total_value: 5_000_000,
  share_premium: 0,
  certificates: [
    { number: "SV-CERT-0042", shares: 20, date: "2023-03-10", amount: 2_000_000 },
    { number: "SV-CERT-0089", shares: 15, date: "2024-01-15", amount: 1_500_000 },
    { number: "SV-CERT-0134", shares: 15, date: "2025-06-20", amount: 1_500_000 },
  ],
  dividends: [
    { year: "FY 2023", rate: "8%", amount: 160_000, paid_date: "2024-03-15" },
    { year: "FY 2024", rate: "10%", amount: 350_000, paid_date: "2025-03-20" },
  ],
};

export const MEMBER_IU = {
  unit_balance: 15,
  total_invested: 1_500_000,
  accrued_returns: 225_000,
  current_value: 1_725_000,
};

export const RECENT_TRANSACTIONS = [
  { id: "t-001", date: "2026-02-10", type: "Deposit", account: "Regular Savings", amount: 200_000, channel: "Mobile Money", status: "Posted", direction: "credit" },
  { id: "t-002", date: "2026-02-05", type: "Loan Repayment", account: "Short-Term Loan", amount: 740_000, channel: "Bank Transfer", status: "Posted", direction: "debit" },
  { id: "t-003", date: "2026-02-01", type: "Deposit", account: "Flexi/Wallet", amount: 500_000, channel: "Mobile Money", status: "Posted", direction: "credit" },
  { id: "t-004", date: "2026-01-28", type: "Withdrawal", account: "Flexi/Wallet", amount: 1_000_000, channel: "Bank Transfer", status: "Posted", direction: "debit" },
  { id: "t-005", date: "2026-01-15", type: "Deposit", account: "Regular Savings", amount: 200_000, channel: "Mobile Money", status: "Posted", direction: "credit" },
  { id: "t-006", date: "2026-01-10", type: "Share Purchase", account: "Share Capital", amount: 500_000, channel: "Cash", status: "Posted", direction: "debit" },
  { id: "t-007", date: "2026-01-05", type: "Loan Repayment", account: "Short-Term Loan", amount: 740_000, channel: "Bank Transfer", status: "Posted", direction: "debit" },
  { id: "t-008", date: "2025-12-20", type: "Deposit", account: "Regular Savings", amount: 300_000, channel: "Cash", status: "Posted", direction: "credit" },
];

export const SAVINGS_HISTORY = [
  { month: "Sep", regular: 9_800_000, flexi: 1_800_000, fixed: 10_000_000 },
  { month: "Oct", regular: 10_200_000, flexi: 2_100_000, fixed: 10_000_000 },
  { month: "Nov", regular: 10_600_000, flexi: 2_400_000, fixed: 10_000_000 },
  { month: "Dec", regular: 11_200_000, flexi: 2_800_000, fixed: 10_000_000 },
  { month: "Jan", regular: 11_850_000, flexi: 3_750_000, fixed: 10_000_000 },
  { month: "Feb", regular: 12_450_000, flexi: 3_250_000, fixed: 10_000_000 },
];

export const LOAN_SCHEDULE = [
  { installment: 1, due_date: "2025-09-01", principal: 600_000, interest: 140_000, total: 740_000, status: "Paid" },
  { installment: 2, due_date: "2025-10-01", principal: 610_000, interest: 130_000, total: 740_000, status: "Paid" },
  { installment: 3, due_date: "2025-11-01", principal: 620_000, interest: 120_000, total: 740_000, status: "Paid" },
  { installment: 4, due_date: "2025-12-01", principal: 630_000, interest: 110_000, total: 740_000, status: "Paid" },
  { installment: 5, due_date: "2026-01-01", principal: 640_000, interest: 100_000, total: 740_000, status: "Paid" },
  { installment: 6, due_date: "2026-02-01", principal: 650_000, interest: 90_000, total: 740_000, status: "Paid" },
  { installment: 7, due_date: "2026-03-01", principal: 660_000, interest: 80_000, total: 740_000, status: "Pending" },
  { installment: 8, due_date: "2026-04-01", principal: 670_000, interest: 70_000, total: 740_000, status: "Pending" },
  { installment: 9, due_date: "2026-05-01", principal: 680_000, interest: 60_000, total: 740_000, status: "Pending" },
  { installment: 10, due_date: "2026-06-01", principal: 690_000, interest: 50_000, total: 740_000, status: "Pending" },
  { installment: 11, due_date: "2026-07-01", principal: 700_000, interest: 40_000, total: 740_000, status: "Pending" },
  { installment: 12, due_date: "2026-08-01", principal: 380_000, interest: 20_000, total: 400_000, status: "Pending" },
];

export const ANNOUNCEMENTS = [
  {
    id: "ann-001",
    title: "Annual General Meeting 2026",
    content: "Dear Members, you are invited to the Annual General Meeting scheduled for March 15, 2026 at Silver Springs Hotel, Kampala. Agenda includes financial reports, dividend declaration, and board elections.",
    date: "2026-02-10",
    priority: "high",
  },
  {
    id: "ann-002",
    title: "New Fixed Savings Rate",
    content: "We are pleased to announce an increased fixed savings rate of 13% p.a. for 12-month tenor, effective March 1, 2026. Lock in your savings today!",
    date: "2026-02-08",
    priority: "normal",
  },
  {
    id: "ann-003",
    title: "Mobile Money Deposits Now Available",
    content: "You can now make deposits directly from your mobile money account. Dial *165# and follow the prompts to deposit into your SilverVibe account.",
    date: "2026-01-25",
    priority: "normal",
  },
];

export const NOTIFICATIONS_DATA = [
  { id: "n-001", type: "transaction", title: "Deposit Confirmed", message: "Your deposit of UGX 200,000 to Regular Savings has been posted.", date: "2026-02-10", read: false },
  { id: "n-002", type: "reminder", title: "Loan Repayment Due", message: "Your loan repayment of UGX 740,000 is due on March 1, 2026.", date: "2026-02-09", read: false },
  { id: "n-003", type: "announcement", title: "AGM 2026", message: "Annual General Meeting on March 15, 2026.", date: "2026-02-08", read: true },
  { id: "n-004", type: "transaction", title: "Loan Payment Received", message: "Your loan repayment of UGX 740,000 has been posted.", date: "2026-02-05", read: true },
  { id: "n-005", type: "system", title: "Statement Ready", message: "Your January 2026 statement is ready for download.", date: "2026-02-01", read: true },
];

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
  { sv_number: "SV-0001", name: "Alice Namugga", phone: "+256 770 111 111", email: "alice@email.com", status: "active", kyc: "verified", savings: 28_500_000, loans: 5_000_000, shares: 8_000_000, joined: "2020-01-15" },
  { sv_number: "SV-0012", name: "Robert Kizza", phone: "+256 700 222 222", email: "robert@email.com", status: "active", kyc: "verified", savings: 42_300_000, loans: 0, shares: 12_000_000, joined: "2020-03-22" },
  { sv_number: "SV-0023", name: "Grace Nabirye", phone: "+256 780 333 333", email: "grace@email.com", status: "active", kyc: "verified", savings: 15_700_000, loans: 8_000_000, shares: 5_000_000, joined: "2021-06-10" },
  { sv_number: "SV-0034", name: "David Ssempala", phone: "+256 750 444 444", email: "david@email.com", status: "active", kyc: "incomplete", savings: 8_900_000, loans: 3_500_000, shares: 3_000_000, joined: "2021-09-05" },
  { sv_number: "SV-0042", name: "James Mukasa", phone: "+256 770 123 456", email: "james@email.com", status: "active", kyc: "verified", savings: 27_700_000, loans: 3_360_000, shares: 5_000_000, joined: "2023-03-10" },
  { sv_number: "SV-0056", name: "Fatima Nankya", phone: "+256 700 555 555", email: "fatima@email.com", status: "active", kyc: "verified", savings: 35_600_000, loans: 12_000_000, shares: 7_000_000, joined: "2022-01-20" },
  { sv_number: "SV-0067", name: "Peter Okello", phone: "+256 780 666 666", email: "peter@email.com", status: "dormant", kyc: "verified", savings: 4_200_000, loans: 0, shares: 2_000_000, joined: "2020-08-12" },
  { sv_number: "SV-0078", name: "Martha Apio", phone: "+256 750 777 777", email: "martha@email.com", status: "pending", kyc: "pending", savings: 6_800_000, loans: 0, shares: 3_000_000, joined: "2025-11-08" },
  { sv_number: "SV-0089", name: "Samuel Byaruhanga", phone: "+256 770 888 888", email: "samuel@email.com", status: "active", kyc: "verified", savings: 52_100_000, loans: 15_000_000, shares: 15_000_000, joined: "2020-02-28" },
  { sv_number: "SV-0095", name: "Christine Tumwine", phone: "+256 700 999 999", email: "christine@email.com", status: "suspended", kyc: "verified", savings: 3_100_000, loans: 4_500_000, shares: 2_000_000, joined: "2022-07-14" },
];

export const ADMIN_SAVINGS_GROWTH = [
  { month: "Mar", amount: 3_200_000_000 },
  { month: "Apr", amount: 3_350_000_000 },
  { month: "May", amount: 3_520_000_000 },
  { month: "Jun", amount: 3_680_000_000 },
  { month: "Jul", amount: 3_850_000_000 },
  { month: "Aug", amount: 4_010_000_000 },
  { month: "Sep", amount: 4_180_000_000 },
  { month: "Oct", amount: 4_350_000_000 },
  { month: "Nov", amount: 4_520_000_000 },
  { month: "Dec", amount: 4_640_000_000 },
  { month: "Jan", amount: 4_750_000_000 },
  { month: "Feb", amount: 4_820_000_000 },
];

export const ADMIN_LOAN_PERFORMANCE = [
  { month: "Sep", disbursed: 280_000_000, recovered: 310_000_000 },
  { month: "Oct", disbursed: 320_000_000, recovered: 290_000_000 },
  { month: "Nov", disbursed: 250_000_000, recovered: 305_000_000 },
  { month: "Dec", disbursed: 190_000_000, recovered: 340_000_000 },
  { month: "Jan", disbursed: 350_000_000, recovered: 280_000_000 },
  { month: "Feb", disbursed: 300_000_000, recovered: 320_000_000 },
];

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
  { id: "pa-1", type: "Loan Application", member: "Grace Nabirye (SV-0023)", amount: 5_000_000, submitted: "2026-02-13", priority: "high" },
  { id: "pa-2", type: "Withdrawal", member: "David Ssempala (SV-0034)", amount: 3_000_000, submitted: "2026-02-13", priority: "medium" },
  { id: "pa-3", type: "Profile Update", member: "Peter Okello (SV-0067)", amount: null, submitted: "2026-02-12", priority: "low" },
  { id: "pa-4", type: "Loan Disbursement", member: "Fatima Nankya (SV-0056)", amount: 12_000_000, submitted: "2026-02-12", priority: "high" },
  { id: "pa-5", type: "Manual Journal", member: "Accountant Entry", amount: 1_500_000, submitted: "2026-02-11", priority: "medium" },
];

export const ADMIN_LOAN_APPLICATIONS = [
  { id: "la-1", sv: "SV-0023", member: "Grace Nabirye", product: "Short-Term Loan", amount: 5_000_000, term: "12 months", status: "pending_review", applied_date: "2026-02-13", score: 78, guarantors: ["Alice Namugga", "Robert Kizza"] },
  { id: "la-2", sv: "SV-0056", member: "Fatima Nankya", product: "Business Loan", amount: 25_000_000, term: "36 months", status: "under_appraisal", applied_date: "2026-02-10", score: 92, guarantors: ["Samuel Byaruhanga", "James Mukasa"] },
  { id: "la-3", sv: "SV-0089", member: "Samuel Byaruhanga", product: "Emergency Loan", amount: 2_000_000, term: "3 months", status: "approved", applied_date: "2026-02-05", score: 95, guarantors: ["Fatima Nankya"] },
  { id: "la-4", sv: "SV-0034", member: "David Ssempala", product: "Short-Term Loan", amount: 10_000_000, term: "12 months", status: "rejected", applied_date: "2026-01-28", score: 45, guarantors: ["Peter Okello"] },
];

export const MEMBER_GROWTH = [
  { month: "Mar", members: 720 },
  { month: "Apr", members: 735 },
  { month: "May", members: 748 },
  { month: "Jun", members: 762 },
  { month: "Jul", members: 775 },
  { month: "Aug", members: 788 },
  { month: "Sep", members: 800 },
  { month: "Oct", members: 812 },
  { month: "Nov", members: 823 },
  { month: "Dec", members: 832 },
  { month: "Jan", members: 840 },
  { month: "Feb", members: 847 },
];

export const PORTFOLIO_QUALITY = [
  { category: "Current", amount: 1_720_000_000, percent: 80 },
  { category: "Watch (1-30)", amount: 215_000_000, percent: 10 },
  { category: "Substandard (31-60)", amount: 107_500_000, percent: 5 },
  { category: "Doubtful (61-90)", amount: 64_500_000, percent: 3 },
  { category: "Loss (90+)", amount: 43_000_000, percent: 2 },
];
