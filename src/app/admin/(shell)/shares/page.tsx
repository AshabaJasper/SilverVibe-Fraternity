"use client";
import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  BarChart3, TrendingUp, Users, Award, Download, Plus,
  Calendar, DollarSign, FileText, PieChart as PieIcon,
  Save, Settings, Percent, Edit2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface Shareholder {
  name: string; sv: string; shares: number; value: number; percent: number;
}

const DEFAULT_SHARE_CONFIG = {
  shareValue: 20000,
  dividendRate: 12,
  minShares: 1,
  maxShares: 500,
};

const DEFAULT_SHAREHOLDERS: Shareholder[] = [
  { name: "David Ssempijja", sv: "SV-0023", shares: 200, value: 4000000, percent: 0.89 },
  { name: "James Mukasa", sv: "SV-0042", shares: 50, value: 1000000, percent: 0.22 },
  { name: "Patricia Auma", sv: "SV-0134", shares: 150, value: 3000000, percent: 0.67 },
  { name: "Grace Atim", sv: "SV-0156", shares: 75, value: 1500000, percent: 0.33 },
  { name: "Moses Kato", sv: "SV-0067", shares: 100, value: 2000000, percent: 0.44 },
  { name: "Sarah Namuli", sv: "SV-0089", shares: 120, value: 2400000, percent: 0.53 },
];

const DIVIDEND_HISTORY = [
  { year: "2019", rate: 8, amount: 28000000, shareholders: 280 },
  { year: "2020", rate: 9, amount: 36000000, shareholders: 295 },
  { year: "2021", rate: 10, amount: 45000000, shareholders: 310 },
  { year: "2022", rate: 11, amount: 52000000, shareholders: 325 },
  { year: "2023", rate: 12, amount: 54000000, shareholders: 342 },
];

const IU_SUMMARY = {
  totalUnits: 8500,
  unitValue: 50000,
  totalValue: 425000000,
  holders: 156,
  returnRate: 15,
};

const SHARE_GROWTH = [
  { month: "Jul", shares: 18500 }, { month: "Aug", shares: 19200 },
  { month: "Sep", shares: 19800 }, { month: "Oct", shares: 20500 },
  { month: "Nov", shares: 21200 }, { month: "Dec", shares: 21800 },
  { month: "Jan", shares: 22500 },
];

const inputClass = "w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 text-[#1A1A1A]";

export default function AdminSharesPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "shareholders" | "dividends" | "investment-units">("overview");
  const [shareholders, setShareholders] = usePersistedState<Shareholder[]>("admin_shareholders", DEFAULT_SHAREHOLDERS);
  const [shareConfig, setShareConfig] = usePersistedState("admin_share_config", DEFAULT_SHARE_CONFIG);

  /* modal states */
  const [issueOpen, setIssueOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [editShareholder, setEditShareholder] = useState<Shareholder | null>(null);

  const [issueForm, setIssueForm] = useState({ member: "", sv: "", shares: 1 });
  const [configForm, setConfigForm] = useState(shareConfig);

  const totalShares = shareholders.reduce((a, b) => a + b.shares, 0);
  const totalCapital = totalShares * shareConfig.shareValue;

  const handleIssueShares = () => {
    if (!issueForm.member || !issueForm.sv || issueForm.shares < 1) return;
    const value = issueForm.shares * shareConfig.shareValue;
    const existing = shareholders.find((s) => s.sv === issueForm.sv);
    if (existing) {
      const newShares = existing.shares + issueForm.shares;
      setShareholders((prev) => prev.map((s) => s.sv === issueForm.sv
        ? { ...s, shares: newShares, value: newShares * shareConfig.shareValue, percent: +((newShares / (totalShares + issueForm.shares)) * 100).toFixed(2) }
        : s
      ));
    } else {
      setShareholders((prev) => [...prev, {
        name: issueForm.member, sv: issueForm.sv, shares: issueForm.shares,
        value, percent: +((issueForm.shares / (totalShares + issueForm.shares)) * 100).toFixed(2),
      }]);
    }
    showToast(`${issueForm.shares} shares issued to ${issueForm.member}`);
    setIssueForm({ member: "", sv: "", shares: 1 });
    setIssueOpen(false);
  };

  const handleSaveConfig = () => {
    setShareConfig(configForm);
    // recalculate values
    setShareholders((prev) => prev.map((s) => ({ ...s, value: s.shares * configForm.shareValue })));
    showToast("Share configuration updated");
    setConfigOpen(false);
  };

  const handleEditShareholder = () => {
    if (!editShareholder) return;
    setShareholders((prev) => prev.map((s) => s.sv === editShareholder.sv ? editShareholder : s));
    showToast(`${editShareholder.name} updated`);
    setEditShareholder(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Shares & Dividends</h1>
          <p className="text-[#64748b] text-sm">Manage share capital, dividends, and investment units</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setConfigForm(shareConfig); setConfigOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#f1f5f9] transition-colors">
            <Settings className="w-4 h-4" /> Configure
          </button>
          <button onClick={() => { setIssueForm({ member: "", sv: "", shares: 1 }); setIssueOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
            <Plus className="w-4 h-4" /> Issue Shares
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 overflow-x-auto">
        {(["overview", "shareholders", "dividends", "investment-units"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === t ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#64748b] hover:text-[#1A1A1A]"
            }`}>{t.replace("-", " ")}</button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center mb-3"><BarChart3 className="w-5 h-5 text-[#a855f7]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Total Share Capital</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(totalCapital)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mb-3"><FileText className="w-5 h-5 text-[#4A90D9]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Total Shares Issued</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatNumber(totalShares)}</p>
              <span className="text-xs text-[#64748b]">@ {formatCurrency(shareConfig.shareValue)} each</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center mb-3"><Users className="w-5 h-5 text-[#22c55e]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Shareholders</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{shareholders.length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center mb-3"><Award className="w-5 h-5 text-[#f59e0b]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Last Dividend Rate</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{shareConfig.dividendRate}%</p>
              <span className="text-xs text-[#64748b]">FY 2023</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Share Growth</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SHARE_GROWTH}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="shares" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Dividend History</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DIVIDEND_HISTORY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Dividend Paid" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Investment Units */}
          <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
            <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Investment Units (IU) Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#f8f9fa] rounded-lg p-4">
                <p className="text-xs text-[#64748b]">Total Units</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(IU_SUMMARY.totalUnits)}</p>
              </div>
              <div className="bg-[#f8f9fa] rounded-lg p-4">
                <p className="text-xs text-[#64748b]">Unit Value</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(IU_SUMMARY.unitValue)}</p>
              </div>
              <div className="bg-[#f8f9fa] rounded-lg p-4">
                <p className="text-xs text-[#64748b]">Total Value</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(IU_SUMMARY.totalValue)}</p>
              </div>
              <div className="bg-[#f8f9fa] rounded-lg p-4">
                <p className="text-xs text-[#64748b]">Holders</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{IU_SUMMARY.holders}</p>
              </div>
              <div className="bg-[#f8f9fa] rounded-lg p-4">
                <p className="text-xs text-[#64748b]">Expected Return</p>
                <p className="text-lg font-bold text-[#22c55e]">{IU_SUMMARY.returnRate}%</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "shareholders" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Member</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Shares</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Value</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">% Holding</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748b]">Action</th>
                </tr>
              </thead>
              <tbody>
                {shareholders.sort((a, b) => b.shares - a.shares).map((s) => (
                  <tr key={s.sv} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#1A1A1A]">{s.name}</p>
                      <p className="text-[10px] text-[#C0C0C0]">{s.sv}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#1A1A1A]">{s.shares}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#1A1A1A]">{formatCurrency(s.shares * shareConfig.shareValue)}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#64748b]">{((s.shares / totalShares) * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setEditShareholder({ ...s })}
                        className="p-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-[#64748b]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "dividends" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
            <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Dividend Declaration History</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DIVIDEND_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                  <Bar yAxisId="left" dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Amount" />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#a855f7" strokeWidth={2} name="Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Year</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748b]">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Total Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Shareholders</th>
                </tr>
              </thead>
              <tbody>
                {DIVIDEND_HISTORY.map((d) => (
                  <tr key={d.year} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3 text-sm font-medium text-[#1A1A1A]">FY {d.year}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-[#22c55e]">{d.rate}%</td>
                    <td className="px-4 py-3 text-right text-sm text-[#1A1A1A]">{formatCurrency(d.amount)}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#64748b]">{d.shareholders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "investment-units" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <DollarSign className="w-5 h-5 text-[#4A90D9] mb-2" />
              <p className="text-xs text-[#64748b]">Total IU Value</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(IU_SUMMARY.totalValue)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <FileText className="w-5 h-5 text-[#a855f7] mb-2" />
              <p className="text-xs text-[#64748b]">Units Outstanding</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(IU_SUMMARY.totalUnits)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <Users className="w-5 h-5 text-[#22c55e] mb-2" />
              <p className="text-xs text-[#64748b]">IU Holders</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{IU_SUMMARY.holders}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <TrendingUp className="w-5 h-5 text-[#f59e0b] mb-2" />
              <p className="text-xs text-[#64748b]">Expected Return</p>
              <p className="text-lg font-bold text-[#22c55e]">{IU_SUMMARY.returnRate}% p.a.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
            <h3 className="font-semibold text-[#1A1A1A] mb-3 text-sm">Investment Unit Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[#e2e8f0]">
                  <span className="text-xs text-[#64748b]">Unit Face Value</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">{formatCurrency(50000)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#e2e8f0]">
                  <span className="text-xs text-[#64748b]">Minimum Purchase</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">5 units</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#e2e8f0]">
                  <span className="text-xs text-[#64748b]">Lock-in Period</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">12 months</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-xs text-[#64748b]">Redemption Notice</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">30 days</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[#e2e8f0]">
                  <span className="text-xs text-[#64748b]">Interest Accrual</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">Monthly</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#e2e8f0]">
                  <span className="text-xs text-[#64748b]">Interest Payment</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">Quarterly</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#e2e8f0]">
                  <span className="text-xs text-[#64748b]">Transferable</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">Yes (with approval)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-xs text-[#64748b]">Use as Collateral</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">Yes (up to 80%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== ISSUE SHARES MODAL ======== */}
      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue New Shares" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setIssueOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">Cancel</button>
            <button onClick={handleIssueShares} disabled={!issueForm.member || !issueForm.sv || issueForm.shares < 1}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <Plus className="w-4 h-4" /> Issue Shares
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Member Name *</label>
            <input className={inputClass} value={issueForm.member} onChange={(e) => setIssueForm({ ...issueForm, member: e.target.value })} placeholder="e.g. James Mukasa" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">SV Number *</label>
            <input className={inputClass} value={issueForm.sv} onChange={(e) => setIssueForm({ ...issueForm, sv: e.target.value })} placeholder="e.g. SV-0042" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Number of Shares *</label>
            <input className={inputClass} type="number" min={1} value={issueForm.shares} onChange={(e) => setIssueForm({ ...issueForm, shares: Number(e.target.value) })} />
          </div>
          <div className="bg-[#f8f9fa] rounded-xl p-4">
            <p className="text-xs text-[#64748b] mb-1">Total Cost</p>
            <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(issueForm.shares * shareConfig.shareValue)}</p>
            <p className="text-[10px] text-[#C0C0C0]">{issueForm.shares} shares x {formatCurrency(shareConfig.shareValue)} per share</p>
          </div>
        </div>
      </Modal>

      {/* ======== CONFIGURE SHARES MODAL ======== */}
      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Share Configuration" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfigOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">Cancel</button>
            <button onClick={handleSaveConfig}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Share Value (UGX)</label>
            <input className={inputClass} type="number" value={configForm.shareValue} onChange={(e) => setConfigForm({ ...configForm, shareValue: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Dividend Rate (%)</label>
            <input className={inputClass} type="number" value={configForm.dividendRate} onChange={(e) => setConfigForm({ ...configForm, dividendRate: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Min Shares per Member</label>
              <input className={inputClass} type="number" value={configForm.minShares} onChange={(e) => setConfigForm({ ...configForm, minShares: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Max Shares per Member</label>
              <input className={inputClass} type="number" value={configForm.maxShares} onChange={(e) => setConfigForm({ ...configForm, maxShares: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* ======== EDIT SHAREHOLDER MODAL ======== */}
      <Modal open={!!editShareholder} onClose={() => setEditShareholder(null)} title={`Edit — ${editShareholder?.name || ""}`} size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditShareholder(null)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">Cancel</button>
            <button onClick={handleEditShareholder}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        }>
        {editShareholder && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Name</label>
              <input className={inputClass} value={editShareholder.name} onChange={(e) => setEditShareholder({ ...editShareholder, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">SV Number</label>
              <input className={`${inputClass} bg-[#f8f9fa] cursor-not-allowed`} value={editShareholder.sv} disabled />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Number of Shares</label>
              <input className={inputClass} type="number" value={editShareholder.shares}
                onChange={(e) => setEditShareholder({ ...editShareholder, shares: Number(e.target.value), value: Number(e.target.value) * shareConfig.shareValue })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
