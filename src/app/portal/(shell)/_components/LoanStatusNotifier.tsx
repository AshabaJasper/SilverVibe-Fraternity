"use client";
import { useLoanStatusNotifier } from "../_lib/usePortalData";

/**
 * Renders nothing; posts a member notification when an admin approves,
 * rejects or disburses one of the member's loan applications. Safe to mount on
 * several pages at once — notifications are de-duplicated per id + status.
 */
export default function LoanStatusNotifier() {
  useLoanStatusNotifier();
  return null;
}
