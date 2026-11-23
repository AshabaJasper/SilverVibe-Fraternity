import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, container, eyebrow, focusRing, sectionLead, sectionTitle } from "./styles";
// Date-dependent previews are client components that follow the demo clock after hydration.
import { LoanPreview, StatementPreview } from "./TimelinePreviews";

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
