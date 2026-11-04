"use client";
// ============================================================
// One member data model for the portal dashboard, savings, loans and shares
// pages. Every page reads and writes through this hook, so a deposit made on
// the dashboard shows up on /portal/savings, a repayment moves the dashboard
// net worth, a share purchase reduces the Flexi wallet, and so on.
// ============================================================
import { useCallback, useMemo } from "react";
import { usePersistedState } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import {
  ADMIN_LOAN_APPLICATIONS,
  DEMO_MEMBER,
  DEMO_TODAY,
  LOAN_SCHEDULE,
  MEMBER_IU,
  MEMBER_LOANS,
  MEMBER_SAVINGS,
  MEMBER_SHARES,
  RECENT_TRANSACTIONS,
  SAVINGS_HISTORY,
} from "@/lib/mock-data";
import { daysUntil, todayISO, uid, useHydrated } from "@/lib/utils";

// ---------------------------------------------------------------- types

export interface PortalAccount {
  id: string;
  product: string;
  code: string;
  account_number: string;
  balance: number;
  available_balance: number;
  accrued_interest: number;
  minimum_balance: number;
  monthly_target: number;
  monthly_contributed: number;
  status: string;
  last_activity: string;
  streak: number;
  color: string;
  maturity_date?: string;
  tenor?: string;
  interest_rate?: string;
  lien_amount?: number;
}

export interface PortalTxn {
  id: string;
  date: string;
  type: string;
  /** Display name of the account the money moved in (e.g. "Regular Savings"). */
  account: string;
  /** sa-001..sa-004, "ln-001" (loan), "shares" or "iu". Used for filtering. */
  account_id: string;
  /** Savings account the money came from, when paid from a wallet (e.g. Flexi → loan). */
  source_id?: string;
  amount: number;
  channel: string;
  status: string;
  direction: "credit" | "debit" | string;
}

export type ScheduleRow = (typeof LOAN_SCHEDULE)[number];

export interface ShareCertificate {
  number: string;
  shares: number;
  date: string;
  amount: number;
}

export interface InvestmentUnits {
  unit_balance: number;
  total_invested: number;
  accrued_returns: number;
  current_value: number;
}

export interface PortalShares {
  num_shares: number;
  share_value: number;
  total_value: number;
  share_premium: number;
  certificates: ShareCertificate[];
  dividends: { year: string; rate: string; amount: number; paid_date: string }[];
  iu: InvestmentUnits;
}

export interface PortalLoanApp {
  id: string;
  product: string;
  amount: number;
  /** Months */
  term: number;
  purpose: string;
  /** Guarantor names (matching ADMIN_MEMBERS_LIST). */
  guarantors: string[];
  applied_date: string;
  status: string;
}

/** Shape of records in KEYS.adminLoanApps (same as ADMIN_LOAN_APPLICATIONS + purpose). */
export interface AdminLoanApp {
  id: string;
  sv: string;
  member: string;
  product: string;
  amount: number;
  term: string;
  status: string;
  applied_date: string;
  score: number;
  guarantors: string[];
  purpose?: string;
}

// ---------------------------------------------------------------- constants

/** Chart/accent colour per account. #1A1A1A (Regular in mock data) vanishes in dark mode. */
export const ACCOUNT_COLORS: Record<string, string> = {
  "sa-001": "#a855f7",
  "sa-002": "#4A90D9",
  "sa-003": "#22c55e",
  "sa-004": "#f59e0b",
};

export const LOAN_PRODUCTS = [
  { value: "Short-Term Loan", label: "Short-Term Loan — 18% p.a.", rate: 18, maxTerm: 12 },
  { value: "Emergency Loan", label: "Emergency Loan — 15% p.a.", rate: 15, maxTerm: 6 },
  { value: "Development Loan", label: "Development Loan — 16% p.a.", rate: 16, maxTerm: 36 },
  { value: "Business Loan", label: "Business Loan — 17% p.a.", rate: 17, maxTerm: 36 },
] as const;

export const ACTIVE_LOAN = MEMBER_LOANS[0];
export const MEMBER_INFO = {
  name: DEMO_MEMBER.full_name,
  sv: DEMO_MEMBER.sv_number,
  email: DEMO_MEMBER.email,
  phone: DEMO_MEMBER.phone,
};
export const AGM_DATE = "2026-12-12";

const SEED_SHARES: PortalShares = { ...MEMBER_SHARES, iu: { ...MEMBER_IU } };

// ---------------------------------------------------------------- pure helpers

export const shortName = (product: string) => product.replace("SilverVibe ", "");

/** Monthly installment for a reducing-balance loan: P·r / (1 − (1 + r)^−n). */
export function monthlyInstallment(principal: number, annualRatePct: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** 6-month savings history whose latest point is the member's live balances. */
export function liveSavingsHistory(accounts: PortalAccount[]) {
  const bal = (id: string) => accounts.find((a) => a.id === id)?.balance ?? 0;
  return SAVINGS_HISTORY.map((p, i) =>
    i === SAVINGS_HISTORY.length - 1 ? { ...p, regular: bal("sa-001"), flexi: bal("sa-002"), fixed: bal("sa-003") } : p
  );
}

/** Older builds stored transactions without account_id — infer it from the name. */
function normalizeTxn(t: Partial<PortalTxn>): PortalTxn {
  const name = (t.account ?? "").toLowerCase();
  const inferred = name.includes("regular")
    ? "sa-001"
    : name.includes("flexi")
      ? "sa-002"
      : name.includes("fixed")
        ? "sa-003"
        : name.includes("guarantee")
          ? "sa-004"
          : name.includes("loan")
            ? "ln-001"
            : name.includes("share")
              ? "shares"
              : "other";
  return {
    id: t.id ?? uid("t"),
    date: t.date ?? DEMO_TODAY,
    type: t.type ?? "Transaction",
    account: t.account ?? "",
    account_id: t.account_id ?? inferred,
    source_id: t.source_id,
    amount: Number(t.amount) || 0,
    channel: t.channel ?? "-",
    status: t.status ?? "Posted",
    direction: t.direction ?? "credit",
  };
}

/** "YYYY-MM" of an ISO date. */
const monthKey = (iso: string) => iso.slice(0, 7);
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Accounts whose available balance moves with deposits (not locked/lien accounts). */
const isLiquid = (a: PortalAccount) => a.code !== "SV-FIX" && a.code !== "SV-LGS";

// ---------------------------------------------------------------- hook

export function usePortalData() {
  const hydrated = useHydrated();
  // Before hydration use the fixed demo date so server and client markup match.
  const today = hydrated ? todayISO() : DEMO_TODAY;

  const [rawAccounts, setAccounts] = usePersistedState<PortalAccount[]>(KEYS.portalAccounts, MEMBER_SAVINGS as PortalAccount[]);
  const [rawTxns, setTxns] = usePersistedState<PortalTxn[]>(KEYS.portalTransactions, RECENT_TRANSACTIONS);
  const [schedule, setSchedule] = usePersistedState<ScheduleRow[]>(KEYS.portalLoanSchedule, LOAN_SCHEDULE);
  const [rawShares, setShares] = usePersistedState<PortalShares>(KEYS.portalShares, SEED_SHARES);
  const [loanApps, setLoanApps] = usePersistedState<PortalLoanApp[]>(KEYS.portalLoanApps, []);
  const [adminApps, setAdminApps] = usePersistedState<AdminLoanApp[]>(KEYS.adminLoanApps, ADMIN_LOAN_APPLICATIONS);

  const accounts = useMemo(
    () => rawAccounts.map((a) => ({ ...a, color: ACCOUNT_COLORS[a.id] ?? (a.color === "#1A1A1A" ? "#a855f7" : a.color) })),
    [rawAccounts]
  );
  // Newest first (copy before sorting — never mutate state).
  const transactions = useMemo(
    () => rawTxns.map(normalizeTxn).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [rawTxns]
  );
  const shares: PortalShares = useMemo(
    () => ({ ...SEED_SHARES, ...rawShares, iu: rawShares.iu ?? SEED_SHARES.iu }),
    [rawShares]
  );

  // ---- derived figures
  const derived = useMemo(() => {
    const totalSavings = accounts.reduce((s, a) => s + a.balance, 0);
    const availableBalance = accounts.reduce((s, a) => s + a.available_balance, 0);
    const totalInterest = accounts.reduce((s, a) => s + a.accrued_interest, 0);
    const pending = schedule.filter((r) => r.status !== "Paid");
    const paid = schedule.filter((r) => r.status === "Paid");
    const outstandingLoan = pending.reduce((s, r) => s + r.total, 0);
    const outstandingPrincipal = pending.reduce((s, r) => s + r.principal, 0);
    const principalRepaid = paid.reduce((s, r) => s + r.principal, 0) + (ACTIVE_LOAN.principal - schedule.reduce((s, r) => s + r.principal, 0));
    const nextPayment = pending[0] ?? null;
    const sharesValue = shares.total_value;
    const iuValue = shares.iu.current_value;
    const netWorth = totalSavings + sharesValue + iuValue - outstandingLoan;
    const eligibility = Math.max(0, 3 * (totalSavings + sharesValue));

    // Monthly Regular Savings target, from this month's Regular deposits.
    const regular = accounts.find((a) => a.id === "sa-001");
    const monthlyTarget = regular?.monthly_target ?? 0;
    const thisMonth = monthKey(today);
    const regularCreditMonths = new Set(
      transactions.filter((t) => t.account_id === "sa-001" && t.direction === "credit" && t.status === "Posted").map((t) => monthKey(t.date))
    );
    const monthlyContributed = transactions
      .filter((t) => t.account_id === "sa-001" && t.direction === "credit" && t.status === "Posted" && monthKey(t.date) === thisMonth)
      .reduce((s, t) => s + t.amount, 0);

    // Streak: consecutive months with a Regular deposit. The current month only
    // breaks the streak once it is over, so start from last month if needed.
    let streak = 0;
    let cursor = regularCreditMonths.has(thisMonth) ? thisMonth : shiftMonth(thisMonth, -1);
    while (regularCreditMonths.has(cursor)) {
      streak += 1;
      cursor = shiftMonth(cursor, -1);
    }

    // Financial health score — three simple, explainable ratios.
    const last6 = Array.from({ length: 6 }, (_, i) => shiftMonth(thisMonth, -i));
    const consistency = Math.round((last6.filter((m) => regularCreditMonths.has(m)).length / 6) * 100);
    const dueSoFar = schedule.filter((r) => r.due_date <= today);
    const onTime = dueSoFar.length ? Math.round((dueSoFar.filter((r) => r.status === "Paid").length / dueSoFar.length) * 100) : 100;
    // Savings cover of debt: 100 when savings are at least 2× what is owed.
    const cover = outstandingLoan > 0 ? Math.min(100, Math.round((totalSavings / outstandingLoan / 2) * 100)) : 100;
    const healthFactors = [
      { label: "Savings consistency", score: consistency, weight: 0.3, detail: `Regular deposits in ${last6.filter((m) => regularCreditMonths.has(m)).length} of the last 6 months`, color: "#22c55e" },
      { label: "Loan repayment", score: onTime, weight: 0.4, detail: dueSoFar.length ? `${dueSoFar.filter((r) => r.status === "Paid").length} of ${dueSoFar.length} due installments paid` : "No installments due yet", color: "#4A90D9" },
      { label: "Savings-to-debt cover", score: cover, weight: 0.3, detail: outstandingLoan > 0 ? `Savings are ${(totalSavings / outstandingLoan).toFixed(1)}× your loan balance` : "No outstanding loan", color: "#f59e0b" },
    ];
    const healthScore = Math.round(healthFactors.reduce((s, f) => s + f.score * f.weight, 0));

    return {
      totalSavings,
      availableBalance,
      totalInterest,
      outstandingLoan,
      outstandingPrincipal,
      principalRepaid,
      paidCount: paid.length,
      nextPayment,
      sharesValue,
      iuValue,
      netWorth,
      eligibility,
      monthlyTarget,
      monthlyContributed,
      streak,
      healthFactors,
      healthScore,
    };
  }, [accounts, schedule, shares, transactions, today]);

  /** Whole days until the next installment — null before hydration (avoids SSR mismatch). */
  const daysToNextPayment = hydrated && derived.nextPayment ? daysUntil(derived.nextPayment.due_date) : null;

  // ---------------------------------------------------------------- mutations

  const addTxns = useCallback(
    (txns: Omit<PortalTxn, "id" | "date">[]) => {
      const date = todayISO();
      setTxns((prev) => [...txns.map((t) => ({ ...t, id: uid("t"), date })), ...prev]);
    },
    [setTxns]
  );

  /** Change an account's balance (and available balance for liquid accounts). */
  const adjustAccounts = useCallback(
    (changes: { id: string; balance?: number; available?: number }[]) => {
      const date = todayISO();
      setAccounts((prev) =>
        prev.map((a) => {
          const c = changes.find((x) => x.id === a.id);
          if (!c) return a;
          return {
            ...a,
            balance: a.balance + (c.balance ?? 0),
            available_balance: Math.max(0, a.available_balance + (c.available ?? 0)),
            last_activity: date,
          };
        })
      );
    },
    [setAccounts]
  );

  const accountName = useCallback((id: string) => shortName(accounts.find((a) => a.id === id)?.product ?? id), [accounts]);

  /** Credit a savings account (Quick Deposit). */
  const deposit = useCallback(
    (accountId: string, amount: number, channel: string) => {
      const acct = accounts.find((a) => a.id === accountId);
      if (!acct) return;
      adjustAccounts([{ id: accountId, balance: amount, available: isLiquid(acct) ? amount : 0 }]);
      addTxns([{ type: "Deposit", account: shortName(acct.product), account_id: accountId, amount, channel, status: "Posted", direction: "credit" }]);
    },
    [accounts, adjustAccounts, addTxns]
  );

  /** Move money between two of the member's savings accounts. */
  const transfer = useCallback(
    (fromId: string, toId: string, amount: number) => {
      const from = accounts.find((a) => a.id === fromId);
      const to = accounts.find((a) => a.id === toId);
      if (!from || !to) return;
      adjustAccounts([
        { id: fromId, balance: -amount, available: -amount },
        { id: toId, balance: amount, available: isLiquid(to) ? amount : 0 },
      ]);
      addTxns([
        { type: `Transfer to ${shortName(to.product)}`, account: shortName(from.product), account_id: fromId, amount, channel: "Internal Transfer", status: "Posted", direction: "debit" },
        { type: `Transfer from ${shortName(from.product)}`, account: shortName(to.product), account_id: toId, amount, channel: "Internal Transfer", status: "Posted", direction: "credit" },
      ]);
    },
    [accounts, adjustAccounts, addTxns]
  );

  /** Withdrawal request: funds are put on hold (available ↓) until a officer approves. */
  const requestWithdrawal = useCallback(
    (accountId: string, amount: number, channel: string) => {
      adjustAccounts([{ id: accountId, available: -amount }]);
      addTxns([{ type: "Withdrawal", account: accountName(accountId), account_id: accountId, amount, channel, status: "Pending", direction: "debit" }]);
    },
    [adjustAccounts, addTxns, accountName]
  );

  /**
   * Pay `amount` towards the loan. Whole installments are marked Paid in order;
   * any remainder is a prepayment that reduces the next installment.
   */
  const repayLoan = useCallback(
    (amount: number, source: "sa-002" | "momo", phone?: string) => {
      setSchedule((prev) => {
        let left = amount;
        const rows = prev.map((r) => ({ ...r }));
        for (const r of rows) {
          if (r.status === "Paid" || left <= 0) continue;
          if (left >= r.total) {
            left -= r.total;
            r.status = "Paid";
          } else {
            // Partial prepayment: comes off principal of this installment.
            const cut = Math.min(left, r.principal);
            r.principal -= cut;
            r.total -= cut;
            left -= cut;
          }
        }
        // Recompute running balances so the schedule still reconciles.
        let bal = rows.reduce((s, r) => s + r.principal, 0);
        for (const r of rows) {
          bal -= r.principal;
          r.balance = Math.max(0, bal);
        }
        return rows;
      });
      if (source === "sa-002") adjustAccounts([{ id: "sa-002", balance: -amount, available: -amount }]);
      addTxns([
        {
          type: "Loan Repayment",
          account: ACTIVE_LOAN.product,
          account_id: ACTIVE_LOAN.id,
          source_id: source === "sa-002" ? "sa-002" : undefined,
          amount,
          channel: source === "sa-002" ? "Flexi/Wallet" : `Mobile Money${phone ? ` (${phone})` : ""}`,
          status: "Posted",
          direction: "debit",
        },
      ]);
    },
    [setSchedule, adjustAccounts, addTxns]
  );

  /** Buy `count` ordinary shares at the current share value; issues a certificate. */
  const buyShares = useCallback(
    (count: number, source: "sa-002" | "momo") => {
      const cost = count * shares.share_value;
      const date = todayISO();
      setShares((prev) => {
        const p = { ...SEED_SHARES, ...prev };
        const maxNo = p.certificates.reduce((m, c) => Math.max(m, Number(c.number.replace(/\D/g, "")) || 0), 0);
        const number = `SV-CERT-${String(maxNo + 1).padStart(4, "0")}`;
        return {
          ...p,
          num_shares: p.num_shares + count,
          total_value: p.total_value + cost,
          certificates: [...p.certificates, { number, shares: count, date, amount: cost }],
        };
      });
      if (source === "sa-002") adjustAccounts([{ id: "sa-002", balance: -cost, available: -cost }]);
      addTxns([
        { type: "Share Purchase", account: "Share Capital", account_id: "shares", source_id: source === "sa-002" ? "sa-002" : undefined, amount: cost, channel: source === "sa-002" ? "Flexi/Wallet" : "Mobile Money", status: "Posted", direction: "debit" },
      ]);
      return cost;
    },
    [shares.share_value, setShares, adjustAccounts, addTxns]
  );

  /** Unit price for investment units (cost basis per unit). */
  const unitPrice = shares.iu.unit_balance > 0 ? Math.round(shares.iu.total_invested / shares.iu.unit_balance) : 100_000;

  const buyUnits = useCallback(
    (units: number, source: "sa-002" | "momo") => {
      const cost = units * unitPrice;
      setShares((prev) => {
        const iu = prev.iu ?? SEED_SHARES.iu;
        const total_invested = iu.total_invested + cost;
        return { ...prev, iu: { ...iu, unit_balance: iu.unit_balance + units, total_invested, current_value: total_invested + iu.accrued_returns } };
      });
      if (source === "sa-002") adjustAccounts([{ id: "sa-002", balance: -cost, available: -cost }]);
      addTxns([
        { type: "Investment Units Purchase", account: "Investment Units", account_id: "iu", source_id: source === "sa-002" ? "sa-002" : undefined, amount: cost, channel: source === "sa-002" ? "Flexi/Wallet" : "Mobile Money", status: "Posted", direction: "debit" },
      ]);
      return cost;
    },
    [unitPrice, setShares, adjustAccounts, addTxns]
  );

  /** Redeem units at cost plus their share of accrued returns; proceeds go to Flexi. */
  const redeemUnits = useCallback(
    (units: number) => {
      const iu = shares.iu;
      const returnsPart = iu.unit_balance > 0 ? Math.round((iu.accrued_returns * units) / iu.unit_balance) : 0;
      const proceeds = units * unitPrice + returnsPart;
      setShares((prev) => {
        const cur = prev.iu ?? SEED_SHARES.iu;
        const total_invested = Math.max(0, cur.total_invested - units * unitPrice);
        const accrued_returns = Math.max(0, cur.accrued_returns - returnsPart);
        return { ...prev, iu: { unit_balance: cur.unit_balance - units, total_invested, accrued_returns, current_value: total_invested + accrued_returns } };
      });
      adjustAccounts([{ id: "sa-002", balance: proceeds, available: proceeds }]);
      addTxns([{ type: "Investment Units Redemption", account: "Flexi/Wallet", account_id: "sa-002", amount: proceeds, channel: "Internal Transfer", status: "Posted", direction: "credit" }]);
      return proceeds;
    },
    [shares.iu, unitPrice, setShares, adjustAccounts, addTxns]
  );

  /** Submit a loan application: saved for the member AND queued for admin review. */
  const applyForLoan = useCallback(
    (app: { product: string; amount: number; term: number; purpose: string; guarantors: string[] }) => {
      const id = uid("la");
      const applied_date = todayISO();
      setLoanApps((prev) => [{ id, ...app, applied_date, status: "pending_review" }, ...prev]);
      setAdminApps((prev) => [
        {
          id,
          sv: DEMO_MEMBER.sv_number,
          member: DEMO_MEMBER.full_name,
          product: app.product,
          amount: app.amount,
          term: `${app.term} months`,
          status: "pending_review",
          applied_date,
          score: derived.healthScore,
          guarantors: app.guarantors,
          purpose: app.purpose,
        },
        ...prev,
      ]);
      return id;
    },
    [setLoanApps, setAdminApps, derived.healthScore]
  );

  /** Member applications with the latest status an admin has set on the same id. */
  const applications = useMemo(
    () =>
      loanApps.map((a) => {
        const adm = adminApps.find((x) => x.id === a.id);
        return adm ? { ...a, status: adm.status } : a;
      }),
    [loanApps, adminApps]
  );

  return {
    hydrated,
    today,
    accounts,
    transactions,
    schedule,
    shares,
    applications,
    daysToNextPayment,
    unitPrice,
    ...derived,
    accountName,
    deposit,
    transfer,
    requestWithdrawal,
    repayLoan,
    buyShares,
    buyUnits,
    redeemUnits,
    applyForLoan,
  };
}

export type PortalData = ReturnType<typeof usePortalData>;
