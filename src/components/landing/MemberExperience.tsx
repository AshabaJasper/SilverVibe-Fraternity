import Link from "next/link";
import { ArrowRight, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, container, eyebrow, focusRing, sectionLead, sectionTitle } from "./styles";

const EXPERIENCES = [
  {
    title: "Dashboard & net worth",
    body: "Savings, shares and loans in one view, with recent activity and upcoming repayments.",
    href: "/portal",
    preview: <DashboardPreview />,
  },
  {
    title: "Loans: apply, repay, schedule",
    body: "Check eligibility, apply online, follow approval and see every instalment ahead.",
    href: "/portal/loans",
    preview: <LoanPreview />,
  },
  {
    title: "Statements & certificates",
    body: "Download account statements and share certificates as PDFs, any time.",
    href: "/portal/savings",
    preview: <StatementPreview />,
  },
];

export function MemberExperience() {
  return (
    <section
      id="member-experience"
      aria-labelledby="member-experience-title"
      className="scroll-mt-20 border-t border-[#C0C0C0]/10 bg-[#121212] py-20 sm:py-24"
    >
      <div className={container}>
        <p className={eyebrow}>Member experience</p>
        <h2 id="member-experience-title" className={sectionTitle}>
          A self-service portal members actually use
        </h2>
        <p className={sectionLead}>
          Members check balances, apply for loans and pull official documents without visiting the office.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {EXPERIENCES.map((x) => (
            <Link
              key={x.title}
              href={x.href}
              className={cn(
                card,
                "group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#4A90D9]/40",
                focusRing,
              )}
            >
              {/* Decorative mini panel */}
              <div aria-hidden className="h-48 border-b border-[#C0C0C0]/10 bg-[#0f0f0f]/60 p-4">
                {x.preview}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-[#f5f5f5]">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">{x.body}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-[#4A90D9] group-hover:text-[#7fb2ea]">
                  Open in portal
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl bg-gradient-to-br from-[#262626] to-[#1c1c1c] p-3 ring-1 ring-[#C0C0C0]/10">
        <p className="text-[10px] text-[#a3a3a3]">Net worth</p>
        <p className="text-lg font-bold text-[#f5f5f5]">UGX 28.5M</p>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
          <span className="w-[62%] bg-[#4A90D9]" />
          <span className="w-[22%] bg-[#C0C0C0]" />
          <span className="w-[16%] bg-[#f59e0b]" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {[
          ["Savings", "27.7M", "text-[#22c55e]"],
          ["Shares", "5.0M", "text-[#C0C0C0]"],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-xl bg-[#1a1a1a] p-3 ring-1 ring-[#C0C0C0]/10">
            <p className="text-[10px] text-[#8a8a8a]">{l}</p>
            <p className={cn("text-sm font-semibold", c)}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoanPreview() {
  // Paid instalments are filled; the rest show the remaining schedule.
  const paid = 7;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl bg-[#1a1a1a] p-3 ring-1 ring-[#C0C0C0]/10">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#a3a3a3]">Development loan</p>
          <span className="rounded-full bg-[#22c55e]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#22c55e]">On track</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#f5f5f5]">UGX 4.18M outstanding</p>
        <div className="mt-2 h-1.5 rounded-full bg-[#f5f5f5]/[0.08]">
          <div className="h-full w-[58%] rounded-full bg-[#4A90D9]" />
        </div>
      </div>
      <div className="flex-1 rounded-xl bg-[#1a1a1a] p-3 ring-1 ring-[#C0C0C0]/10">
        <p className="text-[10px] text-[#8a8a8a]">Repayment schedule</p>
        <div className="mt-2 grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className={cn("h-4 rounded-sm", i < paid ? "bg-[#4A90D9]/70" : "bg-[#f5f5f5]/[0.08]")} />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#a3a3a3]">Next: UGX 350,000 · 15 Nov</p>
      </div>
    </div>
  );
}

function StatementPreview() {
  return (
    <div className="flex h-full flex-col gap-2">
      {[
        ["Savings statement · Oct 2026", "142 KB"],
        ["Share certificate · SC-0042", "88 KB"],
        ["Loan statement · LN-2041", "120 KB"],
      ].map(([name, size]) => (
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
