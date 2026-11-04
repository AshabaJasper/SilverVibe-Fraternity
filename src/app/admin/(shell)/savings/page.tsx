"use client";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PiggyBank, CreditCard, Settings2, Plus, Download, ArrowUpRight, ArrowDownRight,
  Percent, Users, CheckCircle, RotateCcw, XCircle, Search, Scale,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { formatCurrency, formatCompact, formatDate, formatNumber, todayISO, cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { ADMIN_SAVINGS_GROWTH, ADMIN_MEMBERS_LIST, DEMO_TODAY } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { exportToCsv } from "@/lib/export";
import Modal, { FormField, TextInput, SelectInput, TextAreaInput, Button, ConfirmDialog } from "@/components/Modal";
import { EmptyState, Badge, PageHeader, StatCard, Tabs } from "@/components/ui";
import {
  DEFAULT_SAVINGS_PRODUCTS, DEFAULT_SAVINGS_TXN, SAVINGS_PRODUCTS_KEY, SAVINGS_TXN_KEY,
  applyToMembers, applyToProducts, nextTxnId,
  type Member, type SavingsProduct, type SavingsTxn, type TxnType,
} from "../_lib/seeds";

// ------------------------------------------------------------------
// Types & seed data (shared with the dashboard and demo loader)
// ------------------------------------------------------------------

/** Withdrawals above this amount need a second officer to post them. */
const APPROVAL_THRESHOLD = 2_000_000;

const PRODUCT_COLORS = ["#4A90D9", "#C0C0C0", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6"];

type TabId = "overview" | "products" | "transactions";
const TAB_IDS: TabId[] = ["overview", "products", "transactions"];

/** Member picker over the live register; non-active members are labelled. */
function memberOptions(members: Member[]) {
  return [
    { value: "", label: "Select a member…" },
    ...members.map((m) => ({ value: m.sv_number, label: `${m.name} (${m.sv_number})${m.status !== "active" ? ` (${m.status})` : ""}` })),
  ];
}

const EMPTY_TXN_FORM = { sv: "", type: "Deposit" as TxnType, product: "SV-REG", toProduct: "SV-FLEX", amount: "", channel: "Mobile Money", reference: "" };
const EMPTY_PRODUCT_FORM = { code: "", name: "", rate: "", min: "", status: "active" as SavingsProduct["status"], description: "" };

const th = "text-left px-4 py-3 text-xs font-semibold text-[#64748b] whitespace-nowrap";
const td = "px-4 py-3 text-xs whitespace-nowrap";

export default function AdminSavingsPage() {
  return (
    <Suspense>
      <SavingsInner />
    </Suspense>
  );
}

function SavingsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const tabParam = params.get("tab") as TabId | null;
  const activeTab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "overview";
  const setTab = (t: TabId) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  const [products, setProducts] = usePersistedState<SavingsProduct[]>(SAVINGS_PRODUCTS_KEY, DEFAULT_SAVINGS_PRODUCTS);
  const [transactions, setTransactions] = usePersistedState<SavingsTxn[]>(SAVINGS_TXN_KEY, DEFAULT_SAVINGS_TXN);
  // Live member register: pickers follow registrations/removals, and posted money moves its savings column.
  const [members, setMembers] = usePersistedState<Member[]>(KEYS.adminMembers, ADMIN_MEMBERS_LIST);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnForm, setTxnForm] = useState(EMPTY_TXN_FORM);
  const [txnErrors, setTxnErrors] = useState<Record<string, string>>({});
  const [productModal, setProductModal] = useState<null | { mode: "add" | "edit" }>(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<null | { action: "post" | "reverse" | "reject"; txn: SavingsTxn }>(null);

  const productName = (code?: string) => products.find((p) => p.code === code)?.name ?? code ?? "—";
  const activeProducts = products.filter((p) => p.status === "active");

  // ---------------- Overview metrics (computed from state) ----------------
  // Before hydration use the fixed demo date so server and client markup match.
  const month = (hydrated ? todayISO() : DEMO_TODAY).slice(0, 7);
  const metrics = useMemo(() => {
    const monthPosted = transactions.filter((t) => t.status === "posted" && t.date.startsWith(month));
    const dep = monthPosted.filter((t) => t.type === "Deposit");
    const wd = monthPosted.filter((t) => t.type === "Withdrawal");
    const deposits = dep.reduce((a, t) => a + t.amount, 0);
    const withdrawals = wd.reduce((a, t) => a + t.amount, 0);
    const total = products.reduce((a, p) => a + p.balance, 0);
    const weightedRate = total ? products.reduce((a, p) => a + p.rate * p.balance, 0) / total : 0;
    return {
      deposits, withdrawals, depCount: dep.length, wdCount: wd.length, net: deposits - withdrawals, total, weightedRate,
      pending: transactions.filter((t) => t.status === "pending").length,
    };
  }, [transactions, products, month]);

  // Growth chart: history from mock data, latest month replaced by the live total.
  const growth = useMemo(
    () => ADMIN_SAVINGS_GROWTH.map((g, i, arr) => (i === arr.length - 1 ? { ...g, amount: metrics.total } : g)),
    [metrics.total]
  );
  const pieData = products.filter((p) => p.balance > 0);

  // ---------------- Transactions filtering ----------------
  const filteredTxns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return [t.id, t.member, t.sv, t.reference].some((s) => s.toLowerCase().includes(q));
    });
  }, [transactions, typeFilter, statusFilter, search]);

  // ---------------- Handlers ----------------
  const openNewTxn = () => {
    setTxnForm({ ...EMPTY_TXN_FORM, product: activeProducts[0]?.code ?? "", toProduct: activeProducts[1]?.code ?? "" });
    setTxnErrors({});
    setTxnOpen(true);
  };

  const submitTxn = () => {
    const errors: Record<string, string> = {};
    const member = members.find((m) => m.sv_number === txnForm.sv);
    const amount = Number(txnForm.amount);
    if (!member) errors.sv = "Choose a member";
    else if (member.status === "suspended") errors.sv = `${member.name} is suspended — transactions are blocked`;
    if (!txnForm.product) errors.product = "Choose a product";
    if (!amount || amount <= 0) errors.amount = "Enter an amount greater than zero";
    else if (amount < 1_000) errors.amount = "Minimum transaction is UGX 1,000";
    if (member && txnForm.type !== "Deposit" && amount > member.savings)
      errors.amount = `Exceeds ${member.name}'s savings of ${formatCurrency(member.savings)}`;
    if (txnForm.type === "Transfer" && txnForm.toProduct === txnForm.product) errors.toProduct = "Pick a different destination product";
    setTxnErrors(errors);
    if (Object.keys(errors).length || !member) return;

    const needsApproval = txnForm.type === "Withdrawal" && amount > APPROVAL_THRESHOLD;
    const id = nextTxnId(transactions);
    const channel = txnForm.type === "Transfer" ? "Internal" : txnForm.channel;
    const txn: SavingsTxn = {
      id,
      sv: member.sv_number,
      member: member.name,
      type: txnForm.type,
      product: txnForm.product,
      toProduct: txnForm.type === "Transfer" ? txnForm.toProduct : undefined,
      amount,
      date: todayISO(),
      channel,
      reference: txnForm.reference.trim() || `${channel === "Mobile Money" ? "MM" : channel === "Bank" ? "BNK" : channel === "Cash" ? "CSH" : "TRF"}-${id.slice(4)}`,
      status: needsApproval ? "pending" : "posted",
    };
    setTransactions((prev) => [txn, ...prev]);
    if (!needsApproval) {
      setProducts((prev) => applyToProducts(prev, txn, 1));
      setMembers((prev) => applyToMembers(prev, txn, 1));
    }
    setTxnOpen(false);
    showToast(
      needsApproval
        ? `${id}: withdrawal above ${formatCompact(APPROVAL_THRESHOLD)} sent for approval`
        : `${txn.type} of ${formatCurrency(amount)} posted for ${member.name}`,
      needsApproval ? "info" : "success"
    );
  };

  const runConfirm = () => {
    if (!confirm) return;
    const { action, txn } = confirm;
    if (action === "post") {
      setTransactions((prev) => prev.map((x) => (x.id === txn.id ? { ...x, status: "posted" } : x)));
      setProducts((prev) => applyToProducts(prev, txn, 1));
      setMembers((prev) => applyToMembers(prev, txn, 1));
      showToast(`${txn.id} approved and posted`);
    } else if (action === "reverse") {
      setTransactions((prev) => prev.map((x) => (x.id === txn.id ? { ...x, status: "reversed" } : x)));
      setProducts((prev) => applyToProducts(prev, txn, -1));
      setMembers((prev) => applyToMembers(prev, txn, -1));
      showToast(`${txn.id} reversed — balances restored`, "info");
    } else {
      setTransactions((prev) => prev.map((x) => (x.id === txn.id ? { ...x, status: "rejected" } : x)));
      showToast(`${txn.id} rejected`, "info");
    }
  };

  const openProduct = (mode: "add" | "edit", p?: SavingsProduct) => {
    setProductForm(
      p
        ? { code: p.code, name: p.name, rate: String(p.rate), min: String(p.min), status: p.status, description: p.description }
        : EMPTY_PRODUCT_FORM
    );
    setProductErrors({});
    setProductModal({ mode });
  };

  const saveProduct = () => {
    if (!productModal) return;
    const errors: Record<string, string> = {};
    const code = productForm.code.trim().toUpperCase();
    const name = productForm.name.trim();
    const rate = Number(productForm.rate);
    const min = Number(productForm.min || 0);
    if (!name) errors.name = "Name is required";
    else if (products.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.code !== code)) errors.name = "Another product already uses this name";
    if (productModal.mode === "add") {
      if (!/^[A-Z0-9-]{3,12}$/.test(code)) errors.code = "3–12 letters, digits or dashes (e.g. SV-HOL)";
      else if (products.some((p) => p.code === code)) errors.code = "Code already exists";
    }
    if (productForm.rate === "" || Number.isNaN(rate) || rate < 0 || rate > 30) errors.rate = "Enter a rate between 0 and 30%";
    if (Number.isNaN(min) || min < 0) errors.min = "Minimum balance cannot be negative";
    setProductErrors(errors);
    if (Object.keys(errors).length) return;

    const fields = { name, rate, min, status: productForm.status, description: productForm.description.trim() };
    if (productModal.mode === "edit") {
      setProducts((prev) => prev.map((p) => (p.code === code ? { ...p, ...fields } : p)));
      showToast(`${name} configuration saved`);
    } else {
      setProducts((prev) => [...prev, { code, members: 0, balance: 0, color: PRODUCT_COLORS[prev.length % PRODUCT_COLORS.length], ...fields }]);
      showToast(`${name} product added`);
    }
    setProductModal(null);
  };

  const exportTxns = () => {
    if (!filteredTxns.length) return showToast("No transactions to export", "info");
    exportToCsv(
      `savings-transactions-${todayISO()}`,
      filteredTxns.map((t) => ({ ...t, product: productName(t.product), toProduct: t.toProduct ? productName(t.toProduct) : "" })),
      [
        { key: "id", label: "Ref" }, { key: "date", label: "Date" }, { key: "sv", label: "SV No." }, { key: "member", label: "Member" },
        { key: "type", label: "Type" }, { key: "product", label: "Product" }, { key: "toProduct", label: "To product" },
        { key: "amount", label: "Amount (UGX)" }, { key: "channel", label: "Channel" }, { key: "reference", label: "Reference" }, { key: "status", label: "Status" },
      ]
    );
    showToast(`${filteredTxns.length} transactions exported`);
  };

  const exportProducts = () => {
    exportToCsv(`savings-products-${todayISO()}`, products.map((p) => ({ ...p })), [
      { key: "code", label: "Code" }, { key: "name", label: "Product" }, { key: "rate", label: "Rate (% p.a.)" },
      { key: "min", label: "Minimum balance (UGX)" }, { key: "members", label: "Members" }, { key: "balance", label: "Balance (UGX)" },
      { key: "status", label: "Status" }, { key: "description", label: "Description" },
    ]);
    showToast(`${products.length} products exported`);
  };

  const pendingAmount = Number(txnForm.amount);
  const willNeedApproval = txnForm.type === "Withdrawal" && pendingAmount > APPROVAL_THRESHOLD;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Savings Management"
        subtitle="Manage savings products, process transactions, and monitor growth"
        actions={
          <>
            <Button variant="secondary" onClick={activeTab === "transactions" ? exportTxns : exportProducts}>
              <Download className="w-4 h-4" /> {activeTab === "transactions" ? "Export transactions" : "Export products"}
            </Button>
            <Button onClick={openNewTxn}>
              <Plus className="w-4 h-4" /> New Transaction
            </Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "overview" as TabId, label: "Overview" },
          { id: "products" as TabId, label: "Products", count: products.length },
          { id: "transactions" as TabId, label: "Transactions", count: transactions.length },
        ]}
        active={activeTab}
        onChange={setTab}
      />

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Savings Balance" value={formatCompact(metrics.total)} icon={PiggyBank} color="#22c55e"
              sub={`Weighted rate ${metrics.weightedRate.toFixed(1)}% p.a.`} />
            <StatCard label="Deposits This Month" value={formatCompact(metrics.deposits)} icon={ArrowUpRight} color="#4A90D9"
              sub={`${metrics.depCount} posted deposit${metrics.depCount === 1 ? "" : "s"}`} />
            <StatCard label="Withdrawals This Month" value={formatCompact(metrics.withdrawals)} icon={ArrowDownRight} color="#f59e0b"
              sub={`${metrics.wdCount} posted · ${metrics.pending} pending approval`} />
            <StatCard label="Net Flow This Month" value={formatCompact(metrics.net)} icon={Scale} color={metrics.net >= 0 ? "#22c55e" : "#ef4444"}
              sub="Deposits minus withdrawals" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-1 text-sm">Savings Growth Trend</h3>
              <p className="text-xs dm-text-secondary mb-4">Dec 2025 – Nov 2026 · latest month reflects live product balances</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(Number(v) / 1e9).toFixed(1)}B`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                    <Area type="monotone" dataKey="amount" name="Savings" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-4 text-sm">Product Distribution</h3>
              {pieData.length === 0 ? (
                <EmptyState icon={PiggyBank} title="No balances yet" hint="Post a deposit to see the distribution." />
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="balance" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {pieData.map((p) => <Cell key={p.code} fill={p.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {pieData.map((p) => (
                      <div key={p.code} className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="dm-text-secondary truncate">{p.name}</span>
                        </div>
                        <span className="font-medium dm-text">{formatCompact(p.balance)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="accent" onClick={() => openProduct("add")}>
              <Plus className="w-4 h-4" /> Add product
            </Button>
          </div>
          {products.length === 0 && (
            <div className="glass-card rounded-xl">
              <EmptyState icon={PiggyBank} title="No savings products" hint="Add your first product to start accepting deposits." />
            </div>
          )}
          {products.map((p) => (
            <div key={p.code} className="glass-card rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <h3 className="font-semibold dm-text">{p.name}</h3>
                    <span className="text-[10px] font-mono dm-text-secondary">{p.code}</span>
                    <Badge status={p.status} />
                  </div>
                  <p className="text-xs dm-text-secondary mb-3">{p.description || "No description"}</p>
                  <div className="flex flex-wrap gap-4 text-xs dm-text-secondary">
                    <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Interest: <b className="dm-text">{p.rate}% p.a.</b></span>
                    <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Min balance: <b className="dm-text">{formatCurrency(p.min)}</b></span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Accounts: <b className="dm-text">{formatNumber(p.members)}</b></span>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs dm-text-secondary">Total Balance</p>
                  <p className="text-lg font-bold dm-text">{formatCurrency(p.balance)}</p>
                  <Button variant="secondary" className="mt-2 px-3 py-1.5 text-xs" onClick={() => openProduct("edit", p)}>
                    <Settings2 className="w-3.5 h-3.5" /> Configure
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center border-b dm-border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 dm-text-secondary" />
              <TextInput value={search} onChange={setSearch} placeholder="Search member, SV number, ref or reference…" className="pl-9" aria-label="Search transactions" />
            </div>
            <SelectInput className="md:w-40" value={typeFilter} onChange={setTypeFilter}
              options={[{ value: "all", label: "All types" }, { value: "Deposit", label: "Deposits" }, { value: "Withdrawal", label: "Withdrawals" }, { value: "Transfer", label: "Transfers" }]} />
            <SelectInput className="md:w-40" value={statusFilter} onChange={setStatusFilter}
              options={[{ value: "all", label: "All statuses" }, { value: "posted", label: "Posted" }, { value: "pending", label: "Pending" }, { value: "reversed", label: "Reversed" }, { value: "rejected", label: "Rejected" }]} />
          </div>
          {filteredTxns.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No transactions match"
              hint="Try a different search or clear the filters."
              action={<Button variant="secondary" onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }}>Clear filters</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                    <th className={th}>Ref</th>
                    <th className={th}>Member</th>
                    <th className={th}>Type</th>
                    <th className={th}>Product</th>
                    <th className={cn(th, "text-right")}>Amount</th>
                    <th className={th}>Channel / Reference</th>
                    <th className={th}>Status</th>
                    <th className={th}>Date</th>
                    <th className={cn(th, "text-right")}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((t) => (
                    <tr key={t.id} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                      <td className={cn(td, "font-mono dm-text-secondary")}>{t.id}</td>
                      <td className={td}>
                        <p className="dm-text font-medium">{t.member}</p>
                        <p className="dm-text-secondary text-[11px]">{t.sv}</p>
                      </td>
                      <td className={cn(td, "font-semibold", t.type === "Deposit" ? "text-[#16a34a]" : t.type === "Withdrawal" ? "text-[#ef4444]" : "text-[#4A90D9]")}>{t.type}</td>
                      <td className={cn(td, "dm-text-secondary")}>
                        {productName(t.product)}
                        {t.toProduct && <> → {productName(t.toProduct)}</>}
                      </td>
                      <td className={cn(td, "text-right font-medium dm-text")}>{formatCurrency(t.amount)}</td>
                      <td className={cn(td, "dm-text-secondary")}>
                        {t.channel}
                        <span className="block font-mono text-[10px]">{t.reference}</span>
                      </td>
                      <td className={td}><Badge status={t.status} /></td>
                      <td className={cn(td, "dm-text-secondary")}>{formatDate(t.date)}</td>
                      <td className={cn(td, "text-right")}>
                        <div className="flex justify-end gap-1.5">
                          {t.status === "pending" && (
                            <>
                              <button onClick={() => setConfirm({ action: "post", txn: t })}
                                className="px-2 py-1 bg-[#16a34a] text-white rounded-lg text-[10px] font-medium hover:bg-[#15803d] transition-colors inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Post
                              </button>
                              <button onClick={() => setConfirm({ action: "reject", txn: t })}
                                className="px-2 py-1 border dm-border dm-text-secondary rounded-lg text-[10px] font-medium hover:dm-surface-hover transition-colors inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {t.status === "posted" && (
                            <button onClick={() => setConfirm({ action: "reverse", txn: t })}
                              className="px-2 py-1 border border-[#ef4444]/40 text-[#ef4444] rounded-lg text-[10px] font-medium hover:bg-[#ef4444]/10 transition-colors inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Reverse
                            </button>
                          )}
                          {(t.status === "reversed" || t.status === "rejected") && <span className="text-[10px] dm-text-secondary">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 text-xs dm-text-secondary border-t dm-border">
            Showing {filteredTxns.length} of {transactions.length} · withdrawals above {formatCurrency(APPROVAL_THRESHOLD)} require approval
          </div>
        </div>
      )}

      {/* ======== NEW TRANSACTION ======== */}
      <Modal
        open={txnOpen}
        onClose={() => setTxnOpen(false)}
        title="Record New Transaction"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={submitTxn}>
              <Plus className="w-4 h-4" /> {willNeedApproval ? "Submit for approval" : "Post transaction"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Member" required error={txnErrors.sv}>
            <SelectInput value={txnForm.sv} onChange={(v) => setTxnForm({ ...txnForm, sv: v })} options={memberOptions(members)} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Transaction type" required>
              <SelectInput value={txnForm.type} onChange={(v) => setTxnForm({ ...txnForm, type: v as TxnType })}
                options={[{ value: "Deposit", label: "Deposit" }, { value: "Withdrawal", label: "Withdrawal" }, { value: "Transfer", label: "Transfer between products" }]} />
            </FormField>
            <FormField label={txnForm.type === "Transfer" ? "From product" : "Product"} required error={txnErrors.product}>
              <SelectInput value={txnForm.product} onChange={(v) => setTxnForm({ ...txnForm, product: v })}
                options={activeProducts.map((p) => ({ value: p.code, label: p.name }))} />
            </FormField>
          </div>
          {txnForm.type === "Transfer" && (
            <FormField label="To product" required error={txnErrors.toProduct}>
              <SelectInput value={txnForm.toProduct} onChange={(v) => setTxnForm({ ...txnForm, toProduct: v })}
                options={activeProducts.map((p) => ({ value: p.code, label: p.name }))} />
            </FormField>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Amount (UGX)" required error={txnErrors.amount}
              hint={willNeedApproval ? "Above the approval threshold — will be held as pending" : undefined}>
              <TextInput type="number" min={0} value={txnForm.amount} onChange={(v) => setTxnForm({ ...txnForm, amount: v })} placeholder="0" />
            </FormField>
            {txnForm.type !== "Transfer" && (
              <FormField label="Channel" required>
                <SelectInput value={txnForm.channel} onChange={(v) => setTxnForm({ ...txnForm, channel: v })}
                  options={[{ value: "Cash", label: "Cash" }, { value: "Mobile Money", label: "Mobile Money" }, { value: "Bank", label: "Bank" }]} />
              </FormField>
            )}
          </div>
          <FormField label="Reference" hint="Receipt, mobile-money or bank reference. Leave blank to auto-generate.">
            <TextInput value={txnForm.reference} onChange={(v) => setTxnForm({ ...txnForm, reference: v })} placeholder="e.g. MM-883210" maxLength={30} />
          </FormField>
        </div>
      </Modal>

      {/* ======== ADD / CONFIGURE PRODUCT ======== */}
      <Modal
        open={productModal !== null}
        onClose={() => setProductModal(null)}
        title={productModal?.mode === "add" ? "Add Savings Product" : `Configure — ${productForm.name || productForm.code}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setProductModal(null)}>Cancel</Button>
            <Button variant="accent" onClick={saveProduct}>{productModal?.mode === "add" ? "Add product" : "Save configuration"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Product name" required error={productErrors.name}>
              <TextInput value={productForm.name} onChange={(v) => setProductForm({ ...productForm, name: v })} placeholder="e.g. Holiday Savings" />
            </FormField>
            <FormField label="Product code" required error={productErrors.code} hint={productModal?.mode === "edit" ? "Codes cannot be changed" : undefined}>
              <TextInput value={productForm.code} disabled={productModal?.mode === "edit"} onChange={(v) => setProductForm({ ...productForm, code: v })} placeholder="SV-HOL" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Interest rate (% p.a.)" required error={productErrors.rate}>
              <TextInput type="number" step="0.1" min={0} max={30} value={productForm.rate} onChange={(v) => setProductForm({ ...productForm, rate: v })} />
            </FormField>
            <FormField label="Minimum balance (UGX)" error={productErrors.min}>
              <TextInput type="number" min={0} value={productForm.min} onChange={(v) => setProductForm({ ...productForm, min: v })} placeholder="0" />
            </FormField>
            <FormField label="Status">
              <SelectInput value={productForm.status} onChange={(v) => setProductForm({ ...productForm, status: v as SavingsProduct["status"] })}
                options={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "suspended", label: "Suspended" }]} />
            </FormField>
          </div>
          <FormField label="Description">
            <TextAreaInput value={productForm.description} onChange={(v) => setProductForm({ ...productForm, description: v })} maxLength={200} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        danger={confirm?.action !== "post"}
        title={confirm?.action === "post" ? "Approve & post transaction" : confirm?.action === "reverse" ? "Reverse transaction" : "Reject transaction"}
        confirmLabel={confirm?.action === "post" ? "Post" : confirm?.action === "reverse" ? "Reverse" : "Reject"}
        message={
          confirm && (
            <>
              {confirm.action === "post" && "Post "}
              {confirm.action === "reverse" && "Reverse "}
              {confirm.action === "reject" && "Reject "}
              <b className="dm-text">{confirm.txn.id}</b> — {confirm.txn.type.toLowerCase()} of <b className="dm-text">{formatCurrency(confirm.txn.amount)}</b> for {confirm.txn.member} ({confirm.txn.sv})?
              {confirm.action === "reverse" && " Product balances will be restored."}
            </>
          )
        }
      />
    </div>
  );
}
