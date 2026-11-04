"use client";
import { Suspense, useState } from "react";
import {
  PiggyBank, ArrowDownRight, ArrowUpRight, Download, Eye, Lock, TrendingUp, CalendarDays, Percent,
  ArrowLeftRight, Wallet, Banknote, Receipt,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/Modal";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { liveSavingsHistory, shortName, usePortalData } from "../_lib/usePortalData";
import DepositModal from "../_components/DepositModal";
import ActionParam from "../_components/ActionParam";
import { StatementModal, TransferModal, WithdrawModal, txnInAccount } from "../_components/SavingsModals";

type ModalName = "statement" | "transfer" | "withdraw" | "deposit" | null;

export default function SavingsPage() {
  const { accounts, transactions, totalSavings, totalInterest, availableBalance } = usePortalData();
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalName>(null);

  const account = selected ? accounts.find((a) => a.id === selected) ?? null : null;
  // Filter by account id (a payment made from Flexi also shows under Flexi).
  const rows = selected ? transactions.filter((t) => txnInAccount(t, selected)) : transactions;
  const history = liveSavingsHistory(accounts);
  const pieData = accounts.map((a) => ({ name: shortName(a.product), value: a.balance, color: a.color }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <ActionParam actions={{ statement: () => setModal("statement"), deposit: () => setModal("deposit"), transfer: () => setModal("transfer") }} />
      </Suspense>

      <PageHeader
        title="Savings"
        subtitle="Manage and track all your savings accounts"
        actions={
          <>
            <Button variant="success" onClick={() => setModal("deposit")}>
              <Wallet className="w-4 h-4" /> Deposit
            </Button>
            <Button variant="secondary" onClick={() => setModal("transfer")}>
              <ArrowLeftRight className="w-4 h-4" /> Transfer
            </Button>
            <Button variant="secondary" onClick={() => setModal("withdraw")}>
              <Banknote className="w-4 h-4" /> Withdraw
            </Button>
            <Button onClick={() => setModal("statement")}>
              <Download className="w-4 h-4" /> Download Statement
            </Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Savings", value: formatCurrency(totalSavings), icon: PiggyBank, color: "#a855f7" },
          { label: "Available to Use", value: formatCurrency(availableBalance), icon: Eye, color: "#4A90D9" },
          { label: "Accrued Interest", value: formatCurrency(totalInterest), icon: Percent, color: "#22c55e" },
        ].map((c) => (
          <div key={c.label} className="glass-card rounded-2xl p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color}1a` }}>
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <span className="text-sm dm-text-secondary">{c.label}</span>
            </div>
            <p className="text-2xl font-bold dm-text">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="font-semibold dm-text mb-4">Savings Growth (6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="regular" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} name="Regular" />
                <Area type="monotone" dataKey="flexi" stackId="1" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.15} name="Flexi" />
                <Area type="monotone" dataKey="fixed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} name="Fixed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold dm-text mb-4">Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="dm-text-secondary truncate">{d.name}</span>
                </div>
                <span className="font-medium dm-text">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold dm-text">Your Accounts</h3>
          <p className="text-xs dm-text-secondary">Select an account to filter its transactions</p>
        </div>
        {accounts.length === 0 ? (
          <div className="glass-card rounded-2xl">
            <EmptyState icon={PiggyBank} title="No savings accounts" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acct) => (
              <button
                key={acct.id}
                type="button"
                aria-pressed={selected === acct.id}
                onClick={() => setSelected(selected === acct.id ? null : acct.id)}
                className={cn(
                  "text-left glass-card rounded-2xl p-5 hover:shadow-lg transition-all border-2",
                  selected === acct.id ? "!border-[#4A90D9]" : "border-transparent"
                )}
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${acct.color}1a` }}>
                      <PiggyBank className="w-5 h-5" style={{ color: acct.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium dm-text">{shortName(acct.product)}</p>
                      <p className="text-xs dm-text-secondary">{acct.account_number}</p>
                    </div>
                  </div>
                  <Badge status={acct.status} />
                </div>
                <p className="text-2xl font-bold dm-text mb-2">{formatCurrency(acct.balance)}</p>
                <div className="flex flex-wrap gap-3 text-xs dm-text-secondary">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Available: {formatCurrency(acct.available_balance)}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Interest: {formatCurrency(acct.accrued_interest)}
                  </span>
                  {acct.maturity_date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Matures {formatDate(acct.maturity_date)}
                      {acct.interest_rate ? ` · ${acct.interest_rate} p.a.` : ""}
                    </span>
                  )}
                  {acct.lien_amount ? (
                    <span className="flex items-center gap-1 text-[#d97706]">
                      <Lock className="w-3 h-3" /> Lien (loan security): {formatCurrency(acct.lien_amount)}
                    </span>
                  ) : null}
                  {acct.minimum_balance > 0 && !acct.lien_amount && !acct.maturity_date && (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Min. balance {formatCurrency(acct.minimum_balance)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold dm-text">
            Transaction History{account ? ` — ${shortName(account.product)}` : ""}
            <span className="ml-2 text-xs font-normal dm-text-secondary">{rows.length} shown</span>
          </h3>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="text-sm text-[#4A90D9] hover:underline">
              Show all
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={account ? `No transactions on ${shortName(account.product)}` : "No transactions yet"}
            hint={
              account?.code === "SV-FIX"
                ? "Fixed deposits have no movements until they mature."
                : account?.code === "SV-LGS"
                  ? "This account is held as security for your loan."
                  : "Deposits, transfers and withdrawals will appear here."
            }
            action={
              selected ? (
                <Button variant="secondary" onClick={() => setSelected(null)}>Show all transactions</Button>
              ) : (
                <Button variant="success" onClick={() => setModal("deposit")}>Make a deposit</Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b dm-border">
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Date</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Type</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Account</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Channel</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Amount</th>
                  <th className="text-center py-3 px-2 dm-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id} className="border-b dm-border last:border-0">
                    <td className="py-3 px-2 dm-text whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="py-3 px-2 dm-text">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", tx.direction === "credit" ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10")}>
                          {tx.direction === "credit" ? <ArrowDownRight className="w-3 h-3 text-[#22c55e]" /> : <ArrowUpRight className="w-3 h-3 text-[#ef4444]" />}
                        </div>
                        {tx.type}
                      </div>
                    </td>
                    <td className="py-3 px-2 dm-text-secondary">{tx.account}</td>
                    <td className="py-3 px-2 dm-text-secondary">{tx.channel}</td>
                    <td className={cn("py-3 px-2 text-right font-semibold whitespace-nowrap", tx.direction === "credit" ? "text-[#16a34a]" : "text-[#ef4444]")}>
                      {tx.direction === "credit" ? "+" : "−"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DepositModal open={modal === "deposit"} onClose={() => setModal(null)} defaultAccount={selected ?? undefined} />
      <StatementModal open={modal === "statement"} onClose={() => setModal(null)} defaultAccount={selected} />
      <TransferModal open={modal === "transfer"} onClose={() => setModal(null)} defaultFrom={selected} />
      <WithdrawModal open={modal === "withdraw"} onClose={() => setModal(null)} />
    </div>
  );
}
