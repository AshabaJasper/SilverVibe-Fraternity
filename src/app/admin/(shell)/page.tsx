"use client";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ADMIN_KPI, ADMIN_SAVINGS_GROWTH, ADMIN_LOAN_PERFORMANCE,
  ADMIN_PRODUCT_DISTRIBUTION, ADMIN_RECENT_ACTIVITY, ADMIN_PENDING_APPROVALS,
  MEMBER_GROWTH, PORTFOLIO_QUALITY,
} from "@/lib/mock-data";
import {
  Users, PiggyBank, CreditCard, AlertTriangle, BarChart3, Target,
  Clock, TrendingUp, TrendingDown, ArrowUpRight, Plus, FileText,
  Megaphone, CheckCircle2, XCircle, UserPlus, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

function KPICard({
  label, value, change, icon: Icon, color, suffix, prefix,
}: {
  label: string; value: string | number; change?: number;
  icon: React.ElementType; color: string; suffix?: string; prefix?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] hover:shadow-md transition-all animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            change >= 0 ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#ef4444]/10 text-[#ef4444]"
          }`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-xs text-[#64748b] mb-1">{label}</p>
      <p className="text-xl font-bold text-[#1A1A1A]">
        {prefix}{typeof value === "number" ? formatNumber(value) : value}{suffix}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const kpi = ADMIN_KPI;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
          <p className="text-[#64748b] text-sm">Welcome back, Sarah. Here&apos;s your SACCO overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/members" className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
            <UserPlus className="w-4 h-4" /> Register Member
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Members" value={kpi.total_members.value} change={kpi.total_members.change} icon={Users} color="#4A90D9" />
        <KPICard label="Total Savings" value={formatCurrency(kpi.total_savings.value)} change={kpi.total_savings.change} icon={PiggyBank} color="#22c55e" />
        <KPICard label="Loan Book" value={formatCurrency(kpi.total_loan_book.value)} change={kpi.total_loan_book.change} icon={CreditCard} color="#1A1A1A" />
        <KPICard label="PAR > 30 Days" value={kpi.par_30.value} suffix="%" change={kpi.par_30.change} icon={AlertTriangle} color="#ef4444" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Share Capital" value={formatCurrency(kpi.total_share_capital.value)} change={kpi.total_share_capital.change} icon={BarChart3} color="#a855f7" />
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <span className="text-xs font-semibold text-[#f59e0b]">{kpi.monthly_collections.percent}%</span>
          </div>
          <p className="text-xs text-[#64748b] mb-1">Monthly Collections vs Target</p>
          <p className="text-xl font-bold text-[#1A1A1A] mb-2">{formatCurrency(kpi.monthly_collections.value)}</p>
          <div className="w-full bg-[#e2e8f0] rounded-full h-2">
            <div className="bg-[#f59e0b] h-2 rounded-full" style={{ width: `${kpi.monthly_collections.percent}%` }} />
          </div>
          <p className="text-xs text-[#64748b] mt-1">Target: {formatCurrency(kpi.monthly_collections.target)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ef4444]" />
            </div>
          </div>
          <p className="text-xs text-[#64748b] mb-1">Pending Approvals</p>
          <p className="text-3xl font-bold text-[#ef4444]">{kpi.pending_approvals.value}</p>
          <Link href="/admin/settings" className="text-xs text-[#4A90D9] hover:underline mt-2 inline-block">
            Review now →
          </Link>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Savings Growth */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Savings Growth (12 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ADMIN_SAVINGS_GROWTH}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="amount" stroke="#1A1A1A" fill="#1A1A1A" fillOpacity={0.05} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loan Performance */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Loan Disbursement vs Recovery</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ADMIN_LOAN_PERFORMANCE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="disbursed" fill="#4A90D9" radius={[4, 4, 0, 0]} name="Disbursed" />
                <Bar dataKey="recovered" fill="#22c55e" radius={[4, 4, 0, 0]} name="Recovered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Member Growth */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Member Growth</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MEMBER_GROWTH}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={["dataMin - 20", "dataMax + 10"]} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="members" stroke="#4A90D9" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Savings Product Distribution</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ADMIN_PRODUCT_DISTRIBUTION} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {ADMIN_PRODUCT_DISTRIBUTION.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {ADMIN_PRODUCT_DISTRIBUTION.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[#64748b]">{d.name}</span>
                </div>
                <span className="font-medium text-[#1A1A1A]">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Quality */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Loan Portfolio Quality</h3>
          <div className="space-y-3">
            {PORTFOLIO_QUALITY.map((pq) => {
              const colors: Record<string, string> = {
                "Current": "#22c55e", "Watch (1-30)": "#f59e0b",
                "Substandard (31-60)": "#f97316", "Doubtful (61-90)": "#ef4444", "Loss (90+)": "#991b1b",
              };
              return (
                <div key={pq.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748b]">{pq.category}</span>
                    <span className="font-medium" style={{ color: colors[pq.category] }}>{pq.percent}%</span>
                  </div>
                  <div className="w-full bg-[#e2e8f0] rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pq.percent}%`, backgroundColor: colors[pq.category] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-[#f1f5f9] rounded-lg">
            <p className="text-xs text-[#64748b]">Total Loan Book</p>
            <p className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(ADMIN_KPI.total_loan_book.value)}</p>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Recent Activity</h3>
          <div className="space-y-3">
            {ADMIN_RECENT_ACTIVITY.map((act) => {
              const statusColors: Record<string, string> = {
                posted: "#22c55e", pending: "#f59e0b", completed: "#4A90D9", approved: "#22c55e",
              };
              return (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f1f5f9] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#64748b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1A1A1A]">{act.action}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: `${statusColors[act.status]}15`, color: statusColors[act.status] }}>
                        {act.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5 truncate">{act.detail}</p>
                    <p className="text-[10px] text-[#C0C0C0] mt-0.5">{act.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1A1A1A] text-sm">Pending Approvals</h3>
            <span className="px-2 py-0.5 bg-[#ef4444]/10 text-[#ef4444] rounded-full text-xs font-semibold">
              {ADMIN_PENDING_APPROVALS.length}
            </span>
          </div>
          <div className="space-y-3">
            {ADMIN_PENDING_APPROVALS.map((pa) => (
              <div key={pa.id} className="p-3 border border-[#e2e8f0] rounded-lg hover:border-[#4A90D9]/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1A1A1A]">{pa.type}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{pa.member}</p>
                    {pa.amount && <p className="text-sm font-semibold text-[#1A1A1A] mt-1">{formatCurrency(pa.amount)}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button className="p-1.5 rounded-lg bg-[#22c55e]/10 hover:bg-[#22c55e]/20 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    </button>
                    <button className="p-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 transition-colors">
                      <XCircle className="w-4 h-4 text-[#ef4444]" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    pa.priority === "high" ? "bg-[#ef4444]/10 text-[#ef4444]" :
                    pa.priority === "medium" ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                    "bg-[#64748b]/10 text-[#64748b]"
                  }`}>{pa.priority}</span>
                  <span className="text-[10px] text-[#C0C0C0]">{pa.submitted}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
