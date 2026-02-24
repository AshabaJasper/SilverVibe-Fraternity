"use client";
import { formatCurrency } from "@/lib/utils";
import { MEMBER_LOANS, MEMBER_SAVINGS, MEMBER_SHARES, LOAN_SCHEDULE } from "@/lib/mock-data";
import {
  CreditCard, CheckCircle2, Clock, AlertCircle, Calculator,
  FileText, ChevronDown, ChevronUp, ArrowRight, Banknote,
  Calendar, Percent, Shield, TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export default function LoansPage() {
  const [showSchedule, setShowSchedule] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcAmount, setCalcAmount] = useState("5000000");
  const [calcMonths, setCalcMonths] = useState("12");
  const [calcRate, setCalcRate] = useState("18");

  const loan = MEMBER_LOANS[0];
  const totalSavings = MEMBER_SAVINGS.reduce((s, a) => s + a.balance, 0);
  const maxEligible = Math.min(totalSavings * 3, MEMBER_SHARES.total_value * 5);

  const calcMonthly = () => {
    const p = parseInt(calcAmount) || 0;
    const r = (parseInt(calcRate) || 0) / 100 / 12;
    const n = parseInt(calcMonths) || 1;
    if (r === 0) return p / n;
    return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const scheduleChartData = LOAN_SCHEDULE.map((s) => ({
    inst: `#${s.installment}`,
    principal: s.principal,
    interest: s.interest,
    status: s.status,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold dm-text">Loans</h1>
          <p className="dm-text-secondary text-sm">Manage your loan accounts and applications</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors">
          <CreditCard className="w-4 h-4" /> Apply for Loan
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-[#4A90D9]" />
            </div>
            <span className="text-sm dm-text-secondary">Outstanding</span>
          </div>
          <p className="text-2xl font-bold dm-text">{formatCurrency(loan.total_outstanding)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#22c55e]" />
            </div>
            <span className="text-sm dm-text-secondary">Repaid</span>
          </div>
          <p className="text-2xl font-bold text-[#22c55e]">{formatCurrency(loan.principal - loan.outstanding_principal)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <span className="text-sm dm-text-secondary">Next Payment</span>
          </div>
          <p className="text-2xl font-bold text-[#f59e0b]">{formatCurrency(loan.next_payment_amount)}</p>
          <p className="text-xs dm-text-secondary mt-1">Due: {loan.next_payment_date}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#a855f7]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#a855f7]" />
            </div>
            <span className="text-sm dm-text-secondary">Eligibility</span>
          </div>
          <p className="text-2xl font-bold text-[#a855f7]">{formatCurrency(maxEligible)}</p>
          <p className="text-xs dm-text-secondary mt-1">Max borrowable</p>
        </div>
      </div>

      {/* Active Loan Detail */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-2">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-semibold dm-text text-lg">{loan.product}</h3>
            <p className="text-sm dm-text-secondary">{loan.loan_number}</p>
          </div>
          <span className="px-3 py-1 bg-[#4A90D9]/10 text-[#4A90D9] rounded-full text-sm font-medium">
            {loan.status}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="dm-text-secondary">Repayment Progress</span>
            <span className="font-semibold dm-text">{loan.repayment_progress}%</span>
          </div>
          <div className="w-full bg-[#e2e8f0] rounded-full h-4">
            <div className="bg-gradient-to-r from-[#4A90D9] to-[#22c55e] h-4 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
              style={{ width: `${loan.repayment_progress}%` }}>
              <span className="text-[10px] font-bold text-white">{loan.payments_made}/{loan.total_payments}</span>
            </div>
          </div>
        </div>

        {/* Loan Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 dm-surface-hover rounded-xl">
          {[
            { label: "Principal", value: formatCurrency(loan.principal) },
            { label: "Interest Rate", value: loan.interest_rate },
            { label: "Method", value: loan.interest_method },
            { label: "Disbursed", value: loan.disbursement_date },
            { label: "Maturity", value: loan.maturity_date },
            { label: "Monthly", value: formatCurrency(loan.monthly_installment) },
            { label: "Days in Arrears", value: loan.days_in_arrears.toString() },
            { label: "Payments Left", value: (loan.total_payments - loan.payments_made).toString() },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs dm-text-secondary">{item.label}</p>
              <p className="text-sm font-semibold dm-text">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Chart */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-3">
        <h3 className="font-semibold dm-text mb-4">Repayment Breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scheduleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="inst" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1_000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }} />
              <Bar dataKey="principal" stackId="a" name="Principal" radius={[0, 0, 0, 0]}>
                {scheduleChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.status === "Paid" ? "#22c55e" : "#4A90D9"} />
                ))}
              </Bar>
              <Bar dataKey="interest" stackId="a" name="Interest" radius={[4, 4, 0, 0]}>
                {scheduleChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.status === "Paid" ? "#22c55e50" : "#4A90D950"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Amortization Schedule */}
      <div className="glass-card rounded-2xl p-6">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="flex items-center justify-between w-full mb-4"
        >
          <h3 className="font-semibold dm-text flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4A90D9]" /> Amortization Schedule
          </h3>
          {showSchedule ? <ChevronUp className="w-5 h-5 dm-text-secondary" /> : <ChevronDown className="w-5 h-5 dm-text-secondary" />}
        </button>
        {showSchedule && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dm-border">
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">#</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Due Date</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Principal</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Interest</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Total</th>
                  <th className="text-center py-3 px-2 dm-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {LOAN_SCHEDULE.map((s) => (
                  <tr key={s.installment} className={`border-b dm-border/50 ${s.status === "Paid" ? "bg-[#22c55e]/5" : ""}`}>
                    <td className="py-3 px-2 font-medium">{s.installment}</td>
                    <td className="py-3 px-2">{s.due_date}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(s.principal)}</td>
                    <td className="py-3 px-2 text-right dm-text-secondary">{formatCurrency(s.interest)}</td>
                    <td className="py-3 px-2 text-right font-semibold">{formatCurrency(s.total)}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === "Paid" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#f59e0b]/10 text-[#f59e0b]"
                      }`}>
                        {s.status === "Paid" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loan Calculator */}
      <div className="glass-card rounded-2xl p-6">
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="flex items-center justify-between w-full mb-4"
        >
          <h3 className="font-semibold dm-text flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#4A90D9]" /> Loan Calculator
          </h3>
          {showCalculator ? <ChevronUp className="w-5 h-5 dm-text-secondary" /> : <ChevronDown className="w-5 h-5 dm-text-secondary" />}
        </button>
        {showCalculator && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm dm-text-secondary mb-1 block">Loan Amount (UGX)</label>
                <input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)}
                  className="w-full border dm-border rounded-xl px-4 py-3 dm-text focus:outline-none focus:border-[#4A90D9] transition-colors" />
              </div>
              <div>
                <label className="text-sm dm-text-secondary mb-1 block">Period (Months)</label>
                <input type="number" value={calcMonths} onChange={(e) => setCalcMonths(e.target.value)}
                  className="w-full border dm-border rounded-xl px-4 py-3 dm-text focus:outline-none focus:border-[#4A90D9] transition-colors" />
              </div>
              <div>
                <label className="text-sm dm-text-secondary mb-1 block">Interest Rate (% p.a.)</label>
                <input type="number" value={calcRate} onChange={(e) => setCalcRate(e.target.value)}
                  className="w-full border dm-border rounded-xl px-4 py-3 dm-text focus:outline-none focus:border-[#4A90D9] transition-colors" />
              </div>
            </div>
            <div className="dm-surface-hover rounded-xl p-6 flex flex-col items-center justify-center">
              <p className="text-sm dm-text-secondary mb-2">Estimated Monthly Payment</p>
              <p className="text-3xl font-bold text-[#4A90D9]">{formatCurrency(Math.round(calcMonthly()))}</p>
              <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                <div className="text-center">
                  <p className="text-xs dm-text-secondary">Total Repayment</p>
                  <p className="text-sm font-semibold dm-text">
                    {formatCurrency(Math.round(calcMonthly() * (parseInt(calcMonths) || 1)))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs dm-text-secondary">Total Interest</p>
                  <p className="text-sm font-semibold text-[#ef4444]">
                    {formatCurrency(Math.round(calcMonthly() * (parseInt(calcMonths) || 1) - (parseInt(calcAmount) || 0)))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
