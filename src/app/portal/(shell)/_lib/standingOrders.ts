// ============================================================
// James's standing orders on the demo clock.
//
// The seed data is authored as of ANCHOR (23 Nov 2026). When a visitor comes
// back later, the standing orders that fell due in between are applied once:
//   - 1st of each month: the loan installment due that day is collected.
//   - 2nd of each month: UGX 200,000 is saved to Regular Savings.
// Each event has a stable id ("so-loan-2026-12-01", "so-save-2026-12-02")
// recorded under PROCESSED_KEY, so it applies exactly once across reloads,
// tabs and the several components that mount usePortalData.
//
// Plain module (no React, no browser APIs) so the arithmetic can be tested.
// ============================================================
import { ANCHOR, TIMELINE_EVENTS as EV, monthlyOccurrences } from "@/lib/demo-clock";
import { ADMIN_MEMBERS_LIST, LOAN_SCHEDULE } from "@/lib/mock-data";

export const PROCESSED_KEY = "portal_clock_processed";

type ScheduleRow = (typeof LOAN_SCHEDULE)[number];
type Member = (typeof ADMIN_MEMBERS_LIST)[number];

/** Minimal shapes the catch-up touches (the stored records have more fields). */
interface AccountLike {
  id: string;
  balance: number;
  available_balance: number;
  last_activity: string;
}
interface TxnLike {
  id: string;
  date: string;
  type: string;
  account: string;
  account_id: string;
  amount: number;
  channel: string;
  status: string;
  direction: string;
}

export interface ClockState<A extends AccountLike = AccountLike, T extends TxnLike = TxnLike> {
  accounts: A[];
  txns: T[];
  schedule: ScheduleRow[];
  members: Member[];
  processed: string[];
}

export const DEMO_SV = "SV-0042";
const LOAN_ID = "ln-001";
const REGULAR_ID = "sa-001";

/** Principal still owed: sum of the principal parts of unpaid installments. */
export const outstandingPrincipalOf = (schedule: ScheduleRow[]) =>
  schedule.filter((r) => r.status !== "Paid").reduce((s, r) => s + r.principal, 0);

/**
 * Apply every standing order dated after ANCHOR and on or before `today` that
 * has not been processed yet. Pure: returns new state plus the new txns.
 */
export function applyStandingOrders<A extends AccountLike, T extends TxnLike>(
  state: ClockState<A, T>,
  today: string
): { state: ClockState<A, T>; added: TxnLike[]; changed: boolean } {
  const done = new Set(state.processed);
  const added: TxnLike[] = [];
  let schedule = state.schedule;
  let accounts = state.accounts;
  let members = state.members;
  let saved = 0;

  // ---- 1st: loan installment
  for (const date of monthlyOccurrences(EV.loanInstallmentDay, ANCHOR, today)) {
    const id = `so-loan-${date}`;
    if (done.has(id)) continue;
    done.add(id);
    const idx = schedule.findIndex((r) => r.due_date === date && r.status !== "Paid");
    // Already settled by a manual repayment (or no installment that month): nothing to collect.
    if (idx < 0) continue;
    const row = schedule[idx];
    schedule = schedule.map((r, i) => (i === idx ? { ...r, status: "Paid" } : r));
    added.push({
      id,
      date,
      type: "Loan Repayment",
      account: "Short-Term Loan",
      account_id: LOAN_ID,
      amount: row.total,
      channel: "Standing Order",
      status: "Posted",
      direction: "debit",
    });
  }

  // ---- 2nd: Regular Savings deposit
  const amount = EV.savingsStandingOrderAmount;
  for (const date of monthlyOccurrences(EV.savingsStandingOrderDay, ANCHOR, today)) {
    const id = `so-save-${date}`;
    if (done.has(id)) continue;
    done.add(id);
    saved += amount;
    accounts = accounts.map((a) =>
      a.id === REGULAR_ID
        ? { ...a, balance: a.balance + amount, available_balance: a.available_balance + amount, last_activity: date > a.last_activity ? date : a.last_activity }
        : a
    );
    added.push({
      id,
      date,
      type: "Deposit",
      account: "Regular Savings",
      account_id: REGULAR_ID,
      amount,
      channel: "Standing Order",
      status: "Posted",
      direction: "credit",
    });
  }

  const changed = done.size !== state.processed.length;
  if (!changed) return { state, added, changed };

  // Keep the admin member register's savings in step with the portal. The loans
  // column is NOT written here: admin pages derive today's outstanding from the
  // seed loan and the date (see deriveLoan in admin _lib/seeds.ts), so writing it
  // too would deduct each installment twice.
  if (saved > 0) {
    members = members.map((m) => (m.sv_number === DEMO_SV ? { ...m, savings: m.savings + saved } : m));
  }

  return {
    state: {
      accounts,
      // Newest first, like every other writer.
      txns: [...(added.slice().reverse() as T[]), ...state.txns],
      schedule,
      members,
      processed: [...done],
    },
    added,
    changed,
  };
}
