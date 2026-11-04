// Persisted-state keys shared between more than one component.
// Keep them here so a page and the shell header always read the same record.
export const KEYS = {
  adminNotifications: "admin_notifications",
  memberNotifications: "member_notifications",
  adminMembers: "admin_members",
  // Portal member data (dashboard, savings, loans and shares pages all read these)
  portalAccounts: "portal_accounts",
  portalTransactions: "portal_transactions",
  portalLoanApps: "portal_loan_apps",
  portalLoanSchedule: "portal_loan_schedule",
  portalShares: "portal_shares",
  portalProfile: "portal_profile",
  // Loan applications submitted from the portal also appear in admin Loans.
  adminLoanApps: "admin_loan_apps",
} as const;
