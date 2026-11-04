import Link from "next/link";
import { ArrowRight, Calculator, ChartPie, Check, HandCoins, MessagesSquare, PiggyBank, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, container, eyebrow, focusRing, sectionLead, sectionTitle } from "./styles";

type Feature = {
  title: string;
  href: string;
  icon: LucideIcon;
  tint: string;
  value: string;
  bullets: [string, string, string];
};

const FEATURES: Feature[] = [
  {
    title: "Members & KYC",
    href: "/admin/members",
    icon: Users,
    tint: "text-[#4A90D9] bg-[#4A90D9]/10",
    value: "A complete, verified register of every member.",
    bullets: ["Onboarding with SV numbers", "KYC documents & verification status", "Active, dormant & exit tracking"],
  },
  {
    title: "Savings products",
    href: "/admin/savings",
    icon: PiggyBank,
    tint: "text-[#22c55e] bg-[#22c55e]/10",
    value: "Flexible accounts that reward consistent saving.",
    bullets: ["Ordinary, fixed & target savings", "Deposits, withdrawals & transfers", "Interest accrual per product"],
  },
  {
    title: "Loan lifecycle",
    href: "/admin/loans",
    icon: HandCoins,
    tint: "text-[#f59e0b] bg-[#f59e0b]/10",
    value: "From application to final repayment, fully tracked.",
    bullets: ["Applications, guarantors & approvals", "Disbursement & repayment schedules", "Arrears monitoring and PAR 30"],
  },
  {
    title: "Shares & dividends",
    href: "/admin/shares",
    icon: ChartPie,
    tint: "text-[#C0C0C0] bg-[#C0C0C0]/10",
    value: "Transparent ownership for a member-owned society.",
    bullets: ["Share purchases & transfers", "Share certificates", "Dividend declaration & payout"],
  },
  {
    title: "Accounting & reports",
    href: "/admin/accounting",
    icon: Calculator,
    tint: "text-[#a78bfa] bg-[#a78bfa]/10",
    value: "Books that balance and reports the board can trust.",
    bullets: ["Chart of accounts & journals", "Trial balance & financial statements", "Exportable PDF reports"],
  },
  {
    title: "Communications",
    href: "/admin/communications",
    icon: MessagesSquare,
    tint: "text-[#2dd4bf] bg-[#2dd4bf]/10",
    value: "Keep every member informed, on time.",
    bullets: ["Bulk SMS & email notices", "AGM and meeting announcements", "Repayment & contribution reminders"],
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-20 sm:py-24">
      <div className={container}>
        <p className={eyebrow}>Features</p>
        <h2 id="features-title" className={sectionTitle}>
          Everything a SACCO back office needs
        </h2>
        <p className={sectionLead}>
          Six integrated modules give management, the credit committee and the treasurer one source of truth.
        </p>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <article
                className={cn(
                  card,
                  "group flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#4A90D9]/40",
                )}
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", f.tint)}>
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[#f5f5f5]">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[#a3a3a3]">{f.value}</p>
                <ul className="mt-5 space-y-2.5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-[#d4d4d4]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  href={f.href}
                  aria-label={`Explore ${f.title}`}
                  className={cn(
                    "mt-auto inline-flex items-center gap-1.5 self-start rounded-md pt-6 text-sm font-semibold text-[#4A90D9] transition-colors hover:text-[#7fb2ea]",
                    focusRing,
                  )}
                >
                  Explore
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
