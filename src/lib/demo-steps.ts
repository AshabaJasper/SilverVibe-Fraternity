// ============================================================
// Guided demo mode: "what to try on this page" steps for every
// admin and member-portal route. Every step names a control that
// exists on that page; hrefs are deep links the pages understand
// (?tab=…, ?action=…, ?q=…).
// ============================================================

export interface DemoStep {
  label: string;
  detail?: string;
  href?: string;
}

export interface DemoSteps {
  title: string;
  steps: DemoStep[];
}

const ADMIN_STEPS: Record<string, DemoSteps> = {
  "/admin": {
    title: "Admin dashboard",
    steps: [
      { label: "Approve or reject a pending approval", detail: "Use the tick / cross in Pending Approvals. Loan decisions sync to the Loans page." },
      { label: "Register a new member", detail: "Quick action: the form auto-assigns the next SV number.", href: "/admin/members?action=register" },
      { label: "Start a loan application", detail: "Credit score and guarantors are checked against product limits.", href: "/admin/loans?action=new" },
      { label: "Try it from the member side", detail: "Apply for a loan in the member portal, then approve it here.", href: "/portal/loans?action=apply" },
    ],
  },
  "/admin/members": {
    title: "Members",
    steps: [
      { label: "Register a member", detail: "Click Register Member: validation and auto SV numbering.", href: "/admin/members?action=register" },
      { label: "Search and open a profile", detail: "Click a row (e.g. Martha Apio) to see details, KYC and status.", href: "/admin/members?q=SV-0078" },
      { label: "Download a member statement", detail: "Open a member, then Download statement for a PDF." },
      { label: "Export the register", detail: "Filter by status, then export all, filtered or selected rows to CSV." },
    ],
  },
  "/admin/savings": {
    title: "Savings",
    steps: [
      { label: "Record a deposit or withdrawal", detail: "Click New Transaction and pick a member. Product balances and KPIs update live." },
      { label: "Post a pending withdrawal (maker-checker)", detail: "Withdrawals above UGX 2M wait in Transactions for a second officer to post.", href: "/admin/savings?tab=transactions" },
      { label: "Add or edit a savings product", href: "/admin/savings?tab=products" },
      { label: "See a member deposit arrive", detail: "Make a Quick Deposit in the member portal, then check the portal balances.", href: "/portal?action=deposit" },
    ],
  },
  "/admin/loans": {
    title: "Loans",
    steps: [
      { label: "Review an application", detail: "Open Review, then Approve with a note or Decline with a reason.", href: "/admin/loans?tab=applications" },
      { label: "Disburse an approved loan", detail: "Disburse turns it into an active loan with a reducing-balance schedule.", href: "/admin/loans?tab=applications" },
      { label: "Record a repayment / download a schedule PDF", href: "/admin/loans?tab=active" },
      { label: "Apply in the member portal, then approve it here", detail: "Portal applications land in this Applications tab.", href: "/portal/loans?action=apply" },
    ],
  },
  "/admin/shares": {
    title: "Shares & Dividends",
    steps: [
      { label: "Issue shares to a member", detail: "Issue Shares respects the holding limits set under Configure.", href: "/admin/shares?tab=shareholders" },
      { label: "Transfer shares between members", detail: "Use Transfer in the page header." },
      { label: "Declare a dividend and mark it paid", href: "/admin/shares?tab=dividends" },
      { label: "Buy or redeem investment units", href: "/admin/shares?tab=units" },
    ],
  },
  "/admin/accounting": {
    title: "Accounting",
    steps: [
      { label: "Create a journal entry", detail: "New Entry: save as draft, or Save & post when debits equal credits.", href: "/admin/accounting?tab=journal" },
      { label: "Check the trial balance", detail: "Computed live from posted entries.", href: "/admin/accounting?tab=trial" },
      { label: "Preview financial statements", detail: "Income statement, balance sheet and cash flow, with PDFs.", href: "/admin/accounting?tab=statements" },
    ],
  },
  "/admin/communications": {
    title: "Communications",
    steps: [
      { label: "Compose an SMS, email or push", detail: "See recipient counts and SMS segments; send now or schedule.", href: "/admin/communications?tab=compose" },
      { label: "Send a scheduled announcement now", detail: "Click Send on any scheduled item in Announcements.", href: "/admin/communications?tab=announcements" },
      { label: "Reuse a message template", detail: "Use Template fills {name}, {amount} and {date} placeholders.", href: "/admin/communications?tab=templates" },
      { label: "Work through admin notifications", href: "/admin/communications?tab=notifications" },
    ],
  },
  "/admin/reports": {
    title: "Reports",
    steps: [
      { label: "Generate a PDF report", detail: "Pick any report in the catalogue and click Generate PDF.", href: "/admin/reports?tab=catalog" },
      { label: "Preview, then print or export CSV", detail: "Preview opens the report tables in a dialog." },
      { label: "Schedule a recurring report", detail: "New Schedule: frequency, recipients and on/off toggle.", href: "/admin/reports?tab=scheduled" },
    ],
  },
  "/admin/settings": {
    title: "Settings",
    steps: [
      { label: "Add a system user", detail: "Add User, then try 2FA, password reset and deactivate.", href: "/admin/settings?tab=users" },
      { label: "Edit the role permission matrix", href: "/admin/settings?tab=roles" },
      { label: "Filter and export the audit log", href: "/admin/settings?tab=audit" },
      { label: "Run an on-demand backup", detail: "System tab: click Run backup now, or change settings and Save Settings.", href: "/admin/settings?tab=system" },
    ],
  },
  "/admin/checklist": {
    title: "Feature checklist",
    steps: [
      { label: "Every item links to where it works", detail: "Click a feature to jump straight to it." },
      { label: "See what's planned for the backend phase", detail: "Expand 'Backend (next phase)' at the bottom." },
      { label: "Switch to the member's view", detail: "Open the member portal to see the other side of the SACCO.", href: "/portal" },
    ],
  },
};

const PORTAL_STEPS: Record<string, DemoSteps> = {
  "/portal": {
    title: "Member dashboard",
    steps: [
      { label: "Make a quick deposit", detail: "Net worth, savings target and health score update instantly.", href: "/portal?action=deposit" },
      { label: "Apply for a loan", detail: "It appears in the admin Loans page for approval.", href: "/portal/loans?action=apply" },
      { label: "Download a statement", href: "/portal/savings?action=statement" },
      { label: "Check your notifications", detail: "Use the bell in the header, or open the Notifications page.", href: "/portal/notifications" },
    ],
  },
  "/portal/savings": {
    title: "My savings",
    steps: [
      { label: "Transfer between your accounts", detail: "e.g. Flexi/Wallet to Regular Savings.", href: "/portal/savings?action=transfer" },
      { label: "Request a withdrawal", detail: "Click Withdraw in the page header." },
      { label: "Download a statement (PDF or CSV)", href: "/portal/savings?action=statement" },
    ],
  },
  "/portal/loans": {
    title: "My loans",
    steps: [
      { label: "Make a repayment", detail: "Pays down the schedule and moves your net worth.", href: "/portal/loans?action=repay" },
      { label: "Try the loan calculator", detail: "Change amount, rate and term to see the monthly installment." },
      { label: "Apply for a new loan", detail: "Then sign in as admin and approve it under Loans → Applications.", href: "/portal/loans?action=apply" },
      { label: "Download your repayment schedule PDF" },
    ],
  },
  "/portal/shares": {
    title: "My shares",
    steps: [
      { label: "Buy shares", detail: "Paid from your Flexi/Wallet; a new certificate is issued." },
      { label: "Download a share certificate", detail: "Under Share Certificates." },
      { label: "Buy or redeem investment units" },
    ],
  },
  "/portal/profile": {
    title: "My profile",
    steps: [
      { label: "Edit your details or upload a photo", href: "/portal/profile?tab=personal" },
      { label: "Add next of kin and beneficiaries", href: "/portal/profile?tab=kin" },
      { label: "Upload a KYC document", href: "/portal/profile?tab=kyc" },
      { label: "Turn on two-factor authentication", href: "/portal/profile?tab=security" },
    ],
  },
  "/portal/notifications": {
    title: "Notifications",
    steps: [
      { label: "Filter by type", detail: "Unread, Transactions, Reminders, Loans and more." },
      { label: "Mark all as read", detail: "The header bell badge updates at the same time." },
      { label: "Choose how you're notified", href: "/portal/profile?tab=preferences" },
    ],
  },
  "/portal/support": {
    title: "Support",
    steps: [
      { label: "Search the FAQs", detail: "e.g. type 'statement' or 'two-factor'." },
      { label: "Send a message", detail: "Creates a support ticket listed under My tickets." },
      { label: "Close a ticket", detail: "Open a ticket in My tickets and close it once resolved." },
    ],
  },
};

/** Steps for the current route, or null when the route has no guide. */
export function getDemoSteps(pathname: string): DemoSteps | null {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const table = path.startsWith("/admin") ? ADMIN_STEPS : path.startsWith("/portal") ? PORTAL_STEPS : null;
  if (!table) return null;
  if (table[path]) return table[path];
  // Nested routes fall back to their section (e.g. /admin/members/123 → /admin/members).
  const section = path.split("/").slice(0, 3).join("/");
  return table[section] ?? null;
}
