"use client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MEMBER_SAVINGS, RECENT_TRANSACTIONS, SAVINGS_HISTORY } from "@/lib/mock-data";
import {
  PiggyBank, ArrowDownRight, ArrowUpRight, Download, Eye, Lock,
  TrendingUp, CalendarDays, Percent,
} from "lucide-react";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#1A1A1A", "#4A90D9", "#22c55e", "#f59e0b"];

export default function SavingsPage() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const totalSavings = MEMBER_SAVINGS.reduce((s, a) => s + a.balance, 0);
  const totalInterest = MEMBER_SAVINGS.reduce((s, a) => s + a.accrued_interest, 0);

  const pieData = MEMBER_SAVINGS.map((a) => ({ name: a.product.replace("SilverVibe ", ""), value: a.balance }));

  const account = selectedAccount ? MEMBER_SAVINGS.find((a) => a.id === selectedAccount) : null;
  const accountTxns = RECENT_TRANSACTIONS.filter((t) =>
    !selectedAccount || t.account.toLowerCase().includes(
      (account?.product || "").replace("SilverVibe ", "").toLowerCase().split("/")[0].split(" ")[0]
    )
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Savings</h1>
          <p className="text-[#64748b] text-sm">Manage and track all your savings accounts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
          <Download className="w-4 h-4" /> Download Statement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#1A1A1A]/5 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <span className="text-sm text-[#64748b]">Total Savings</span>
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(totalSavings)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-[#22c55e]" />
            </div>
            <span className="text-sm text-[#64748b]">Accrued Interest</span>
          </div>
          <p className="text-2xl font-bold text-[#22c55e]">{formatCurrency(totalInterest)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#4A90D9]" />
            </div>
            <span className="text-sm text-[#64748b]">Active Accounts</span>
          </div>
          <p className="text-2xl font-bold text-[#4A90D9]">{MEMBER_SAVINGS.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 animate-fade-in stagger-2">
          <h3 className="font-semibold text-[#1A1A1A] mb-4">Savings Growth (6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SAVINGS_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }} />
                <Area type="monotone" dataKey="regular" stackId="1" stroke="#1A1A1A" fill="#1A1A1A" fillOpacity={0.1} name="Regular" />
                <Area type="monotone" dataKey="flexi" stackId="1" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.1} name="Flexi" />
                <Area type="monotone" dataKey="fixed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Fixed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-3">
          <h3 className="font-semibold text-[#1A1A1A] mb-4">Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[#64748b]">{d.name}</span>
                </div>
                <span className="font-medium text-[#1A1A1A]">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div>
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Your Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEMBER_SAVINGS.map((acct) => (
            <button
              key={acct.id}
              onClick={() => setSelectedAccount(selectedAccount === acct.id ? null : acct.id)}
              className={`text-left glass-card rounded-2xl p-5 hover:shadow-lg transition-all border-2 cursor-pointer ${
                selectedAccount === acct.id ? "border-[#4A90D9]" : "border-transparent"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${acct.color}15` }}>
                    <PiggyBank className="w-5 h-5" style={{ color: acct.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{acct.product.replace("SilverVibe ", "")}</p>
                    <p className="text-xs text-[#64748b]">{acct.account_number}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-full text-xs font-medium">
                  {acct.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A] mb-2">{formatCurrency(acct.balance)}</p>
              <div className="flex flex-wrap gap-3 text-xs text-[#64748b]">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Avail: {formatCurrency(acct.available_balance)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Interest: {formatCurrency(acct.accrued_interest)}
                </span>
                {(acct as Record<string, unknown>).maturity_date ? (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Matures: {String((acct as Record<string, unknown>).maturity_date)}
                  </span>
                ) : null}
                {(acct as Record<string, unknown>).lien_amount ? (
                  <span className="flex items-center gap-1 text-[#f59e0b]">
                    <Lock className="w-3 h-3" /> Lien: {formatCurrency(Number((acct as Record<string, unknown>).lien_amount))}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1A1A1A]">
            Transaction History {account ? `— ${account.product.replace("SilverVibe ", "")}` : ""}
          </h3>
          {selectedAccount && (
            <button onClick={() => setSelectedAccount(null)} className="text-sm text-[#4A90D9] hover:underline">
              Show All
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left py-3 px-2 text-[#64748b] font-medium">Date</th>
                <th className="text-left py-3 px-2 text-[#64748b] font-medium">Type</th>
                <th className="text-left py-3 px-2 text-[#64748b] font-medium">Account</th>
                <th className="text-left py-3 px-2 text-[#64748b] font-medium">Channel</th>
                <th className="text-right py-3 px-2 text-[#64748b] font-medium">Amount</th>
                <th className="text-center py-3 px-2 text-[#64748b] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {accountTxns.map((tx) => (
                <tr key={tx.id} className="border-b border-[#e2e8f0]/50 hover:bg-[#f1f5f9]/50 transition-colors">
                  <td className="py-3 px-2 text-[#1A1A1A]">{tx.date}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        tx.direction === "credit" ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
                      }`}>
                        {tx.direction === "credit" ? (
                          <ArrowDownRight className="w-3 h-3 text-[#22c55e]" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-[#ef4444]" />
                        )}
                      </div>
                      {tx.type}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-[#64748b]">{tx.account}</td>
                  <td className="py-3 px-2 text-[#64748b]">{tx.channel}</td>
                  <td className={`py-3 px-2 text-right font-semibold ${
                    tx.direction === "credit" ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}>
                    {tx.direction === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-full text-xs font-medium">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
