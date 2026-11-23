"use client";
// Landing-page mini panels whose text depends on the demo date (next loan
// installment, last month's statement). They render with ANCHOR on the server and
// on first paint, then switch to the demo clock after hydration — no mismatch.
import { Download, FileText } from "lucide-react";
import { addMonthsKey, monthLabel, monthShort, useDemoToday } from "@/lib/demo-clock";
import { LOAN_SCHEDULE, MEMBER_LOANS } from "@/lib/mock-data";
import { cn, formatCurrency } from "@/lib/utils";

const LOAN = MEMBER_LOANS[0];

/** James's loan as at `today`: installments due on or before today are paid by standing order. */
function loanAsAt(today: string) {
  const paid = LOAN_SCHEDULE.filter((s) => s.due_date <= today);
  const next = LOAN_SCHEDULE.find((s) => s.due_date > today) ?? null;
  const outstanding = paid.length ? paid[paid.length - 1].balance : LOAN.principal;
  const progress = Math.round(((LOAN.principal - outstanding) / LOAN.principal) * 100);
  return { paidCount: paid.length, next, outstanding, progress };
}

export function LoanPreview() {
  const today = useDemoToday();
  const { paidCount, next, outstanding, progress } = loanAsAt(today);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl bg-[#1a1a1a] p-3 ring-1 ring-[#C0C0C0]/10">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#a3a3a3]">{LOAN.product}</p>
          <span className="rounded-full bg-[#22c55e]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#22c55e]">On track</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#f5f5f5]">UGX {(outstanding / 1e6).toFixed(2)}M outstanding</p>
        <div className="mt-2 h-1.5 rounded-full bg-[#f5f5f5]/[0.08]">
          <div className="h-full rounded-full bg-[#4A90D9]" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex-1 rounded-xl bg-[#1a1a1a] p-3 ring-1 ring-[#C0C0C0]/10">
        <p className="text-[10px] text-[#8a8a8a]">Repayment schedule</p>
        <div className="mt-2 grid grid-cols-12 gap-1">
          {LOAN_SCHEDULE.map((s, i) => (
            <span key={s.installment} className={cn("h-4 rounded-sm", i < paidCount ? "bg-[#4A90D9]/70" : "bg-[#f5f5f5]/[0.08]")} />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#a3a3a3]">
          {next ? `Next: ${formatCurrency(next.total)} · ${Number(next.due_date.slice(8, 10))} ${monthShort(next.due_date)}` : "Fully repaid"}
        </p>
      </div>
    </div>
  );
}

export function StatementPreview() {
  const today = useDemoToday();
  // Statements are issued on the 1st for the month just ended.
  const files = [
    [`Savings statement · ${monthLabel(addMonthsKey(today, -1))}`, "142 KB"],
    ["Share certificate · SC-0042", "88 KB"],
    [`Loan statement · ${LOAN.loan_number}`, "120 KB"],
  ];
  return (
    <div className="flex h-full flex-col gap-2">
      {files.map(([name, size]) => (
        <div key={name} className="flex flex-1 items-center gap-3 rounded-xl bg-[#1a1a1a] px-3 ring-1 ring-[#C0C0C0]/10">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ef4444]/10">
            <FileText className="h-3.5 w-3.5 text-[#f87171]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-[#e5e5e5]">{name}</p>
            <p className="text-[10px] text-[#737373]">PDF · {size}</p>
          </div>
          <Download className="h-3.5 w-3.5 shrink-0 text-[#a3a3a3]" />
        </div>
      ))}
    </div>
  );
}
