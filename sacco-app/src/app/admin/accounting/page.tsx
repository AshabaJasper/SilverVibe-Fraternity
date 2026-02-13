"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  BookOpen, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
  Download, Plus, Calendar, Filter, TrendingUp, DollarSign,
  BarChart3, Scale, CheckCircle, XCircle, Save, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

interface JournalEntry {
  id: string; date: string; description: string; debit: string; credit: string;
  amount: number; status: string; by: string;
}

const INCOME_EXPENSE = [
  { month: "Aug", income: 38000000, expense: 22000000 },
  { month: "Sep", income: 42000000, expense: 24000000 },
  { month: "Oct", income: 45000000, expense: 23000000 },
  { month: "Nov", income: 48000000, expense: 26000000 },
  { month: "Dec", income: 52000000, expense: 28000000 },
  { month: "Jan", income: 55000000, expense: 25000000 },
];

const EXPENSE_BREAKDOWN = [
  { name: "Staff Costs", value: 12000000, color: "#4A90D9" },
  { name: "Administrative", value: 5000000, color: "#22c55e" },
  { name: "Loan Provisions", value: 4000000, color: "#ef4444" },
  { name: "Rent & Utilities", value: 2500000, color: "#f59e0b" },
  { name: "IT & Systems", value: 1500000, color: "#a855f7" },
];

const TRIAL_BALANCE = [
  { account: "1000 - Cash & Bank", debit: 850000000, credit: 0 },
  { account: "1100 - Member Savings", debit: 0, credit: 1200000000 },
  { account: "1200 - Loan Portfolio", debit: 890000000, credit: 0 },
  { account: "1300 - Share Capital", debit: 0, credit: 450000000 },
  { account: "1400 - Fixed Assets", debit: 120000000, credit: 0 },
  { account: "2000 - Interest Income", debit: 0, credit: 180000000 },
  { account: "2100 - Fee Income", debit: 0, credit: 35000000 },
  { account: "3000 - Staff Expenses", debit: 48000000, credit: 0 },
  { account: "3100 - Admin Expenses", debit: 20000000, credit: 0 },
  { account: "3200 - Provision for Bad Debts", debit: 15000000, credit: 0 },
  { account: "4000 - Retained Earnings", debit: 0, credit: 78000000 },
];

const DEFAULT_JOURNAL: JournalEntry[] = [
  { id: "JE-0456", date: "2025-01-15", description: "Monthly salary provision", debit: "Staff Expenses", credit: "Accrued Liabilities", amount: 12000000, status: "posted", by: "Sarah N." },
  { id: "JE-0457", date: "2025-01-15", description: "Loan interest accrual", debit: "Interest Receivable", credit: "Interest Income", amount: 8500000, status: "posted", by: "System" },
  { id: "JE-0458", date: "2025-01-14", description: "Depreciation - Office equipment", debit: "Depreciation Expense", credit: "Accumulated Depreciation", amount: 1200000, status: "posted", by: "System" },
  { id: "JE-0459", date: "2025-01-14", description: "Mobile money collections", debit: "Mobile Money Float", credit: "Member Savings", amount: 4500000, status: "pending", by: "System" },
  { id: "JE-0460", date: "2025-01-13", description: "Dividend provision FY2024", debit: "Retained Earnings", credit: "Dividends Payable", amount: 54000000, status: "draft", by: "Sarah N." },
];

const ACCOUNTS = [
  "Cash & Bank", "Member Savings", "Loan Portfolio", "Share Capital", "Fixed Assets",
  "Interest Income", "Fee Income", "Staff Expenses", "Admin Expenses", "Provision for Bad Debts",
  "Retained Earnings", "Accrued Liabilities", "Interest Receivable", "Accumulated Depreciation",
  "Mobile Money Float", "Dividends Payable", "Depreciation Expense",
];

const inputClass = "w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 text-[#1A1A1A]";

export default function AdminAccountingPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "journal" | "trial-balance" | "statements">("overview");
  const [entries, setEntries] = usePersistedState<JournalEntry[]>("admin_journal_entries", DEFAULT_JOURNAL);

  /* modal states */
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const EMPTY_ENTRY = { description: "", debit: ACCOUNTS[0], credit: ACCOUNTS[1], amount: 0 };
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);

  const handleNewEntry = () => {
    if (!entryForm.description || entryForm.amount <= 0) return;
    const id = `JE-${String(entries.length + 461).padStart(4, "0")}`;
    const newEntry: JournalEntry = {
      id, date: new Date().toISOString().slice(0, 10),
      description: entryForm.description, debit: entryForm.debit,
      credit: entryForm.credit, amount: entryForm.amount,
      status: "draft", by: "Admin",
    };
    setEntries((prev) => [newEntry, ...prev]);
    showToast(`Journal entry ${id} created`);
    setEntryForm(EMPTY_ENTRY);
    setNewEntryOpen(false);
  };

  const handlePostEntry = (id: string) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: "posted" } : e));
    showToast(`Entry ${id} posted`);
  };

  const totalDebit = TRIAL_BALANCE.reduce((a, b) => a + b.debit, 0);
  const totalCredit = TRIAL_BALANCE.reduce((a, b) => a + b.credit, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Accounting</h1>
          <p className="text-[#64748b] text-sm">Financial records, journal entries, and statements</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#f1f5f9] transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEntryForm(EMPTY_ENTRY); setNewEntryOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 overflow-x-auto">
        {(["overview", "journal", "trial-balance", "statements"] as const).map((t) => (
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
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center mb-3"><ArrowUpRight className="w-5 h-5 text-[#22c55e]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Monthly Revenue</p>
              <p className="text-xl font-bold text-[#22c55e]">{formatCurrency(55000000)}</p>
              <span className="text-xs text-[#22c55e]">+12% vs last month</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center mb-3"><ArrowDownRight className="w-5 h-5 text-[#ef4444]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Monthly Expenses</p>
              <p className="text-xl font-bold text-[#ef4444]">{formatCurrency(25000000)}</p>
              <span className="text-xs text-[#22c55e]">-3% vs last month</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-[#4A90D9]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Net Income</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(30000000)}</p>
              <span className="text-xs text-[#64748b]">54.5% margin</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center mb-3"><Scale className="w-5 h-5 text-[#a855f7]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Total Assets</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(1860000000)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Income vs Expenses (6 Months)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={INCOME_EXPENSE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Expense Breakdown</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={EXPENSE_BREAKDOWN} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {EXPENSE_BREAKDOWN.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {EXPENSE_BREAKDOWN.map((d) => (
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
          </div>
        </>
      )}

      {activeTab === "journal" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Debit A/C</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Credit A/C</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">By</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((j) => {
                  const sc: Record<string, { bg: string; text: string }> = {
                    posted: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
                    pending: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
                    draft: { bg: "bg-[#64748b]/10", text: "text-[#64748b]" },
                  };
                  const s = sc[j.status] || sc.posted;
                  return (
                    <tr key={j.id} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa]">
                      <td className="px-4 py-3 text-xs font-mono text-[#C0C0C0]">{j.id}</td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{j.date}</td>
                      <td className="px-4 py-3 text-xs text-[#1A1A1A]">{j.description}</td>
                      <td className="px-4 py-3 text-xs text-[#1A1A1A]">{j.debit}</td>
                      <td className="px-4 py-3 text-xs text-[#1A1A1A]">{j.credit}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-[#1A1A1A]">{formatCurrency(j.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize`}>{j.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{j.by}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewEntry(j)} className="p-1 rounded-lg hover:bg-[#f1f5f9]">
                            <Eye className="w-3.5 h-3.5 text-[#64748b]" />
                          </button>
                          {j.status !== "posted" && (
                            <button onClick={() => handlePostEntry(j.id)}
                              className="px-2 py-0.5 bg-[#22c55e] text-white rounded-lg text-[10px] font-medium hover:bg-[#16a34a]">Post</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "trial-balance" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#1A1A1A] text-sm">Trial Balance</h3>
              <p className="text-xs text-[#64748b]">As at January 15, 2025</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              totalDebit === totalCredit ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#ef4444]/10 text-[#ef4444]"
            }`}>
              {totalDebit === totalCredit ? <><CheckCircle className="w-3.5 h-3.5" /> Balanced</> : <><XCircle className="w-3.5 h-3.5" /> Unbalanced</>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Account</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Debit (UGX)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Credit (UGX)</th>
                </tr>
              </thead>
              <tbody>
                {TRIAL_BALANCE.map((t) => (
                  <tr key={t.account} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3 text-xs text-[#1A1A1A]">{t.account}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#1A1A1A]">{t.debit > 0 ? formatCurrency(t.debit) : "—"}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#1A1A1A]">{t.credit > 0 ? formatCurrency(t.credit) : "—"}</td>
                  </tr>
                ))}
                <tr className="bg-[#1A1A1A]">
                  <td className="px-4 py-3 text-xs font-bold text-white">Total</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-white">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-white">{formatCurrency(totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "statements" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Income Statement", desc: "Revenue, expenses, and net income for the period", icon: TrendingUp, color: "#22c55e" },
            { title: "Balance Sheet", desc: "Assets, liabilities, and equity snapshot", icon: Scale, color: "#4A90D9" },
            { title: "Cash Flow Statement", desc: "Operating, investing, and financing cash flows", icon: DollarSign, color: "#a855f7" },
            { title: "Member Equity Statement", desc: "Changes in member shares and retained earnings", icon: BarChart3, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.title} className="bg-white rounded-xl p-6 border border-[#e2e8f0] hover:shadow-sm transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${s.color}12` }}>
                <s.icon className="w-6 h-6" style={{ color: s.color }} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">{s.title}</h3>
              <p className="text-xs text-[#64748b] mb-4">{s.desc}</p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-xs font-medium hover:bg-[#333] transition-colors">
                  Generate
                </button>
                <button className="px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
                  <Download className="w-3 h-3 inline mr-1" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== NEW JOURNAL ENTRY MODAL ======== */}
      <Modal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} title="Create Journal Entry" size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setNewEntryOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">Cancel</button>
            <button onClick={handleNewEntry} disabled={!entryForm.description || entryForm.amount <= 0}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Entry
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Description *</label>
            <input className={inputClass} value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} placeholder="e.g. Monthly salary provision" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Debit Account</label>
              <select className={inputClass} value={entryForm.debit} onChange={(e) => setEntryForm({ ...entryForm, debit: e.target.value })}>
                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Credit Account</label>
              <select className={inputClass} value={entryForm.credit} onChange={(e) => setEntryForm({ ...entryForm, credit: e.target.value })}>
                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Amount (UGX) *</label>
            <input className={inputClass} type="number" value={entryForm.amount || ""} onChange={(e) => setEntryForm({ ...entryForm, amount: Number(e.target.value) })} placeholder="0" />
          </div>
          <div className="bg-[#f8f9fa] rounded-xl p-3 text-xs text-[#64748b]">
            Entry will be saved as <span className="font-semibold text-[#64748b]">Draft</span>. You can post it from the journal tab.
          </div>
        </div>
      </Modal>

      {/* ======== VIEW ENTRY MODAL ======== */}
      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title={`Journal Entry — ${viewEntry?.id || ""}`} size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setViewEntry(null)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">Close</button>
            {viewEntry && viewEntry.status !== "posted" && (
              <button onClick={() => { handlePostEntry(viewEntry.id); setViewEntry(null); }}
                className="px-5 py-2.5 bg-[#22c55e] text-white rounded-xl text-sm font-medium hover:bg-[#16a34a] transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Post Entry
              </button>
            )}
          </div>
        }>
        {viewEntry && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#64748b]">Date</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{viewEntry.date}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748b]">Status</p>
                <p className={`text-sm font-semibold capitalize ${viewEntry.status === "posted" ? "text-[#22c55e]" : viewEntry.status === "pending" ? "text-[#f59e0b]" : "text-[#64748b]"}`}>{viewEntry.status}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">Description</p>
              <p className="text-sm text-[#1A1A1A]">{viewEntry.description}</p>
            </div>
            <div className="bg-[#f8f9fa] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Debit</span>
                <span className="font-medium text-[#1A1A1A]">{viewEntry.debit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Credit</span>
                <span className="font-medium text-[#1A1A1A]">{viewEntry.credit}</span>
              </div>
              <div className="border-t border-[#e2e8f0] pt-2 flex justify-between text-sm">
                <span className="font-semibold text-[#64748b]">Amount</span>
                <span className="font-bold text-[#1A1A1A]">{formatCurrency(viewEntry.amount)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#64748b]">
              <span>Created by: {viewEntry.by}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
