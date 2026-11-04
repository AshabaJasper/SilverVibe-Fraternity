"use client";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Download, Plus, TrendingUp, Scale,
  CheckCircle, Eye, RotateCcw, Trash2, Search, Loader2, Landmark, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency, formatCompact, formatDate, formatNumber, todayISO, cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { DEMO_TODAY } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import { exportToCsv } from "@/lib/export";
import { generateIncomeStatement, generateBalanceSheet, generateTrialBalance, generateTablePdf } from "@/lib/pdf-reports";
import Modal, { FormField, TextInput, SelectInput, Button, ConfirmDialog } from "@/components/Modal";
import { EmptyState, Badge, PageHeader, StatCard, Tabs } from "@/components/ui";
import {
  ACCOUNT_BY_CODE, ACCOUNT_OPTIONS, DEFAULT_JOURNAL, FY_START, HISTORY, JOURNAL_KEY, MONTHS, OPENING_DATE, PERIOD_START,
  accountLabel, buildStatements, buildTrialBalance, cashFlowTable, nextJeId, trialBalanceRows,
  type JournalEntry, type Statements, type TbRow,
} from "../_lib/ledger";

// Chart of accounts, opening balances, seed journal and statement builders live in
// ../_lib/ledger so the Reports page produces exactly the same figures.
const EXPENSE_COLORS = ["#4A90D9", "#22c55e", "#f59e0b", "#a855f7", "#C0C0C0"];

type TabId = "overview" | "journal" | "trial" | "statements";
const TAB_IDS: TabId[] = ["overview", "journal", "trial", "statements"];
type StatementKind = "income" | "balance" | "cashflow" | "trial";

const th = "text-left px-4 py-3 text-xs font-semibold text-[#64748b] whitespace-nowrap";
const td = "px-4 py-3 text-xs whitespace-nowrap";

export default function AdminAccountingPage() {
  return (
    <Suspense>
      <AccountingInner />
    </Suspense>
  );
}

function AccountingInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const tabParam = params.get("tab") as TabId | null;
  const activeTab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "overview";
  const setTab = (t: TabId) => router.replace(`${pathname}?tab=${t}`, { scroll: false });
  const today = hydrated ? todayISO() : DEMO_TODAY;

  const [entries, setEntries] = usePersistedState<JournalEntry[]>(JOURNAL_KEY, DEFAULT_JOURNAL);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ date: DEMO_TODAY, description: "", debit: "5000", credit: "1100", amount: "", reference: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { action: "post" | "reverse" | "delete"; id: string }>(null);
  const [preview, setPreview] = useState<StatementKind | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const tb = useMemo(() => buildTrialBalance(entries), [entries]);
  const st = useMemo(() => buildStatements(tb), [tb]);
  const tbTotals = useMemo(() => ({ debit: tb.reduce((a, r) => a + r.debit, 0), credit: tb.reduce((a, r) => a + r.credit, 0) }), [tb]);
  const balanced = tbTotals.debit === tbTotals.credit;

  // Chart: Jan–Sep history + posted journal activity per month (Oct onwards).
  const chart = useMemo(() => {
    const rows = HISTORY.map((h) => ({ ...h }));
    for (const e of entries) {
      if (e.status !== "posted") continue;
      const m = MONTHS[Number(e.date.slice(5, 7)) - 1];
      let row = rows.find((r) => r.month === m);
      if (!row) {
        row = { month: m, income: 0, expense: 0 };
        rows.push(row);
      }
      // Debit to income reduces it (reversals); credit increases it. Opposite for expenses.
      for (const [code, sign] of [[e.debit, 1], [e.credit, -1]] as const) {
        const t = ACCOUNT_BY_CODE[code]?.type;
        if (t === "income") row.income -= sign * e.amount;
        if (t === "expense") row.expense += sign * e.amount;
      }
    }
    return rows.sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
  }, [entries]);

  const expensePie = st.expenses.filter((l) => l.amount > 0).map((l, i) => ({ name: l.label, value: l.amount, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...entries]
      .sort((a, b) => b.id.localeCompare(a.id))
      .filter((e) => {
        const shown = e.reversedBy ? "reversed" : e.status;
        if (statusFilter !== "all" && shown !== statusFilter) return false;
        if (!q) return true;
        return [e.id, e.description, e.reference, accountLabel(e.debit), accountLabel(e.credit)].some((s) => s.toLowerCase().includes(q));
      });
  }, [entries, statusFilter, search]);

  const viewEntry = entries.find((e) => e.id === viewId) ?? null;

  // ---------------- Handlers ----------------
  const openNew = () => {
    setForm({ date: today, description: "", debit: "5000", credit: "1100", amount: "", reference: "" });
    setErrors({});
    setNewOpen(true);
  };

  const submitNew = (post: boolean) => {
    const e: Record<string, string> = {};
    const amount = Number(form.amount);
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.date) e.date = "Pick a date";
    else if (form.date < PERIOD_START) e.date = `Periods before ${formatDate(PERIOD_START)} are closed`;
    else if (form.date > today) e.date = "Entries cannot be future-dated";
    if (form.debit === form.credit) e.credit = "Debit and credit accounts must differ";
    if (!form.amount.trim() || !(amount > 0)) e.amount = "Enter an amount greater than zero";
    else if (!/^\d+$/.test(form.amount.trim())) e.amount = "UGX amounts must be whole shillings (no decimals)";
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = nextJeId(entries);
    setEntries((prev) => [
      { id, date: form.date, description: form.description.trim(), debit: form.debit, credit: form.credit, amount, reference: form.reference.trim(), status: post ? "posted" : "draft", by: "Sarah Nakamya" },
      ...prev,
    ]);
    showToast(post ? `${id} posted to the ledger` : `${id} saved as draft`);
    setNewOpen(false);
  };

  const runConfirm = () => {
    if (!confirm) return;
    const entry = entries.find((e) => e.id === confirm.id);
    if (!entry) return;
    if (confirm.action === "post") {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "posted" } : e)));
      showToast(`${entry.id} posted — trial balance updated`);
    } else if (confirm.action === "delete") {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showToast(`Draft ${entry.id} deleted`, "info");
    } else {
      // Reversal = a new posted entry with debit/credit swapped; the original stays posted but flagged.
      const id = nextJeId(entries);
      setEntries((prev) => [
        { id, date: todayISO(), description: `Reversal of ${entry.id}: ${entry.description}`, debit: entry.credit, credit: entry.debit, amount: entry.amount, reference: entry.reference, status: "posted", by: "Sarah Nakamya", reversalOf: entry.id },
        ...prev.map((e) => (e.id === entry.id ? { ...e, reversedBy: id } : e)),
      ]);
      showToast(`${entry.id} reversed by ${id}`, "info");
    }
    setViewId(null);
  };

  const tbExportRows = trialBalanceRows(tb);
  const exportJournal = () => {
    if (!filtered.length) return showToast("No journal entries to export", "info");
    exportToCsv(`journal-${todayISO()}`, filtered.map((e) => ({ ...e, debit: accountLabel(e.debit), credit: accountLabel(e.credit), status: e.reversedBy ? "reversed" : e.status })), [
      { key: "id", label: "Entry" }, { key: "date", label: "Date" }, { key: "description", label: "Description" },
      { key: "debit", label: "Debit account" }, { key: "credit", label: "Credit account" }, { key: "amount", label: "Amount (UGX)" },
      { key: "reference", label: "Reference" }, { key: "status", label: "Status" }, { key: "by", label: "Prepared by" },
    ]);
    showToast(`${filtered.length} journal entries exported`);
  };
  const exportTb = () => {
    exportToCsv(`trial-balance-${todayISO()}`, [...tbExportRows, { code: "", name: "Totals", debit: tbTotals.debit, credit: tbTotals.credit }], [
      { key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "debit", label: "Debit (UGX)" }, { key: "credit", label: "Credit (UGX)" },
    ]);
    showToast("Trial balance exported");
  };

  const downloadPdf = async (kind: StatementKind) => {
    setBusy(kind);
    try {
      if (kind === "income") await generateIncomeStatement(st.income, st.expenses);
      else if (kind === "balance") await generateBalanceSheet(st.assets, st.liabilities, st.equity);
      else if (kind === "trial") await generateTrialBalance(tbExportRows);
      else {
        // generateCashFlow() only prints fixed demo figures, so build the table from the ledger
        // (same rows as the on-screen preview and the Reports page).
        const cf = cashFlowTable(st);
        const rows = cf.rows.map(([label, amount], i) => [cf.headingRows.includes(i) || cf.boldRows.includes(i) ? label : `   ${label}`, amount]);
        const bold = cf.boldRows;
        await generateTablePdf({
          title: "Cash Flow Statement",
          subtitle: `FY 2026 · for the period ${formatDate(FY_START)} to ${formatDate(todayISO())}`,
          filename: `cash-flow-${todayISO()}`,
          summary: [["Net increase in cash", formatCurrency(st.netCash)], ["Closing cash & bank", formatCurrency(st.openingCash + st.netCash)]],
          sections: [{ columns: ["Item", "Amount (UGX)"], rows, boldRows: bold, numericCols: [1] }],
        });
      }
      showToast("PDF downloaded");
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setBusy(null);
    }
  };

  const STATEMENT_CARDS: { kind: StatementKind; title: string; desc: string; icon: typeof BookOpen; figure: string }[] = [
    { kind: "income", title: "Income Statement", desc: "Revenue and expenses, FY 2026 year to date", icon: TrendingUp, figure: `Surplus ${formatCompact(st.surplus)}` },
    { kind: "balance", title: "Balance Sheet", desc: "Assets, liabilities and equity", icon: Scale, figure: `Assets ${formatCompact(st.totalAssets)}` },
    { kind: "cashflow", title: "Cash Flow Statement", desc: `Cash movements since ${formatDate(FY_START)} (FY 2026 to date)`, icon: Landmark, figure: `Net ${formatCompact(st.netCash)}` },
    { kind: "trial", title: "Trial Balance", desc: "Closing balances of every account", icon: FileSpreadsheet, figure: balanced ? "Balanced" : "Out of balance" },
  ];

  const drafts = entries.filter((e) => e.status === "draft").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Accounting"
        subtitle="Financial records, journal entries, and statements"
        actions={
          <>
            <Button variant="secondary" onClick={activeTab === "journal" ? exportJournal : exportTb}>
              <Download className="w-4 h-4" /> {activeTab === "journal" ? "Export journal" : "Export trial balance"}
            </Button>
            <Button onClick={openNew}><Plus className="w-4 h-4" /> New Entry</Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "overview" as TabId, label: "Overview" },
          { id: "journal" as TabId, label: "Journal", count: entries.length },
          { id: "trial" as TabId, label: "Trial Balance" },
          { id: "statements" as TabId, label: "Statements" },
        ]}
        active={activeTab}
        onChange={setTab}
      />

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Income (YTD)" value={formatCompact(st.totalIncome)} icon={ArrowUpRight} color="#22c55e" sub="FY 2026, posted entries" />
            <StatCard label="Total Expenses (YTD)" value={formatCompact(st.totalExpenses)} icon={ArrowDownRight} color="#ef4444" sub={`${drafts} draft entr${drafts === 1 ? "y" : "ies"} not yet posted`} />
            <StatCard label="Net Surplus" value={formatCompact(st.surplus)} icon={TrendingUp} color={st.surplus >= 0 ? "#4A90D9" : "#ef4444"}
              sub={st.totalIncome ? `${((st.surplus / st.totalIncome) * 100).toFixed(1)}% margin` : "—"} />
            <StatCard label="Total Assets" value={formatCompact(st.totalAssets)} icon={Scale} color="#a855f7" sub="Net of loan-loss allowance" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-1 text-sm">Income vs Expenses — FY 2026</h3>
              <p className="text-xs dm-text-secondary mb-4">Oct onwards is computed live from posted journal entries</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#4A90D9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-4 text-sm">Expense Breakdown (YTD)</h3>
              {expensePie.length === 0 ? (
                <EmptyState title="No expenses recorded" />
              ) : (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expensePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={66} paddingAngle={2}>
                          {expensePie.map((e) => <Cell key={e.name} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {expensePie.map((e) => (
                      <div key={e.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 dm-text-secondary min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} /><span className="truncate">{e.name}</span></span>
                        <span className="font-medium dm-text">{formatCompact(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "journal" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center border-b dm-border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 dm-text-secondary" />
              <TextInput value={search} onChange={setSearch} placeholder="Search entry, description, account or reference…" className="pl-9" aria-label="Search journal" />
            </div>
            <SelectInput className="md:w-44" value={statusFilter} onChange={setStatusFilter}
              options={[{ value: "all", label: "All statuses" }, { value: "draft", label: "Draft" }, { value: "posted", label: "Posted" }, { value: "reversed", label: "Reversed" }]} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title="No journal entries match" hint="Change the filters or create a new entry."
              action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                    <th className={th}>Entry</th>
                    <th className={th}>Date</th>
                    <th className={th}>Description</th>
                    <th className={th}>Debit</th>
                    <th className={th}>Credit</th>
                    <th className={cn(th, "text-right")}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={cn(th, "text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                      <td className={cn(td, "font-mono dm-text-secondary")}>{e.id}</td>
                      <td className={cn(td, "dm-text-secondary")}>{formatDate(e.date)}</td>
                      <td className={cn(td, "dm-text max-w-xs truncate")} title={e.description}>{e.description}</td>
                      <td className={cn(td, "dm-text-secondary")}>{accountLabel(e.debit)}</td>
                      <td className={cn(td, "dm-text-secondary")}>{accountLabel(e.credit)}</td>
                      <td className={cn(td, "text-right font-medium dm-text")}>{formatCurrency(e.amount)}</td>
                      <td className={td}><Badge status={e.reversedBy ? "reversed" : e.status} /></td>
                      <td className={cn(td, "text-right")}>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setViewId(e.id)} className="p-1.5 rounded-lg hover:bg-[#f1f5f9]" aria-label={`View ${e.id}`} title="View">
                            <Eye className="w-3.5 h-3.5 dm-text-secondary" />
                          </button>
                          {e.status === "draft" && (
                            <>
                              <button onClick={() => setConfirm({ action: "post", id: e.id })}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[#22c55e] text-white rounded-lg text-[10px] font-medium hover:bg-[#16a34a]">
                                <CheckCircle className="w-3 h-3" /> Post
                              </button>
                              <button onClick={() => setConfirm({ action: "delete", id: e.id })} className="p-1.5 rounded-lg hover:bg-[#ef4444]/10 text-[#ef4444]" aria-label={`Delete ${e.id}`} title="Delete draft">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {e.status === "posted" && !e.reversedBy && !e.reversalOf && (
                            <button onClick={() => setConfirm({ action: "reverse", id: e.id })}
                              className="inline-flex items-center gap-1 px-2 py-1 border border-[#ef4444]/40 text-[#ef4444] rounded-lg text-[10px] font-medium hover:bg-[#ef4444]/10">
                              <RotateCcw className="w-3 h-3" /> Reverse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 text-xs dm-text-secondary border-t dm-border">
            Showing {filtered.length} of {entries.length} entries · only posted entries affect the trial balance
          </div>
        </div>
      )}

      {activeTab === "trial" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dm-border">
            <div>
              <h3 className="font-semibold dm-text text-sm">Trial Balance</h3>
              <p className="text-xs dm-text-secondary">As at {formatDate(today)} · opening balances at {formatDate(OPENING_DATE)} + posted entries</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge status={balanced ? "Balanced" : "Out of balance"} tone={balanced ? "green" : "red"} />
              <Button variant="secondary" onClick={exportTb}><Download className="w-4 h-4" /> CSV</Button>
              <Button onClick={() => downloadPdf("trial")} disabled={busy === "trial"}>
                {busy === "trial" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Download PDF
              </Button>
            </div>
          </div>
          <TrialBalanceTable tb={tb} totals={tbTotals} />
        </div>
      )}

      {activeTab === "statements" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STATEMENT_CARDS.map((s) => (
            <div key={s.kind} className="glass-card rounded-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mb-3">
                  <s.icon className="w-5 h-5 text-[#4A90D9]" />
                </div>
                <span className="text-xs font-semibold dm-text">{s.figure}</span>
              </div>
              <h3 className="font-semibold dm-text mb-1">{s.title}</h3>
              <p className="text-xs dm-text-secondary mb-4">{s.desc}</p>
              <div className="flex gap-2">
                <Button className="px-3 py-1.5 text-xs" onClick={() => setPreview(s.kind)}>
                  <Eye className="w-3.5 h-3.5" /> Generate
                </Button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => downloadPdf(s.kind)} disabled={busy === s.kind}>
                  {busy === s.kind ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== NEW ENTRY ======== */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Journal Entry" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => submitNew(false)}>Save as draft</Button>
            <Button onClick={() => submitNew(true)}><CheckCircle className="w-4 h-4" /> Save & post</Button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Date" required error={errors.date}>
              <TextInput type="date" value={form.date} min={PERIOD_START} max={today} onChange={(v) => setForm({ ...form, date: v })} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Description" required error={errors.description}>
                <TextInput value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="e.g. Office stationery — November" maxLength={120} />
              </FormField>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Debit account" required>
              <SelectInput value={form.debit} onChange={(v) => setForm({ ...form, debit: v })} options={ACCOUNT_OPTIONS} />
            </FormField>
            <FormField label="Credit account" required error={errors.credit}>
              <SelectInput value={form.credit} onChange={(v) => setForm({ ...form, credit: v })} options={ACCOUNT_OPTIONS} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Amount (UGX)" required error={errors.amount}>
              <TextInput type="number" min={1} step={1} inputMode="numeric" value={form.amount} onChange={(v) => { setForm({ ...form, amount: v }); if (errors.amount) setErrors({ ...errors, amount: "" }); }} placeholder="0" />
            </FormField>
            <FormField label="Reference" hint="Invoice, receipt or voucher number">
              <TextInput value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} placeholder="e.g. INV-7790" maxLength={30} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* ======== VIEW ENTRY ======== */}
      <Modal open={viewEntry !== null} onClose={() => setViewId(null)} title={viewEntry ? `Journal Entry ${viewEntry.id}` : "Journal Entry"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewId(null)}>Close</Button>
            {viewEntry?.status === "draft" && <Button variant="success" onClick={() => setConfirm({ action: "post", id: viewEntry.id })}><CheckCircle className="w-4 h-4" /> Post</Button>}
            {viewEntry?.status === "posted" && !viewEntry.reversedBy && !viewEntry.reversalOf && (
              <Button variant="danger" onClick={() => setConfirm({ action: "reverse", id: viewEntry.id })}><RotateCcw className="w-4 h-4" /> Reverse</Button>
            )}
          </>
        }>
        {viewEntry && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Date" value={formatDate(viewEntry.date)} />
              <Detail label="Status" value={<Badge status={viewEntry.reversedBy ? "reversed" : viewEntry.status} />} />
              <Detail label="Reference" value={viewEntry.reference || "—"} />
              <Detail label="Prepared by" value={viewEntry.by} />
            </div>
            <Detail label="Description" value={viewEntry.description} />
            <div className="overflow-x-auto rounded-xl border dm-border">
              <table className="w-full">
                <thead><tr className="bg-[#f8f9fa]"><th className={th}>Account</th><th className={cn(th, "text-right")}>Debit</th><th className={cn(th, "text-right")}>Credit</th></tr></thead>
                <tbody>
                  <tr className="border-t dm-border"><td className={cn(td, "dm-text")}>{accountLabel(viewEntry.debit)}</td><td className={cn(td, "text-right dm-text")}>{formatCurrency(viewEntry.amount)}</td><td className={cn(td, "text-right dm-text-secondary")}>—</td></tr>
                  <tr className="border-t dm-border"><td className={cn(td, "dm-text")}>{accountLabel(viewEntry.credit)}</td><td className={cn(td, "text-right dm-text-secondary")}>—</td><td className={cn(td, "text-right dm-text")}>{formatCurrency(viewEntry.amount)}</td></tr>
                </tbody>
              </table>
            </div>
            {viewEntry.reversedBy && <p className="text-xs dm-text-secondary">Reversed by {viewEntry.reversedBy}.</p>}
            {viewEntry.reversalOf && <p className="text-xs dm-text-secondary">This entry reverses {viewEntry.reversalOf}.</p>}
          </div>
        )}
      </Modal>

      {/* ======== STATEMENT PREVIEW ======== */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} size="xl"
        title={STATEMENT_CARDS.find((c) => c.kind === preview)?.title ?? "Statement"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>Close</Button>
            {preview && (
              <Button onClick={() => downloadPdf(preview)} disabled={busy === preview}>
                {busy === preview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
              </Button>
            )}
          </>
        }>
        {preview === "trial" && (
          <>
            <p className="text-xs dm-text-secondary mb-3">As at {formatDate(today)}</p>
            <TrialBalanceTable tb={tb} totals={tbTotals} />
          </>
        )}
        {preview && preview !== "trial" && <StatementPreview kind={preview} st={st} today={today} />}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        danger={confirm?.action !== "post"}
        title={confirm?.action === "post" ? "Post journal entry" : confirm?.action === "delete" ? "Delete draft" : "Reverse journal entry"}
        confirmLabel={confirm?.action === "post" ? "Post" : confirm?.action === "delete" ? "Delete" : "Reverse"}
        message={(() => {
          const e = entries.find((x) => x.id === confirm?.id);
          if (!e || !confirm) return null;
          if (confirm.action === "post") return `Post ${e.id} (${formatCurrency(e.amount)}) to the ledger? Posted entries can only be undone by reversal.`;
          if (confirm.action === "delete") return `Delete draft ${e.id}? This cannot be undone.`;
          return `Create a reversing entry for ${e.id}: Dr ${accountLabel(e.credit)} / Cr ${accountLabel(e.debit)}, ${formatCurrency(e.amount)}, dated today.`;
        })()}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Presentational helpers (module level so they never remount inputs)
// ------------------------------------------------------------------
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs dm-text-secondary">{label}</p>
      <div className="dm-text font-medium mt-0.5">{value}</div>
    </div>
  );
}

/** Amount inside statement tables: the "UGX" sits in the column header so cells fit at 390px. */
const amt = (n: number) => formatNumber(Math.round(n));
const stTd = "px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs";

function TrialBalanceTable({ tb, totals }: { tb: TbRow[]; totals: { debit: number; credit: number } }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
            <th className={cn(th, "px-3 sm:px-4")}>Code</th>
            <th className={cn(th, "px-3 sm:px-4")}>Account</th>
            <th className={cn(th, "px-3 sm:px-4 text-right")}>Debit (UGX)</th>
            <th className={cn(th, "px-3 sm:px-4 text-right")}>Credit (UGX)</th>
          </tr>
        </thead>
        <tbody>
          {tb.map((r) => (
            <tr key={r.code} className="border-b border-[#e2e8f0]">
              <td className={cn(stTd, "font-mono dm-text-secondary")}>{r.code}</td>
              <td className={cn(stTd, "dm-text min-w-[9rem]")}>{r.name}</td>
              <td className={cn(stTd, "text-right dm-text whitespace-nowrap tabular-nums")}>{r.debit ? formatNumber(r.debit) : "—"}</td>
              <td className={cn(stTd, "text-right dm-text whitespace-nowrap tabular-nums")}>{r.credit ? formatNumber(r.credit) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-[#f8f9fa]">
            <td className={stTd} />
            <td className={cn(stTd, "dm-text")}>Totals</td>
            <td className={cn(stTd, "text-right dm-text whitespace-nowrap tabular-nums")}>{formatNumber(totals.debit)}</td>
            <td className={cn(stTd, "text-right dm-text whitespace-nowrap tabular-nums")}>{formatNumber(totals.credit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface StRow { label: string; amount?: number; bold?: boolean; heading?: boolean }

function StatementTable({ rows }: { rows: StRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border dm-border">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
            <th className={cn(th, "px-3 sm:px-4")}>Line item</th>
            <th className={cn(th, "px-3 sm:px-4 text-right")}>Amount (UGX)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-b border-[#e2e8f0] last:border-0", r.heading && "bg-[#f8f9fa]")}>
              <td className={cn(stTd, r.heading ? "font-semibold dm-text" : r.bold ? "font-bold dm-text" : "dm-text-secondary pl-5 sm:pl-8")}>{r.label}</td>
              <td className={cn(stTd, "text-right whitespace-nowrap tabular-nums", r.bold || r.heading ? "font-bold dm-text" : "dm-text")}>{r.amount === undefined ? "" : amt(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatementPreview({ kind, st, today }: { kind: Exclude<StatementKind, "trial">; st: Statements; today: string }) {
  if (kind === "income") {
    return (
      <>
        <p className="text-xs dm-text-secondary mb-3">FY 2026 · for the period ended {formatDate(today)}</p>
        <StatementTable rows={[
          { label: "Income", heading: true },
          ...st.income.map((l) => ({ label: l.label, amount: l.amount })),
          { label: "Total income", amount: st.totalIncome, bold: true },
          { label: "Expenses", heading: true },
          ...st.expenses.map((l) => ({ label: l.label, amount: l.amount })),
          { label: "Total expenses", amount: st.totalExpenses, bold: true },
          { label: "Net surplus", amount: st.surplus, heading: true },
        ]} />
      </>
    );
  }
  if (kind === "balance") {
    return (
      <>
        <p className="text-xs dm-text-secondary mb-3">Statement of financial position as at {formatDate(today)}</p>
        <StatementTable rows={[
          { label: "Assets", heading: true },
          ...st.assets.map((l) => ({ label: l.label, amount: l.amount })),
          { label: "Total assets", amount: st.totalAssets, bold: true },
          { label: "Liabilities", heading: true },
          ...st.liabilities.map((l) => ({ label: l.label, amount: l.amount })),
          { label: "Total liabilities", amount: st.totalLiabilities, bold: true },
          { label: "Equity", heading: true },
          ...st.equity.map((l) => ({ label: l.label, amount: l.amount })),
          { label: "Retained surplus & reserves", amount: st.retained },
          { label: "Total equity", amount: st.totalEquity, bold: true },
          { label: "Total liabilities & equity", amount: st.totalLiabilities + st.totalEquity, heading: true },
        ]} />
      </>
    );
  }
  // Same rows as the PDF (cashFlowTable), so screen and download agree line for line.
  const cf = cashFlowTable(st);
  const last = cf.rows.length - 1;
  return (
    <>
      <p className="text-xs dm-text-secondary mb-3">FY 2026 · for the period {formatDate(FY_START)} to {formatDate(today)}</p>
      <StatementTable rows={cf.rows.map(([label, amount], i): StRow => ({
        label,
        amount: amount === "" ? undefined : amount,
        heading: cf.headingRows.includes(i) || i === last,
        bold: cf.boldRows.includes(i),
      }))} />
    </>
  );
}
