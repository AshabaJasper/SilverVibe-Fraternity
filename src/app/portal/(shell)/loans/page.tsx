"use client";
import { Suspense, useState } from "react";
import {
  CreditCard, CheckCircle2, Clock, Calculator, FileText, ChevronDown, ChevronUp, Banknote, Calendar,
  Shield, TrendingDown, Download, PartyPopper, ClipboardList, ArrowRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Button, FormField, SelectInput, TextInput } from "@/components/Modal";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { showToast } from "@/lib/storage";
import { generateLoanSchedulePdf } from "@/lib/pdf-reports";
import { cn, daysUntil, formatCurrency, formatDate, formatRelativeDays } from "@/lib/utils";
import { ACTIVE_LOAN, LOAN_PRODUCTS, MEMBER_INFO, monthlyInstallment, usePortalData } from "../_lib/usePortalData";
import ApplyLoanModal, { type LoanPrefill } from "../_components/ApplyLoanModal";
import RepayLoanModal from "../_components/RepayLoanModal";
import ActionParam from "../_components/ActionParam";

export default function LoansPage() {
  const {
    hydrated, today, schedule, applications, outstandingLoan, principalRepaid, nextPayment, daysToNextPayment, eligibility, paidCount,
  } = usePortalData();

  const [applyOpen, setApplyOpen] = useState(false);
  const [prefill, setPrefill] = useState<LoanPrefill | undefined>(undefined);
  const [repayOpen, setRepayOpen] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Calculator
  const [calcProduct, setCalcProduct] = useState<string>(LOAN_PRODUCTS[0].value);
  const [calcAmount, setCalcAmount] = useState("5000000");
  const [calcMonths, setCalcMonths] = useState("12");
  const [calcRate, setCalcRate] = useState("18");

  const fullyRepaid = outstandingLoan <= 0;
  const progress = schedule.length ? Math.round((paidCount / schedule.length) * 100) : 0;
  const maturity = schedule[schedule.length - 1]?.due_date ?? ACTIVE_LOAN.maturity_date;
  const overdue = schedule.filter((r) => r.status !== "Paid" && r.due_date < today);
  const arrearsDays = hydrated && overdue.length ? -daysUntil(overdue[0].due_date) : 0;

  const openApply = (p?: LoanPrefill) => {
    setPrefill(p);
    setApplyOpen(true);
  };

  // ---- calculator (parseFloat so decimal rates like 16.5% work)
  const p = parseFloat(calcAmount);
  const n = parseFloat(calcMonths);
  const rate = parseFloat(calcRate);
  const calcErrors = {
    amount: !(p > 0) ? "Enter an amount above zero" : null,
    months: !(n > 0) ? "Enter a period above zero" : !Number.isInteger(n) ? "Use whole months" : n > 60 ? "Maximum 60 months" : null,
    rate: !(rate >= 0) ? "Enter a rate of 0 or more" : rate > 60 ? "Rate looks too high" : null,
  };
  const calcValid = !calcErrors.amount && !calcErrors.months && !calcErrors.rate;
  const calcMonthly = calcValid ? monthlyInstallment(p, rate, n) : 0;
  const calcTotal = calcMonthly * (calcValid ? n : 0);
  const calcProductInfo = LOAN_PRODUCTS.find((x) => x.value === calcProduct) ?? LOAN_PRODUCTS[0];

  const chartData = schedule.map((s) => ({ inst: `#${s.installment}`, principal: s.principal, interest: s.interest, status: s.status }));

  const downloadSchedule = async () => {
    setPdfBusy(true);
    try {
      await generateLoanSchedulePdf(
        { loan_number: ACTIVE_LOAN.loan_number, product: ACTIVE_LOAN.product, principal: ACTIVE_LOAN.principal, interest_rate: ACTIVE_LOAN.interest_rate, member: `${MEMBER_INFO.name} (${MEMBER_INFO.sv})` },
        schedule
      );
      showToast("Repayment schedule downloaded");
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <ActionParam actions={{ apply: () => openApply(), repay: () => setRepayOpen(true) }} />
      </Suspense>

      <PageHeader
        title="Loans"
        subtitle="Manage your loan accounts and applications"
        actions={
          <>
            {!fullyRepaid && (
              <Button variant="secondary" onClick={() => setRepayOpen(true)}>
                <Banknote className="w-4 h-4" /> Make Repayment
              </Button>
            )}
            <Button variant="accent" onClick={() => openApply()}>
              <CreditCard className="w-4 h-4" /> Apply for Loan
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Banknote} color="#4A90D9" label="Outstanding" value={formatCurrency(outstandingLoan)} sub="Principal + scheduled interest" />
        <Kpi icon={TrendingDown} color="#22c55e" label="Principal Repaid" value={formatCurrency(principalRepaid)} sub={`of ${formatCurrency(ACTIVE_LOAN.principal)}`} />
        <Kpi
          icon={Calendar}
          color="#f59e0b"
          label="Next Payment"
          value={nextPayment ? formatCurrency(nextPayment.total) : "—"}
          sub={
            nextPayment
              ? `Due ${formatDate(nextPayment.due_date)}${daysToNextPayment !== null ? ` · ${formatRelativeDays(nextPayment.due_date)}` : ""}`
              : "No payments due"
          }
        />
        <Kpi icon={Shield} color="#a855f7" label="Eligibility" value={formatCurrency(eligibility)} sub="3× savings + shares" />
      </div>

      {/* Active loan */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h3 className="font-semibold dm-text text-lg">{ACTIVE_LOAN.product}</h3>
            <p className="text-sm dm-text-secondary">{ACTIVE_LOAN.loan_number}</p>
          </div>
          <Badge status={fullyRepaid ? "Closed" : overdue.length ? "Overdue" : "Active"} />
        </div>

        {fullyRepaid && (
          <div className="flex items-center gap-3 rounded-xl p-4 mb-6 bg-[#22c55e]/10 text-[#16a34a]">
            <PartyPopper className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Loan fully repaid</p>
              <p className="text-xs">Your guarantee savings lien will be released within 2 working days. You can apply for a new loan any time.</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="dm-text-secondary">Repayment progress</span>
            <span className="font-semibold dm-text">
              {paidCount}/{schedule.length} installments · {progress}%
            </span>
          </div>
          <div className="w-full rounded-full h-4" style={{ backgroundColor: "var(--dm-border)" }}>
            <div className="bg-gradient-to-r from-[#4A90D9] to-[#22c55e] h-4 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 dm-surface-hover rounded-xl">
          {[
            { label: "Principal", value: formatCurrency(ACTIVE_LOAN.principal) },
            { label: "Interest rate", value: `${ACTIVE_LOAN.interest_rate} p.a.` },
            { label: "Method", value: ACTIVE_LOAN.interest_method },
            { label: "Disbursed", value: formatDate(ACTIVE_LOAN.disbursement_date) },
            { label: "Maturity", value: formatDate(maturity) },
            { label: "Monthly installment", value: formatCurrency(ACTIVE_LOAN.monthly_installment) },
            { label: "Days in arrears", value: String(arrearsDays) },
            { label: "Payments left", value: String(schedule.length - paidCount) },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs dm-text-secondary">{item.label}</p>
              <p className="text-sm font-semibold dm-text">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* My applications */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-semibold dm-text flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#4A90D9]" /> My Applications
          </h3>
          {applications.length > 0 && <span className="text-xs dm-text-secondary">{applications.length} submitted</span>}
        </div>
        {applications.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No loan applications yet"
            hint="Applications you submit appear here with their review status."
            action={<Button variant="accent" onClick={() => openApply()}>Apply for a loan</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b dm-border">
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Applied</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Product</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Amount</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Term</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Guarantors</th>
                  <th className="text-center py-3 px-2 dm-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-b dm-border last:border-0" title={a.purpose}>
                    <td className="py-3 px-2 dm-text whitespace-nowrap">{formatDate(a.applied_date)}</td>
                    <td className="py-3 px-2 dm-text">{a.product}</td>
                    <td className="py-3 px-2 text-right font-semibold dm-text whitespace-nowrap">{formatCurrency(a.amount)}</td>
                    <td className="py-3 px-2 dm-text-secondary">{a.term} months</td>
                    <td className="py-3 px-2 dm-text-secondary">{a.guarantors.join(", ")}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Breakdown chart */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold dm-text">Repayment Breakdown</h3>
          <div className="flex items-center gap-3 text-xs dm-text-secondary">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Paid</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#4A90D9]" /> Upcoming</span>
            <span>(lighter = interest)</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border)" />
              <XAxis dataKey="inst" tick={{ fontSize: 11, fill: "var(--dm-text-secondary)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--dm-text-secondary)" }} tickFormatter={(v) => `${(v / 1_000).toFixed(0)}K`} width={48} />
              <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]} />
              <Bar dataKey="principal" stackId="a" name="Principal">
                {chartData.map((e) => (
                  <Cell key={e.inst} fill={e.status === "Paid" ? "#22c55e" : "#4A90D9"} />
                ))}
              </Bar>
              <Bar dataKey="interest" stackId="a" name="Interest" radius={[4, 4, 0, 0]}>
                {chartData.map((e) => (
                  <Cell key={e.inst} fill={e.status === "Paid" ? "#22c55e80" : "#4A90D980"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Schedule */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button type="button" onClick={() => setShowSchedule((v) => !v)} aria-expanded={showSchedule} className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4A90D9]" />
            <h3 className="font-semibold dm-text">Amortization Schedule</h3>
            {showSchedule ? <ChevronUp className="w-5 h-5 dm-text-secondary" /> : <ChevronDown className="w-5 h-5 dm-text-secondary" />}
          </button>
          <Button variant="secondary" onClick={downloadSchedule} disabled={pdfBusy}>
            <Download className="w-4 h-4" /> {pdfBusy ? "Generating…" : "Download schedule"}
          </Button>
        </div>
        {showSchedule && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b dm-border">
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">#</th>
                  <th className="text-left py-3 px-2 dm-text-secondary font-medium">Due date</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Principal</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Interest</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Total</th>
                  <th className="text-right py-3 px-2 dm-text-secondary font-medium">Balance after</th>
                  <th className="text-center py-3 px-2 dm-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s) => (
                  <tr key={s.installment} className={cn("border-b dm-border last:border-0 dm-text", s.status === "Paid" && "bg-[#22c55e]/5")}>
                    <td className="py-3 px-2 font-medium">{s.installment}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatDate(s.due_date)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(s.principal)}</td>
                    <td className="py-3 px-2 text-right dm-text-secondary">{formatCurrency(s.interest)}</td>
                    <td className="py-3 px-2 text-right font-semibold">{formatCurrency(s.total)}</td>
                    <td className="py-3 px-2 text-right dm-text-secondary">{formatCurrency(s.balance)}</td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          s.status === "Paid" ? "bg-[#22c55e]/10 text-[#16a34a]" : "bg-[#f59e0b]/10 text-[#d97706]"
                        )}
                      >
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

      {/* Calculator */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold dm-text flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#4A90D9]" /> Loan Calculator
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField label="Product">
              <SelectInput
                value={calcProduct}
                onChange={(v) => {
                  setCalcProduct(v);
                  const prod = LOAN_PRODUCTS.find((x) => x.value === v);
                  if (prod) {
                    setCalcRate(String(prod.rate));
                    if (parseFloat(calcMonths) > prod.maxTerm) setCalcMonths(String(prod.maxTerm));
                  }
                }}
                options={LOAN_PRODUCTS.map((x) => ({ value: x.value, label: x.label }))}
              />
            </FormField>
            <FormField label="Loan amount (UGX)" error={calcErrors.amount}>
              <TextInput value={calcAmount} onChange={setCalcAmount} type="number" min={1} step={50000} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Period (months)" error={calcErrors.months}>
                <TextInput value={calcMonths} onChange={setCalcMonths} type="number" min={1} max={60} />
              </FormField>
              <FormField label="Interest rate (% p.a.)" error={calcErrors.rate}>
                <TextInput value={calcRate} onChange={setCalcRate} type="number" min={0} step={0.1} />
              </FormField>
            </div>
          </div>
          <div className="dm-surface-hover rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm dm-text-secondary mb-2">Estimated monthly payment</p>
            <p className="text-3xl font-bold text-[#4A90D9]">{calcValid ? formatCurrency(calcMonthly) : "—"}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 w-full">
              <div>
                <p className="text-xs dm-text-secondary">Total repayment</p>
                <p className="text-sm font-semibold dm-text">{calcValid ? formatCurrency(calcTotal) : "—"}</p>
              </div>
              <div>
                <p className="text-xs dm-text-secondary">Total interest</p>
                <p className="text-sm font-semibold text-[#ef4444]">{calcValid ? formatCurrency(calcTotal - p) : "—"}</p>
              </div>
            </div>
            {calcValid && p > eligibility && <p className="text-xs text-[#d97706] mt-3">Above your current limit of {formatCurrency(eligibility)}.</p>}
            {calcValid && n > calcProductInfo.maxTerm && <p className="text-xs text-[#d97706] mt-3">{calcProductInfo.value} allows up to {calcProductInfo.maxTerm} months.</p>}
            <Button
              variant="accent"
              className="mt-5"
              disabled={!calcValid}
              onClick={() => openApply({ product: calcProduct, amount: Math.round(p), term: Math.round(n) })}
            >
              Apply with these terms <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <ApplyLoanModal open={applyOpen} onClose={() => setApplyOpen(false)} prefill={prefill} />
      <RepayLoanModal open={repayOpen} onClose={() => setRepayOpen(false)} />
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value, sub }: { icon: React.ElementType; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm dm-text-secondary">{label}</span>
      </div>
      <p className="text-2xl font-bold dm-text">{value}</p>
      {sub && <p className="text-xs dm-text-secondary mt-1">{sub}</p>}
    </div>
  );
}
