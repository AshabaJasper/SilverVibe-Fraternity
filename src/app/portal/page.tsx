"use client";
import { useState } from "react";
import { formatCurrency, getGreeting } from "@/lib/utils";
import {
  DEMO_MEMBER,
  MEMBER_SAVINGS,
  MEMBER_LOANS,
  MEMBER_SHARES,
  MEMBER_IU,
  RECENT_TRANSACTIONS,
  ANNOUNCEMENTS,
  SAVINGS_HISTORY,
  NOTIFICATIONS_DATA,
} from "@/lib/mock-data";
import {
  PiggyBank,
  CreditCard,
  BarChart3,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Flame,
  FileText,
  Phone,
  UserCog,
  ChevronRight,
  Megaphone,
  Clock,
  Hand,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Modal, { FormField, TextInput, SelectInput } from "@/components/Modal";
import { usePersistedState, showToast } from "@/lib/storage";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
  href,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  subtext?: string;
  href: string;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in group block"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <ChevronRight className="w-4 h-4 text-[#C0C0C0]/40 group-hover:text-[#4A90D9] transition-colors" />
      </div>
      <p className="text-sm dm-text-secondary mb-1">{label}</p>
      <p className="text-xl font-bold dm-text animate-count-up">{value}</p>
      {subtext && <p className="text-xs dm-text-secondary mt-1">{subtext}</p>}
    </Link>
  );
}

export default function MemberDashboard() {
  const totalSavings = MEMBER_SAVINGS.reduce((s, a) => s + a.balance, 0);
  const totalNetWorth = totalSavings + MEMBER_SHARES.total_value + MEMBER_IU.current_value;
  const loanOutstanding = MEMBER_LOANS.reduce((s, l) => s + l.total_outstanding, 0);

  // Modal states
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  // Deposit form state
  const [depositAccount, setDepositAccount] = useState(MEMBER_SAVINGS[0].account_number);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositChannel, setDepositChannel] = useState("Mobile Money");

  // Loan form state
  const [loanProduct, setLoanProduct] = useState("Short-Term Loan");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanTerm, setLoanTerm] = useState("12 months");
  const [loanPurpose, setLoanPurpose] = useState("");

  // Persisted transactions
  const [transactions, setTransactions] = usePersistedState<
    {
      id: string;
      date: string;
      type: string;
      account: string;
      amount: number;
      channel: string;
      status: string;
      direction: string;
    }[]
  >("portal_transactions", []);

  const allTransactions = [...transactions, ...RECENT_TRANSACTIONS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    const account = MEMBER_SAVINGS.find((a) => a.account_number === depositAccount);
    const newTx = {
      id: `t-custom-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      type: "Deposit",
      account: account?.product.replace("SilverVibe ", "") ?? depositAccount,
      amount,
      channel: depositChannel,
      status: "Posted",
      direction: "credit",
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Deposit of ${formatCurrency(amount)} submitted successfully`, "success");
    setDepositAmount("");
    setDepositChannel("Mobile Money");
    setDepositAccount(MEMBER_SAVINGS[0].account_number);
    setDepositModalOpen(false);
  };

  const handleLoanApplication = () => {
    const amount = parseFloat(loanAmount);
    if (!amount || amount <= 0) {
      showToast("Please enter a valid loan amount", "error");
      return;
    }
    if (!loanPurpose.trim()) {
      showToast("Please enter the purpose of the loan", "error");
      return;
    }
    showToast(`Loan application for ${formatCurrency(amount)} submitted successfully`, "success");
    setLoanAmount("");
    setLoanPurpose("");
    setLoanProduct("Short-Term Loan");
    setLoanTerm("12 months");
    setLoanModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold dm-text">
            {getGreeting()}, James <Hand className="inline w-7 h-7 ml-1 text-[#f59e0b]" />
          </h1>
          <p className="dm-text-secondary mt-1">
            Here&apos;s your financial overview at SilverVibe Fraternity
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm dm-text-secondary">
          <span className="text-[#22c55e] font-semibold">SV-0042</span>
          <span className="px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-full text-xs font-medium">
            Active
          </span>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="silver-gradient rounded-2xl p-6 md:p-8 relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C0C0C0]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#4A90D9]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-[#C0C0C0]/60 text-sm mb-1">Total Net Worth</p>
          <p className="text-3xl md:text-4xl font-bold text-white animate-count-up">
            {formatCurrency(totalNetWorth)}
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="dm-surface/5 rounded-xl px-4 py-2 border border-white/10">
              <p className="text-[#C0C0C0]/50 text-xs">Savings</p>
              <p className="text-white font-semibold">{formatCurrency(totalSavings)}</p>
            </div>
            <div className="dm-surface/5 rounded-xl px-4 py-2 border border-white/10">
              <p className="text-[#C0C0C0]/50 text-xs">Share Capital</p>
              <p className="text-white font-semibold">{formatCurrency(MEMBER_SHARES.total_value)}</p>
            </div>
            <div className="dm-surface/5 rounded-xl px-4 py-2 border border-white/10">
              <p className="text-[#C0C0C0]/50 text-xs">Investments</p>
              <p className="text-white font-semibold">{formatCurrency(MEMBER_IU.current_value)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Savings"
          value={formatCurrency(totalSavings)}
          icon={PiggyBank}
          color="#1A1A1A"
          subtext={`${MEMBER_SAVINGS.length} accounts`}
          href="/portal/savings"
          delay={100}
        />
        <StatCard
          label="Loan Outstanding"
          value={formatCurrency(loanOutstanding)}
          icon={CreditCard}
          color="#4A90D9"
          subtext={`${MEMBER_LOANS.length} active loan`}
          href="/portal/loans"
          delay={200}
        />
        <StatCard
          label="Share Capital"
          value={formatCurrency(MEMBER_SHARES.total_value)}
          icon={BarChart3}
          color="#22c55e"
          subtext={`${MEMBER_SHARES.num_shares} shares`}
          href="/portal/shares"
          delay={300}
        />
        <StatCard
          label="Investment Units"
          value={formatCurrency(MEMBER_IU.current_value)}
          icon={TrendingUp}
          color="#a855f7"
          subtext={`${MEMBER_IU.unit_balance} units`}
          href="/portal/shares"
          delay={400}
        />
      </div>

      {/* Savings Progress & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Progress */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text">Monthly Target</h3>
            <div className="flex items-center gap-1 text-[#f59e0b]">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-semibold">6 months</span>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="dm-text-secondary">Regular Savings</span>
              <span className="font-semibold dm-text">
                {formatCurrency(200_000)} / {formatCurrency(200_000)}
              </span>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: "var(--dm-border)" }}>
              <div
                className="bg-[#22c55e] h-3 rounded-full transition-all duration-1000"
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <p className="text-xs text-[#22c55e] font-medium flex items-center gap-1.5 mt-3">
            <Flame className="w-3.5 h-3.5" /> 6-month contribution streak! Keep it up!
          </p>
        </div>

        {/* Financial Health */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-3">
          <h3 className="font-semibold dm-text mb-4">Financial Health</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--dm-border)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="10"
                  strokeDasharray={`${82 * 3.14} ${100 * 3.14}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-[#22c55e]">82</span>
                  <p className="text-xs dm-text-secondary">Score</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "Savings Consistency", score: 95, color: "#22c55e" },
              { label: "Loan Repayment", score: 88, color: "#4A90D9" },
              { label: "Share Growth", score: 65, color: "#f59e0b" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs dm-text-secondary w-32">{item.label}</span>
                <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: "var(--dm-border)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.color }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: item.color }}>{item.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-4">
          <h3 className="font-semibold dm-text mb-4 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#4A90D9]" /> Upcoming
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[#4A90D9]/5 rounded-xl border border-[#4A90D9]/10">
              <div className="w-8 h-8 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-[#4A90D9]" />
              </div>
              <div>
                <p className="text-sm font-medium dm-text">Loan Repayment</p>
                <p className="text-xs dm-text-secondary">{formatCurrency(740_000)} due Mar 1</p>
                <p className="text-xs text-[#4A90D9] font-medium mt-1">16 days away</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#22c55e]/5 rounded-xl border border-[#22c55e]/10">
              <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <PiggyBank className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-sm font-medium dm-text">Savings Due</p>
                <p className="text-xs dm-text-secondary">{formatCurrency(200_000)} due Mar 1</p>
                <p className="text-xs text-[#22c55e] font-medium mt-1">16 days away</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#f59e0b]/5 rounded-xl border border-[#f59e0b]/10">
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-sm font-medium dm-text">Fixed Deposit Maturity</p>
                <p className="text-xs dm-text-secondary">{formatCurrency(10_000_000)} on Aug 15</p>
                <p className="text-xs text-[#f59e0b] font-medium mt-1">6 months away</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-3">
        {[
          { label: "Quick Deposit", icon: Wallet, action: () => setDepositModalOpen(true), color: "#22c55e" },
          { label: "Apply for Loan", icon: CreditCard, action: () => setLoanModalOpen(true), color: "#4A90D9" },
          { label: "View Statement", icon: FileText, href: "/portal/savings", color: "#1A1A1A" },
          { label: "Contact Support", icon: Phone, href: "/portal/support", color: "#a855f7" },
        ].map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${action.color}10` }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-medium dm-text text-center">{action.label}</span>
            </Link>
          ) : (
            <button
              key={action.label}
              onClick={action.action}
              className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${action.color}10` }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-medium dm-text text-center">{action.label}</span>
            </button>
          )
        )}
      </div>

      {/* Charts & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Savings Growth Chart */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-4">
          <h3 className="font-semibold dm-text mb-4">Savings Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SAVINGS_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]}
                  contentStyle={{
                    backgroundColor: "var(--dm-surface)",
                    border: "1px solid var(--dm-border)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    color: "var(--dm-text)",
                  }}
                />
                <Line type="monotone" dataKey="regular" stroke="#1A1A1A" strokeWidth={2} dot={{ r: 3 }} name="Regular" />
                <Line type="monotone" dataKey="flexi" stroke="#4A90D9" strokeWidth={2} dot={{ r: 3 }} name="Flexi" />
                <Line type="monotone" dataKey="fixed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Fixed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dm-text">Recent Transactions</h3>
            <Link href="/portal/savings" className="text-sm text-[#4A90D9] hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {allTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors" style={{ backgroundColor: "transparent" }}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  tx.direction === "credit" ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
                }`}>
                  {tx.direction === "credit" ? (
                    <ArrowDownRight className="w-4 h-4 text-[#22c55e]" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dm-text truncate">{tx.type}</p>
                  <p className="text-xs dm-text-secondary">{tx.account} · {tx.date}</p>
                </div>
                <p className={`text-sm font-semibold ${
                  tx.direction === "credit" ? "text-[#22c55e]" : "text-[#ef4444]"
                }`}>
                  {tx.direction === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-5">
        <h3 className="font-semibold dm-text mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#4A90D9]" /> Announcements
        </h3>
        <div className="space-y-3">
          {ANNOUNCEMENTS.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded-xl border ${
                ann.priority === "high"
                  ? "bg-[#4A90D9]/5 border-[#4A90D9]/15"
                  : "dm-surface-hover dm-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold dm-text">{ann.title}</h4>
                  <p className="text-xs dm-text-secondary mt-1 line-clamp-2">{ann.content}</p>
                </div>
                <span className="text-xs dm-text-secondary whitespace-nowrap">{ann.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Deposit Modal */}
      <Modal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        title="Quick Deposit"
        footer={
          <>
            <button
              onClick={() => setDepositModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] transition-colors"
            >
              Submit Deposit
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Account" required>
            <SelectInput
              value={depositAccount}
              onChange={setDepositAccount}
              options={MEMBER_SAVINGS.map((a) => ({
                value: a.account_number,
                label: `${a.product} (${a.account_number})`,
              }))}
            />
          </FormField>
          <FormField label="Amount (UGX)" required>
            <TextInput
              value={depositAmount}
              onChange={setDepositAmount}
              placeholder="e.g. 200000"
              type="number"
            />
          </FormField>
          <FormField label="Channel" required>
            <SelectInput
              value={depositChannel}
              onChange={setDepositChannel}
              options={[
                { value: "Mobile Money", label: "Mobile Money" },
                { value: "Bank Transfer", label: "Bank Transfer" },
                { value: "Cash", label: "Cash" },
              ]}
            />
          </FormField>
        </div>
      </Modal>

      {/* Loan Application Modal */}
      <Modal
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title="Apply for Loan"
        footer={
          <>
            <button
              onClick={() => setLoanModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLoanApplication}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4A90D9] hover:bg-[#3a7bc8] transition-colors"
            >
              Submit Application
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Loan Product" required>
            <SelectInput
              value={loanProduct}
              onChange={setLoanProduct}
              options={[
                { value: "Short-Term Loan", label: "Short-Term Loan" },
                { value: "Business Loan", label: "Business Loan" },
                { value: "Emergency Loan", label: "Emergency Loan" },
              ]}
            />
          </FormField>
          <FormField label="Amount (UGX)" required>
            <TextInput
              value={loanAmount}
              onChange={setLoanAmount}
              placeholder="e.g. 5000000"
              type="number"
            />
          </FormField>
          <FormField label="Term" required>
            <SelectInput
              value={loanTerm}
              onChange={setLoanTerm}
              options={[
                { value: "3 months", label: "3 months" },
                { value: "6 months", label: "6 months" },
                { value: "12 months", label: "12 months" },
                { value: "24 months", label: "24 months" },
                { value: "36 months", label: "36 months" },
              ]}
            />
          </FormField>
          <FormField label="Purpose" required>
            <TextInput
              value={loanPurpose}
              onChange={setLoanPurpose}
              placeholder="e.g. Business expansion, school fees..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}