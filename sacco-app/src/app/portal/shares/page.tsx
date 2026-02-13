"use client";
import { formatCurrency } from "@/lib/utils";
import { MEMBER_SHARES, MEMBER_IU } from "@/lib/mock-data";
import {
  BarChart3, Award, TrendingUp, Download, Calendar, DollarSign,
  FileText, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function SharesPage() {
  const dividendData = MEMBER_SHARES.dividends.map((d) => ({ year: d.year, amount: d.amount }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Shares & Investments</h1>
        <p className="text-[#64748b] text-sm">Your share capital and investment units</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#22c55e]" />
            </div>
            <span className="text-sm text-[#64748b]">Share Capital</span>
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(MEMBER_SHARES.total_value)}</p>
          <p className="text-xs text-[#64748b] mt-1">{MEMBER_SHARES.num_shares} shares @ {formatCurrency(MEMBER_SHARES.share_value)} each</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#a855f7]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#a855f7]" />
            </div>
            <span className="text-sm text-[#64748b]">Investment Units</span>
          </div>
          <p className="text-2xl font-bold text-[#a855f7]">{formatCurrency(MEMBER_IU.current_value)}</p>
          <p className="text-xs text-[#64748b] mt-1">{MEMBER_IU.unit_balance} units</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <span className="text-sm text-[#64748b]">Total Dividends</span>
          </div>
          <p className="text-2xl font-bold text-[#f59e0b]">{formatCurrency(MEMBER_SHARES.dividends.reduce((s, d) => s + d.amount, 0))}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-[#4A90D9]" />
            </div>
            <span className="text-sm text-[#64748b]">IU Returns</span>
          </div>
          <p className="text-2xl font-bold text-[#4A90D9]">{formatCurrency(MEMBER_IU.accrued_returns)}</p>
          <p className="text-xs text-[#64748b] mt-1">15% return on investment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificates */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-2">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#f59e0b]" /> Share Certificates
          </h3>
          <div className="space-y-3">
            {MEMBER_SHARES.certificates.map((cert) => (
              <div key={cert.number} className="flex items-center justify-between p-4 bg-[#f1f5f9] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#f59e0b]/50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{cert.number}</p>
                    <p className="text-xs text-[#64748b]">{cert.shares} shares · {cert.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(cert.amount)}</span>
                  <button className="p-2 rounded-lg hover:bg-[#e2e8f0] transition-colors">
                    <Download className="w-4 h-4 text-[#64748b]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dividend History */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-3">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#22c55e]" /> Dividend History
          </h3>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }} />
                <Bar dataKey="amount" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {MEMBER_SHARES.dividends.map((d) => (
              <div key={d.year} className="flex items-center justify-between text-sm p-3 bg-[#f1f5f9] rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#64748b]" />
                  <span className="text-[#1A1A1A] font-medium">{d.year}</span>
                  <span className="text-xs text-[#64748b]">@ {d.rate}</span>
                </div>
                <span className="font-semibold text-[#22c55e]">{formatCurrency(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investment Units */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-4">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#a855f7]" /> Investment Units Detail
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-[#a855f7]/5 to-[#4A90D9]/5 rounded-xl border border-[#a855f7]/10">
          <div>
            <p className="text-xs text-[#64748b]">Units Held</p>
            <p className="text-lg font-bold text-[#1A1A1A]">{MEMBER_IU.unit_balance}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Total Invested</p>
            <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(MEMBER_IU.total_invested)}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Accrued Returns</p>
            <p className="text-lg font-bold text-[#22c55e]">{formatCurrency(MEMBER_IU.accrued_returns)}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Current Value</p>
            <p className="text-lg font-bold text-[#a855f7]">{formatCurrency(MEMBER_IU.current_value)}</p>
          </div>
        </div>
        <p className="text-xs text-[#64748b] mt-3">
          Investment Units fund long-term assets including real estate, shares, and other yielding investments. 
          Units are transferable but not withdrawable except at cooperative exit.
        </p>
      </div>
    </div>
  );
}
