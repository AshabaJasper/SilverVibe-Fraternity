"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import {
  PiggyBank,
  CreditCard,
  BarChart3,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Flame,
  FileText,
  Phone,
  ChevronRight,
  Megaphone,
  Clock,
  Users,
  Receipt,
  Landmark,
  Building2,
  Coins,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import Modal, { Button } from "@/components/Modal";
import { Badge, EmptyState } from "@/components/ui";
import { useAuthStore } from "@/lib/store";
import { ANNOUNCEMENTS, DEMO_MEMBER } from "@/lib/mock-data";
import { cn, formatCurrency, formatDate, getGreeting } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { TIMELINE_EVENTS as EV, isRevealed } from "@/lib/demo-clock";
import { AGM_DATE, DECLARED_DIVIDEND, liveSavingsHistory, relativeDays, usePortalData } from "./_lib/usePortalData";
import DepositModal from "./_components/DepositModal";
import ApplyLoanModal from "./_components/ApplyLoanModal";
import ActionParam from "./_components/ActionParam";
import LoanStatusNotifier from "./_components/LoanStatusNotifier";

type Announcement = (typeof ANNOUNCEMENTS)[number];

function DashStat({
  label,
  value,
  icon: Icon,
  color,
  subtext,
  href,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  subtext?: string;
  href: string;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in group block"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <ChevronRight className="w-4 h-4 text-[#C0C0C0] group-hover:text-[#4A90D9] transition-colors" />
      </div>
      <p className="text-sm dm-text-secondary mb-1">{label}</p>
      <p className="text-xl font-bold dm-text">{value}</p>
      {subtext && <p className="text-xs dm-text-secondary mt-1">{subtext}</p>}
    </Link>
  );
}

const UPCOMING_TONES: Record<string, string> = {
  blue: "#4A90D9",
  green: "#22c55e",
  amber: "#f59e0b",
  purple: "#a855f7",
};

interface UpcomingItem {
  id: string;
  title: string;
  detail: string;
  date: string;
  icon: React.ElementType;
  tone: keyof typeof UPCOMING_TONES;
  /** Link target; items without one open the related announcement. */
  href?: string;
  announcementId?: string;
}

const targetPctOf = (contributed: number, target: number) => (target > 0 ? Math.min(100, Math.round((contributed / target) * 100)) : 0);

export default function MemberDashboard() {
  const data = usePortalData();
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);

  const [depositOpen, setDepositOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  // Time-of-day greeting and the stored user name differ between server and
  // browser, so render neutral text until hydrated.
  const firstName = ((hydrated && user?.name) || DEMO_MEMBER.full_name).split(" ")[0];
  const greeting = hydrated ? getGreeting() : "Welcome back";

  const {
    accounts,
    transactions,
    totalSavings,
    outstandingLoan,
    sharesValue,
    iuValue,
    netWorth,
    nextPayment,
    monthlyTarget,
    monthlyContributed,
    nextSavingsOrder,
    streak,
    healthFactors,
    healthScore,
    shares,
    schedule,
    today,
  } = data;

  const targetPct = targetPctOf(monthlyContributed, monthlyTarget);
  const fixed = accounts.find((a) => a.id === "sa-003");
  const paidCount = schedule.filter((r) => r.status === "Paid").length;

  // Upcoming dates on the demo clock, sorted soonest first. Events drop off once
  // they pass; the AGM is replaced by the dividend payment after 20 Feb 2027.
  const agmHeld = today > AGM_DATE;
  const agmAnnouncement = isRevealed(EV.agmNotice, today) ? "ann-agm-notice" : "ann-agm-save-date";
  const candidates: (UpcomingItem | null | undefined | false)[] = [
    nextPayment && {
      id: "loan",
      title: "Loan installment (standing order)",
      detail: `${formatCurrency(nextPayment.total)} · installment ${nextPayment.installment} of ${schedule.length}`,
      date: nextPayment.due_date,
      icon: CreditCard,
      tone: "blue",
      href: "/portal/loans",
    },
    monthlyTarget > 0 && {
      id: "savings-order",
      title: "Regular Savings standing order",
      detail: `${formatCurrency(EV.savingsStandingOrderAmount)} to Regular Savings`,
      date: nextSavingsOrder,
      icon: PiggyBank,
      tone: "green",
      href: "/portal/savings",
    },
    {
      id: "board",
      title: "Board meeting",
      detail: "Quarterly review and AGM preparations",
      date: EV.boardMeeting,
      icon: Landmark,
      tone: "amber",
      href: undefined,
      announcementId: "ann-agm-save-date",
    },
    // Festive closure: shown once the notice is out, until the office reopens.
    isRevealed(EV.festiveNotice, today) &&
      (today < EV.officeClosedFrom
        ? { id: "office", title: "Office closes for the holidays", detail: "Reopens Monday 4 January · portal stays open", date: EV.officeClosedFrom, icon: Building2, tone: "amber", href: undefined, announcementId: "ann-festive" }
        : { id: "office", title: "Office reopens", detail: "Closed since 24 December · portal open throughout", date: EV.officeReopens, icon: Building2, tone: "amber", href: undefined, announcementId: "ann-festive" }),
    agmHeld
      ? {
          id: "dividend",
          title: `${EV.dividendFy} dividend payable`,
          detail: `${EV.dividendRatePct}% declared at the AGM · ${formatCurrency(DECLARED_DIVIDEND)}`,
          date: EV.dividendPayable,
          icon: Coins,
          tone: "purple",
          href: "/portal/shares",
        }
      : {
          id: "agm",
          title: "Annual General Meeting",
          detail: `${EV.agmVenue} · ${EV.dividendFy} dividend to be declared`,
          date: AGM_DATE,
          icon: Users,
          tone: "purple",
          href: undefined,
          announcementId: agmAnnouncement,
        },
    fixed?.maturity_date
      ? {
          id: "fixed",
          title: "Fixed deposit matures",
          detail: `${formatCurrency(fixed.balance + fixed.accrued_interest)} incl. interest`,
          date: fixed.maturity_date,
          icon: Clock,
          tone: "amber",
          href: "/portal/savings",
        }
      : null,
  ];
  const upcoming = candidates
    .filter((x): x is UpcomingItem => Boolean(x))
    .filter((x) => x.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Announcements published so far, newest first.
  const announcements = ANNOUNCEMENTS.filter((a) => isRevealed(a.date, today)).sort((a, b) => (a.date < b.date ? 1 : -1));

  // Between the 1st and the 2nd the month's standing order is still to come.
  const orderDueSoon = targetPctOf(monthlyContributed, monthlyTarget) < 100 && nextSavingsOrder.slice(0, 7) === today.slice(0, 7);

  const recent = transactions.slice(0, 5);
  const history = liveSavingsHistory(accounts, today);
  const scoreColor = healthScore >= 75 ? "#22c55e" : healthScore >= 50 ? "#f59e0b" : "#ef4444";

  const quickActions = [
    { label: "Quick Deposit", icon: Wallet, onClick: () => setDepositOpen(true), color: "#22c55e" },
    { label: "Apply for Loan", icon: CreditCard, onClick: () => setLoanOpen(true), color: "#4A90D9" },
    { label: "Download Statement", icon: FileText, href: "/portal/savings?action=statement", color: "#a855f7" },
    { label: "Contact Support", icon: Phone, href: "/portal/support", color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <LoanStatusNotifier />
      <Suspense fallback={null}>
        <ActionParam actions={{ deposit: () => setDepositOpen(true), apply: () => setLoanOpen(true) }} />
      </Suspense>

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold dm-text">
            {greeting}, {firstName}
          </h1>
          <p className="dm-text-secondary mt-1">Here&apos;s your financial overview at SilverVibe Fraternity</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#4A90D9] font-semibold">{DEMO_MEMBER.sv_number}</span>
          <Badge status={DEMO_MEMBER.status} />
        </div>
      </div>

      {/* Net Worth */}
      <div className="silver-gradient rounded-2xl p-6 md:p-8 relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C0C0C0]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-[#C0C0C0] text-sm mb-1">Net Worth</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{formatCurrency(netWorth)}</p>
          <p className="text-xs text-[#C0C0C0]/80 mt-1">Savings + shares + investment units − loan balance</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { label: "Savings", value: totalSavings },
              { label: "Share Capital", value: sharesValue },
              { label: "Investment Units", value: iuValue },
              { label: "Loan Outstanding", value: -outstandingLoan },
            ].map((b) => (
              <div key={b.label} className="bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                <p className="text-[#C0C0C0] text-xs">{b.label}</p>
                <p className={cn("font-semibold", b.value < 0 ? "text-[#fca5a5]" : "text-white")}>{formatCurrency(b.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashStat label="Total Savings" value={formatCurrency(totalSavings)} icon={PiggyBank} color="#22c55e" subtext={`${accounts.length} accounts`} href="/portal/savings" delay={100} />
        <DashStat
          label="Loan Outstanding"
          value={formatCurrency(outstandingLoan)}
          icon={CreditCard}
          color="#4A90D9"
          subtext={outstandingLoan > 0 ? `${paidCount} of ${schedule.length} installments paid` : "Loan fully repaid"}
          href="/portal/loans"
          delay={200}
        />
        <DashStat label="Share Capital" value={formatCurrency(sharesValue)} icon={BarChart3} color="#f59e0b" subtext={`${shares.num_shares} shares`} href="/portal/shares" delay={300} />
        <DashStat label="Investment Units" value={formatCurrency(iuValue)} icon={TrendingUp} color="#a855f7" subtext={`${shares.iu.unit_balance} units`} href="/portal/shares" delay={400} />
      </div>

      {/* Target, health, upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text">Monthly Target</h3>
            {streak > 0 && (
              <div className="flex items-center gap-1 text-[#f59e0b]" title="Consecutive months with a Regular Savings deposit">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {streak} month{streak === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5 gap-2">
              <span className="dm-text-secondary">Regular Savings</span>
              <span className="font-semibold dm-text text-right">
                {formatCurrency(monthlyContributed)} / {formatCurrency(monthlyTarget)}
              </span>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: "var(--dm-border)" }}>
              <div className="bg-[#22c55e] h-3 rounded-full transition-all duration-700" style={{ width: `${targetPct}%` }} />
            </div>
          </div>
          <p className={cn("text-xs font-medium mt-3", targetPct >= 100 ? "text-[#16a34a]" : "dm-text-secondary")}>
            {targetPct >= 100
              ? `Target met this month${streak > 1 ? ` — ${streak}-month streak, keep it up!` : "!"}`
              : orderDueSoon
                ? `Standing order of ${formatCurrency(EV.savingsStandingOrderAmount)} due ${relativeDays(nextSavingsOrder, today)} (${formatDate(nextSavingsOrder)}).`
                : `${formatCurrency(monthlyTarget - monthlyContributed)} to go this month.`}
          </p>
          {targetPct < 100 && !orderDueSoon && (
            <Button variant="success" className="mt-4 w-full" onClick={() => setDepositOpen(true)}>
              <Wallet className="w-4 h-4" /> Deposit now
            </Button>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <h3 className="font-semibold dm-text mb-4">Financial Health</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--dm-border)" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="10"
                  strokeDasharray={`${healthScore * 3.1416} ${100 * 3.1416}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold" style={{ color: scoreColor }}>{healthScore}</span>
                  <p className="text-xs dm-text-secondary">out of 100</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {healthFactors.map((f) => (
              <div key={f.label} title={f.detail}>
                <div className="flex items-center gap-2">
                  <span className="text-xs dm-text-secondary w-36 shrink-0">{f.label}</span>
                  <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: "var(--dm-border)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${f.score}%`, backgroundColor: f.color }} />
                  </div>
                  <span className="text-xs font-semibold w-7 text-right" style={{ color: f.color }}>{f.score}</span>
                </div>
                <p className="text-[11px] dm-text-secondary mt-0.5">{f.detail} · weight {Math.round(f.weight * 100)}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <h3 className="font-semibold dm-text mb-4 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#4A90D9]" /> Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing coming up" />
          ) : (
            <div className="space-y-3">
              {upcoming.map((u) => {
                const c = UPCOMING_TONES[u.tone];
                const body = (
                  <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ backgroundColor: `${c}0d`, borderColor: `${c}26` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${c}1a` }}>
                      <u.icon className="w-4 h-4" style={{ color: c }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium dm-text">{u.title}</p>
                      <p className="text-xs dm-text-secondary">{u.detail}</p>
                      <p className="text-xs font-medium mt-1" style={{ color: c }}>
                        {formatDate(u.date)}
                        {` · ${relativeDays(u.date, today)}`}
                      </p>
                    </div>
                  </div>
                );
                return u.href ? (
                  <Link key={u.id} href={u.href} className="block hover:opacity-90">
                    {body}
                  </Link>
                ) : (
                  <button
                    key={u.id}
                    type="button"
                    className="block w-full text-left hover:opacity-90"
                    onClick={() => setAnnouncement(ANNOUNCEMENTS.find((a) => a.id === u.announcementId) ?? null)}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((a) => {
          const inner = (
            <>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${a.color}1a` }}>
                <a.icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <span className="text-xs font-medium dm-text text-center">{a.label}</span>
            </>
          );
          const cls = "glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5";
          return a.href ? (
            <Link key={a.label} href={a.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={a.label} type="button" onClick={a.onClick} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>

      {/* Chart & recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold dm-text mb-4">Savings Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="regular" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="Regular" />
                <Line type="monotone" dataKey="flexi" stroke="#4A90D9" strokeWidth={2} dot={{ r: 3 }} name="Flexi" />
                <Line type="monotone" dataKey="fixed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Fixed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text">Recent Transactions</h3>
            <Link href="/portal/savings" className="text-sm text-[#4A90D9] hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions yet" hint="Your deposits and repayments will appear here." />
          ) : (
            <div className="space-y-1">
              {recent.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", tx.direction === "credit" ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10")}>
                    {tx.direction === "credit" ? <ArrowDownRight className="w-4 h-4 text-[#22c55e]" /> : <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dm-text truncate">
                      {tx.type} {tx.status !== "Posted" && <Badge status={tx.status} className="ml-1" />}
                    </p>
                    <p className="text-xs dm-text-secondary truncate">
                      {tx.account} · {formatDate(tx.date)}
                    </p>
                  </div>
                  <p className={cn("text-sm font-semibold whitespace-nowrap", tx.direction === "credit" ? "text-[#16a34a]" : "text-[#ef4444]")}>
                    {tx.direction === "credit" ? "+" : "−"}
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Announcements */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold dm-text mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#4A90D9]" /> Announcements
        </h3>
        {announcements.length === 0 && <EmptyState icon={Megaphone} title="No announcements yet" />}
        <div className="space-y-3">
          {announcements.map((ann) => (
            <button
              key={ann.id}
              type="button"
              onClick={() => setAnnouncement(ann)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-colors hover:shadow-sm",
                ann.priority === "high" ? "bg-[#4A90D9]/5 border-[#4A90D9]/20" : "dm-surface-hover dm-border"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold dm-text">{ann.title}</h4>
                  <p className="text-xs dm-text-secondary mt-1 line-clamp-2">{ann.content}</p>
                  <span className="text-xs text-[#4A90D9] font-medium mt-1 inline-block">Read more</span>
                </div>
                <span className="text-xs dm-text-secondary whitespace-nowrap">{formatDate(ann.date)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <ApplyLoanModal open={loanOpen} onClose={() => setLoanOpen(false)} />

      <Modal
        open={!!announcement}
        onClose={() => setAnnouncement(null)}
        title={announcement?.title ?? ""}
        footer={<Button onClick={() => setAnnouncement(null)}>Close</Button>}
      >
        {announcement && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs dm-text-secondary">
              <span>Posted {formatDate(announcement.date)}</span>
              {announcement.priority === "high" && <Badge status="Important" tone="blue" />}
            </div>
            <p className="text-sm dm-text leading-relaxed">{announcement.content}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
