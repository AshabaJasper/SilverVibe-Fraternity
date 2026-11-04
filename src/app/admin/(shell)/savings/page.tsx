"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ADMIN_KPI, ADMIN_SAVINGS_GROWTH, ADMIN_PRODUCT_DISTRIBUTION } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  PiggyBank, TrendingUp, CreditCard, Settings2, Plus, Download,
  ArrowUpRight, ArrowDownRight, RefreshCcw, Percent, Users, BarChart3,
  Save, CheckCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

interface SavingsProduct {
  name: string; code: string; rate: string; min: number; members: number; balance: number; status: string; description: string;
}

interface SavingsTxn {
  id: string; member: string; type: string; product: string; amount: number; date: string; channel: string; status: string;
}

const DEFAULT_PRODUCTS: SavingsProduct[] = [
  { name: "Regular Savings", code: "SAV-REG", rate: "4.0%", min: 10000, members: 342, balance: 890000000, status: "active", description: "Standard mandatory savings account with monthly contributions" },
  { name: "Flexi Save", code: "SAV-FLX", rate: "5.5%", min: 5000, members: 289, balance: 450000000, status: "active", description: "Voluntary savings with flexible deposit and withdrawal" },
  { name: "Fixed Deposit", code: "SAV-FXD", rate: "10.0%", min: 500000, members: 87, balance: 320000000, status: "active", description: "Fixed-term savings with higher returns, min 3 months" },
  { name: "Loan Guarantee", code: "SAV-LGR", rate: "3.0%", min: 0, members: 196, balance: 280000000, status: "active", description: "Savings used as collateral for loan applications" },
  { name: "Junior Saver", code: "SAV-JNR", rate: "6.0%", min: 2000, members: 45, balance: 25000000, status: "draft", description: "Savings account for dependents under 18 years" },
];

const DEFAULT_TXN: SavingsTxn[] = [
  { id: "TXN-4501", member: "James Mukasa (SV-0042)", type: "Deposit", product: "Regular Savings", amount: 150000, date: "2025-01-15", channel: "Mobile Money", status: "posted" },
  { id: "TXN-4502", member: "Sarah Namuli (SV-0089)", type: "Withdrawal", product: "Flexi Save", amount: 500000, date: "2025-01-15", channel: "Bank Transfer", status: "pending" },
  { id: "TXN-4503", member: "David Ssempijja (SV-0023)", type: "Deposit", product: "Fixed Deposit", amount: 2000000, date: "2025-01-14", channel: "Cash", status: "posted" },
  { id: "TXN-4504", member: "Grace Atim (SV-0156)", type: "Deposit", product: "Regular Savings", amount: 100000, date: "2025-01-14", channel: "Mobile Money", status: "posted" },
  { id: "TXN-4505", member: "Moses Kato (SV-0067)", type: "Withdrawal", product: "Loan Guarantee", amount: 350000, date: "2025-01-14", channel: "Cash", status: "rejected" },
  { id: "TXN-4506", member: "Patricia Auma (SV-0134)", type: "Transfer", product: "Flexi Save", amount: 200000, date: "2025-01-13", channel: "Internal", status: "posted" },
];

export default function AdminSavingsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "transactions">("overview");
  const [products, setProducts] = usePersistedState<SavingsProduct[]>("admin_savings_products", DEFAULT_PRODUCTS);
  const [transactions, setTransactions] = usePersistedState<SavingsTxn[]>("admin_savings_txn", DEFAULT_TXN);

  // Modal states
  const [newTxnOpen, setNewTxnOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SavingsProduct | null>(null);

  // New transaction form
  const [txnForm, setTxnForm] = useState({ member: "", type: "Deposit", product: "Regular Savings", amount: 0, channel: "Mobile Money" });

  // Product config form
  const [productForm, setProductForm] = useState<SavingsProduct>(DEFAULT_PRODUCTS[0]);

  const handleNewTxn = () => {
    const newTxn: SavingsTxn = {
      id: `TXN-${4500 + transactions.length + 1}`,
      member: txnForm.member,
      type: txnForm.type,
      product: txnForm.product,
      amount: txnForm.amount,
      date: new Date().toISOString().slice(0, 10),
      channel: txnForm.channel,
      status: "pending",
    };
    setTransactions((prev) => [newTxn, ...prev]);
    setNewTxnOpen(false);
    setTxnForm({ member: "", type: "Deposit", product: "Regular Savings", amount: 0, channel: "Mobile Money" });
    showToast(`${txnForm.type} of ${formatCurrency(txnForm.amount)} recorded`);
  };

  const handleSaveProduct = () => {
    setProducts((prev) => prev.map((p) => (p.code === productForm.code ? { ...productForm } : p)));
    setConfigureOpen(false);
    showToast(`${productForm.name} settings updated`);
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Savings Management</h1>
          <p className="text-[#64748b] text-sm">Manage savings products, process transactions, and monitor growth</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#f1f5f9] transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setNewTxnOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
            <Plus className="w-4 h-4" /> New Transaction
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1">
        {(["overview", "products", "transactions"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
              activeTab === t ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#64748b] hover:text-[#1A1A1A]"
            }`}>{t}</button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center mb-3">
                <PiggyBank className="w-5 h-5 text-[#22c55e]" />
              </div>
              <p className="text-xs text-[#64748b] mb-1">Total Savings Balance</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(ADMIN_KPI.total_savings.value)}</p>
              <span className="text-xs text-[#22c55e] flex items-center gap-0.5 mt-1">
                <TrendingUp className="w-3 h-3" /> {ADMIN_KPI.total_savings.change}% growth
              </span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mb-3">
                <ArrowUpRight className="w-5 h-5 text-[#4A90D9]" />
              </div>
              <p className="text-xs text-[#64748b] mb-1">Deposits This Month</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(45000000)}</p>
              <span className="text-xs text-[#64748b] mt-1">186 transactions</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center mb-3">
                <ArrowDownRight className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <p className="text-xs text-[#64748b] mb-1">Withdrawals This Month</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(12000000)}</p>
              <span className="text-xs text-[#64748b] mt-1">43 transactions</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center mb-3">
                <Percent className="w-5 h-5 text-[#a855f7]" />
              </div>
              <p className="text-xs text-[#64748b] mb-1">Average Interest Rate</p>
              <p className="text-xl font-bold text-[#1A1A1A]">5.6%</p>
              <span className="text-xs text-[#64748b] mt-1">Across all products</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Savings Growth Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ADMIN_SAVINGS_GROWTH}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e9).toFixed(1)}B`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="#22c55e" fillOpacity={0.08} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Product Distribution</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ADMIN_PRODUCT_DISTRIBUTION} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {ADMIN_PRODUCT_DISTRIBUTION.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
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
          </div>
        </>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.code} className="bg-white rounded-xl p-5 border border-[#e2e8f0] hover:shadow-sm transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1A1A1A]">{p.name}</h3>
                    <span className="text-[10px] font-mono text-[#C0C0C0]">{p.code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      p.status === "active" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#64748b]/10 text-[#64748b]"
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-[#64748b] mb-3">{p.description}</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                      <Percent className="w-3.5 h-3.5" /> Interest: <span className="font-semibold text-[#1A1A1A]">{p.rate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                      <CreditCard className="w-3.5 h-3.5" /> Min: <span className="font-semibold text-[#1A1A1A]">{formatCurrency(p.min)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                      <Users className="w-3.5 h-3.5" /> Members: <span className="font-semibold text-[#1A1A1A]">{p.members}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#64748b]">Total Balance</p>
                  <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(p.balance)}</p>
                  <button onClick={() => { setProductForm({ ...p }); setConfigureOpen(true); }}
                    className="mt-2 px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
                    <Settings2 className="w-3 h-3 inline mr-1" /> Configure
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Channel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748b]">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const typeColors: Record<string, string> = { Deposit: "text-[#22c55e]", Withdrawal: "text-[#ef4444]", Transfer: "text-[#4A90D9]" };
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    posted: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
                    pending: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
                    rejected: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
                  };
                  const sc = statusColors[t.status] || statusColors.posted;
                  return (
                    <tr key={t.id} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-[#C0C0C0]">{t.id}</td>
                      <td className="px-4 py-3 text-xs text-[#1A1A1A]">{t.member}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${typeColors[t.type]}`}>{t.type}</td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{t.product}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-[#1A1A1A]">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{t.channel}</td>
                      <td className="px-4 py-3">
                        <span className={`${sc.bg} ${sc.text} px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{t.date}</td>
                      <td className="px-4 py-3 text-center">
                        {t.status === "pending" && (
                          <button onClick={() => {
                            setTransactions((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "posted" } : x));
                            showToast(`Transaction ${t.id} approved`);
                          }} className="px-2 py-1 bg-[#22c55e] text-white rounded-lg text-[10px] font-medium hover:bg-[#16a34a] transition-colors">
                            <CheckCircle className="w-3 h-3 inline mr-0.5" /> Post
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======== NEW TRANSACTION MODAL ======== */}
      <Modal open={newTxnOpen} onClose={() => setNewTxnOpen(false)} title="Record New Transaction" size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setNewTxnOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
              Cancel
            </button>
            <button onClick={handleNewTxn} disabled={!txnForm.member || !txnForm.amount}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record Transaction
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Member (SV Number) *</label>
              <input className={inputClass} value={txnForm.member} onChange={(e) => setTxnForm({ ...txnForm, member: e.target.value })} placeholder="e.g. James Mukasa (SV-0042)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Transaction Type</label>
              <select className={inputClass} value={txnForm.type} onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })}>
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Product</label>
              <select className={inputClass} value={txnForm.product} onChange={(e) => setTxnForm({ ...txnForm, product: e.target.value })}>
                {products.filter((p) => p.status === "active").map((p) => (
                  <option key={p.code} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Amount (UGX) *</label>
              <input className={inputClass} type="number" value={txnForm.amount || ""} onChange={(e) => setTxnForm({ ...txnForm, amount: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Channel</label>
            <select className={inputClass} value={txnForm.channel} onChange={(e) => setTxnForm({ ...txnForm, channel: e.target.value })}>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Internal">Internal Transfer</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ======== CONFIGURE PRODUCT MODAL ======== */}
      <Modal open={configureOpen} onClose={() => setConfigureOpen(false)} title={`Configure — ${productForm.name}`} size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfigureOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
              Cancel
            </button>
            <button onClick={handleSaveProduct}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Product Name</label>
              <input className={inputClass} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Product Code</label>
              <input className={`${inputClass} bg-[#f8f9fa] cursor-not-allowed`} value={productForm.code} disabled />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Interest Rate</label>
              <input className={inputClass} value={productForm.rate} onChange={(e) => setProductForm({ ...productForm, rate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Minimum Balance (UGX)</label>
              <input className={inputClass} type="number" value={productForm.min} onChange={(e) => setProductForm({ ...productForm, min: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Status</label>
              <select className={inputClass} value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Description</label>
            <textarea className={`${inputClass} resize-none`} rows={3} value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
