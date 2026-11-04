"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Users, PiggyBank, CreditCard, AlertTriangle, BarChart3, Target,
  Clock, TrendingUp, TrendingDown, CheckCircle2, XCircle, UserPlus, ChevronRight,
  ArrowLeftRight, FilePlus2, Megaphone, PartyPopper, RotateCcw,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  ADMIN_KPI, ADMIN_SAVINGS_GROWTH, ADMIN_LOAN_PERFORMANCE, ADMIN_PRODUCT_DISTRIBUTION,
  ADMIN_RECENT_ACTIVITY, ADMIN_PENDING_APPROVALS, ADMIN_MEMBERS_LIST, ADMIN_LOAN_APPLICATIONS,
  DEMO_ADMIN, DEMO_TODAY, MEMBER_GROWTH, PORTFOLIO_QUALITY,
} from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { Badge, EmptyState } from "@/components/ui";

type PendingApproval = (typeof ADMIN_PENDING_APPROVALS)[number];
type ActivityItem = (typeof ADMIN_RECENT_ACTIVITY)[number];

const PENDING_KEY = "admin_pending_approvals";

// Neutral grid colour that reads in both light and dark mode.
const GRID = { stroke: "#94a3b8", strokeOpacity: 0.25 };
const AXIS_TICK = { fontSize: 11, fill: "#64748b" };

// #1A1A1A disappears on a dark background, so remap it for the pie chart.
const PRODUCT_COLORS = ADMIN_PRODUCT_DISTRIBUTION.map((p) => (p.color === "#1A1A1A" ? "#64748b" : p.color));

const PQ_COLORS: Record<string, string> = {
  Current: "#22c55e", "Watch (1-30)": "#f59e0b", "Substandard (31-60)": "#f97316",
  "Doubtful (61-90)": "#ef4444", "Loss (90+)": "#991b1b",
};

/** Pull "SV-0067" out of "Peter Okello (SV-0067)". */
function svFrom(text: string): string | null {
  return /SV-\d{4}/.exec(text)?.[0] ?? null;
}

/** Where a pending approval is actioned in full. */
function approvalHref(pa: PendingApproval): string {
  const t = pa.type.toLowerCase();
  if (t.includes("loan")) return "/admin/loans?tab=applications";
  if (t.includes("withdrawal") || t.includes("deposit")) return "/admin/savings?tab=transactions";
  if (t.includes("profile")) {
    const sv = svFrom(pa.member);
    return sv ? `/admin/members?q=${sv}` : "/admin/members";
  }
  if (t.includes("journal")) return "/admin/accounting?tab=journal";
  return "/admin/settings?tab=audit";
}

/** Where a recent-activity entry can be inspected. */
function activityHref(a: ActivityItem): string {
  const t = a.action.toLowerCase();
  if (t.includes("deposit") || t.includes("withdrawal")) return "/admin/savings?tab=transactions";
  if (t.includes("loan application")) return "/admin/loans?tab=applications";
  if (t.includes("loan")) return "/admin/loans?tab=active";
  if (t.includes("member")) {
    const sv = svFrom(a.detail);
    return sv ? `/admin/members?q=${sv}` : "/admin/members";
  }
  if (t.includes("interest")) return "/admin/accounting?tab=journal";
  return "/admin/settings?tab=audit";
}

function KPICard({
  label, value, change, icon: Icon, color, href, sub,
}: {
  label: string; value: string; change?: number; icon: LucideIcon; color: string; href: string; sub?: string;
}) {
  return (
    <Link href={href} className="block glass-card rounded-xl p-5 hover:shadow-md transition-all animate-fade-in group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            change >= 0 ? "bg-[#22c55e]/10 text-[#16a34a]" : "bg-[#ef4444]/10 text-[#dc2626]"
          }`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-xs dm-text-secondary mb-1">{label}</p>
      <p className="text-xl font-bold dm-text truncate">{value}</p>
      <p className="text-[11px] dm-text-secondary mt-1 flex items-center gap-0.5 group-hover:text-[#4A90D9]">
        {sub ?? "View details"} <ChevronRight className="w-3 h-3" />
      </p>
    </Link>
  );
}

function QuickAction({ href, icon: Icon, label, color }: { href: string; icon: LucideIcon; label: string; color: string }) {
  return (
    <Link href={href} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all">
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a` }}>
        <Icon className="w-[18px] h-[18px]" style={{ color }} />
      </span>
      <span className="text-sm font-medium dm-text">{label}</span>
      <ChevronRight className="w-4 h-4 dm-text-secondary ml-auto" />
    </Link>
  );
}

export default function AdminDashboard() {
  const kpi = ADMIN_KPI;
  const [pending, setPending] = usePersistedState<PendingApproval[]>(PENDING_KEY, ADMIN_PENDING_APPROVALS);
  const [members] = usePersistedState(KEYS.adminMembers, ADMIN_MEMBERS_LIST);
  const [, setLoanApps] = usePersistedState(KEYS.adminLoanApps, ADMIN_LOAN_APPLICATIONS);

  // Society-wide count: seeded total plus/minus members registered or removed in the demo register.
  const totalMembers = kpi.total_members.value + (members.length - ADMIN_MEMBERS_LIST.length);

  const decide = (pa: PendingApproval, approved: boolean) => {
    setPending((prev) => prev.filter((p) => p.id !== pa.id));
    // Keep the Loans page in step: a loan application decided here is decided there too.
    const sv = svFrom(pa.member);
    if (pa.type === "Loan Application" && sv) {
      setLoanApps((prev) =>
        prev.map((a) =>
          a.sv === sv && (a.status === "pending_review" || a.status === "under_appraisal")
            ? { ...a, status: approved ? "approved" : "rejected" }
            : a
        )
      );
    }
    showToast(
      `${pa.type} for ${pa.member} ${approved ? "approved" : "rejected"}`,
      approved ? "success" : "info"
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold dm-text">Dashboard</h1>
          <p className="dm-text-secondary text-sm">
            Welcome back, {DEMO_ADMIN.full_name.split(" ")[0]}. Here&apos;s your SACCO overview as at {formatDate(DEMO_TODAY)}.
          </p>
        </div>
        <Link
          href="/admin/members?action=register"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Register Member
        </Link>
      </div>

      {/* KPI Cards — every tile opens the page that owns the number */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Members" value={formatNumber(totalMembers)} change={kpi.total_members.change} icon={Users} color="#4A90D9" href="/admin/members" sub={`${kpi.total_members.active} active`} />
        <KPICard label="Total Savings" value={formatCurrency(kpi.total_savings.value)} change={kpi.total_savings.change} icon={PiggyBank} color="#22c55e" href="/admin/savings" />
        <KPICard label="Loan Book" value={formatCurrency(kpi.total_loan_book.value)} change={kpi.total_loan_book.change} icon={CreditCard} color="#a855f7" href="/admin/loans?tab=active" />
        <KPICard label="PAR > 30 Days" value={`${kpi.par_30.value}%`} change={kpi.par_30.change} icon={AlertTriangle} color="#ef4444" href="/admin/loans?tab=overview" sub="Portfolio quality" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Share Capital" value={formatCurrency(kpi.total_share_capital.value)} change={kpi.total_share_capital.change} icon={BarChart3} color="#a855f7" href="/admin/shares" />
        <Link href="/admin/savings?tab=transactions" className="block glass-card rounded-xl p-5 hover:shadow-md transition-all animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <span className="text-xs font-semibold text-[#d97706]">{kpi.monthly_collections.percent}%</span>
          </div>
          <p className="text-xs dm-text-secondary mb-1">Monthly Collections vs Target</p>
          <p className="text-xl font-bold dm-text mb-2">{formatCurrency(kpi.monthly_collections.value)}</p>
          <div className="w-full bg-[#94a3b8]/25 rounded-full h-2">
            <div className="bg-[#f59e0b] h-2 rounded-full" style={{ width: `${kpi.monthly_collections.percent}%` }} />
          </div>
          <p className="text-xs dm-text-secondary mt-1">Target: {formatCurrency(kpi.monthly_collections.target)}</p>
        </Link>
        <Link href="/admin/loans?tab=applications" className="block glass-card rounded-xl p-5 hover:shadow-md transition-all animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ef4444]" />
            </div>
          </div>
          <p className="text-xs dm-text-secondary mb-1">Pending Approvals</p>
          <p className="text-3xl font-bold text-[#ef4444]">{pending.length}</p>
          <span className="text-xs text-[#4A90D9] hover:underline mt-2 inline-flex items-center gap-0.5">
            Review now <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction href="/admin/members?action=register" icon={UserPlus} label="Register member" color="#4A90D9" />
        <QuickAction href="/admin/savings?tab=transactions" icon={ArrowLeftRight} label="Record transaction" color="#22c55e" />
        <QuickAction href="/admin/loans?action=new" icon={FilePlus2} label="New loan application" color="#a855f7" />
        <QuickAction href="/admin/communications" icon={Megaphone} label="Send announcement" color="#f59e0b" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text text-sm">Savings Growth (12 Months)</h3>
            <Link href="/admin/savings" className="text-xs text-[#4A90D9] hover:underline">Savings</Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ADMIN_SAVINGS_GROWTH}>
                <CartesianGrid strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Area type="monotone" dataKey="amount" name="Total savings" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text text-sm">Loan Disbursement vs Recovery</h3>
            <Link href="/admin/loans?tab=overview" className="text-xs text-[#4A90D9] hover:underline">Loans</Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {/* Side-by-side bars: the two series are compared, not summed. */}
              <BarChart data={ADMIN_LOAN_PERFORMANCE}>
                <CartesianGrid strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="disbursed" fill="#4A90D9" radius={[4, 4, 0, 0]} name="Disbursed" />
                <Bar dataKey="recovered" fill="#22c55e" radius={[4, 4, 0, 0]} name="Recovered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h3 className="font-semibold dm-text mb-4 text-sm">Member Growth</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MEMBER_GROWTH}>
                <CartesianGrid strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} domain={["dataMin - 20", "dataMax + 10"]} />
                <Tooltip />
                <Line type="monotone" dataKey="members" name="Members" stroke="#4A90D9" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h3 className="font-semibold dm-text mb-4 text-sm">Savings Product Distribution</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ADMIN_PRODUCT_DISTRIBUTION} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                  {ADMIN_PRODUCT_DISTRIBUTION.map((entry, i) => (
                    <Cell key={entry.name} fill={PRODUCT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {ADMIN_PRODUCT_DISTRIBUTION.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[i] }} />
                  <span className="dm-text-secondary">{d.name}</span>
                </div>
                <span className="font-medium dm-text">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text text-sm">Loan Portfolio Quality</h3>
            <Link href="/admin/loans?tab=active" className="text-xs text-[#4A90D9] hover:underline">Active loans</Link>
          </div>
          <div className="space-y-3">
            {PORTFOLIO_QUALITY.map((pq) => (
              <div key={pq.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="dm-text-secondary">{pq.category}</span>
                  <span className="font-medium" style={{ color: PQ_COLORS[pq.category] }}>{pq.percent}%</span>
                </div>
                <div className="w-full bg-[#94a3b8]/25 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${pq.percent}%`, backgroundColor: PQ_COLORS[pq.category] }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 dm-surface-hover rounded-lg">
            <p className="text-xs dm-text-secondary">Total Loan Book</p>
            <p className="text-sm font-bold dm-text">{formatCurrency(kpi.total_loan_book.value)}</p>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text text-sm">Recent Activity</h3>
            <Link href="/admin/settings?tab=audit" className="text-xs text-[#4A90D9] hover:underline inline-flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {ADMIN_RECENT_ACTIVITY.map((act) => (
              <Link key={act.id} href={activityHref(act)} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f1f5f9] transition-colors">
                <div className="w-8 h-8 rounded-lg dm-surface-hover flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 dm-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold dm-text">{act.action}</span>
                    <Badge status={act.status} />
                  </div>
                  <p className="text-xs dm-text-secondary mt-0.5 truncate">{act.detail}</p>
                  <p className="text-[10px] dm-text-secondary opacity-70 mt-0.5">{act.time} · {act.user}</p>
                </div>
                <ChevronRight className="w-4 h-4 dm-text-secondary self-center shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text text-sm">Pending Approvals</h3>
            <span className="px-2 py-0.5 bg-[#ef4444]/10 text-[#dc2626] rounded-full text-xs font-semibold">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="All caught up"
              hint="There are no items waiting for your approval."
              action={
                <button
                  type="button"
                  onClick={() => { setPending(ADMIN_PENDING_APPROVALS); showToast("Demo approvals restored", "info"); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border dm-border rounded-lg text-xs font-medium dm-text hover:bg-[#f1f5f9]"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore demo items
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {pending.map((pa) => (
                <div key={pa.id} className="p-3 border dm-border rounded-lg hover:border-[#4A90D9]/40 transition-colors flex items-start gap-3">
                  <Link href={approvalHref(pa)} className="flex-1 min-w-0 group" title="Open in the relevant page">
                    <p className="text-xs font-semibold dm-text group-hover:text-[#4A90D9] inline-flex items-center gap-0.5">
                      {pa.type} <ChevronRight className="w-3 h-3" />
                    </p>
                    <p className="text-xs dm-text-secondary mt-0.5">{pa.member}</p>
                    {pa.amount !== null && <p className="text-sm font-semibold dm-text mt-1">{formatCurrency(pa.amount)}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge status={pa.priority} tone={pa.priority === "high" ? "red" : pa.priority === "medium" ? "amber" : "gray"} />
                      <span className="text-[10px] dm-text-secondary">Submitted {formatDate(pa.submitted)}</span>
                    </div>
                  </Link>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => decide(pa, true)}
                      title="Approve"
                      aria-label={`Approve ${pa.type} for ${pa.member}`}
                      className="p-1.5 rounded-lg bg-[#22c55e]/10 hover:bg-[#22c55e]/20 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(pa, false)}
                      title="Reject"
                      aria-label={`Reject ${pa.type} for ${pa.member}`}
                      className="p-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4 text-[#ef4444]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
