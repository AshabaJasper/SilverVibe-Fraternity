import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, LayoutDashboard, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSilver, container, focusRing } from "./styles";

// Bar heights (%) for the decorative mini chart: monthly savings growth.
const BARS = [38, 52, 45, 61, 58, 72, 68, 84];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      {/* Soft glow accents; purely decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#4A90D9]/10 blur-3xl" />
        <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-[#C0C0C0]/[0.06] blur-3xl" />
      </div>

      <div className={cn(container, "relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-28")}>
        <div className="animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#C0C0C0]/15 bg-[#f5f5f5]/[0.03] px-3 py-1 text-xs font-medium text-[#C0C0C0]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#22c55e]" aria-hidden />
            Member-owned savings &amp; credit cooperative
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#f5f5f5] sm:text-5xl lg:text-6xl"
          >
            Savings. Loans. Shares.{" "}
            <span className="silver-text-gradient">One platform for every member.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#a3a3a3] sm:text-lg">
            SilverVibe Fraternity Cooperative Society Ltd, Kampala, runs its entire SACCO here: member onboarding
            and KYC, savings products, the loan lifecycle, share capital and dividends, accounting and
            communications, with a self-service portal for every member.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/portal" className={cn(btnPrimary, "px-6 py-3.5", focusRing)}>
              <Users className="h-4 w-4" aria-hidden />
              Member Portal
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/admin" className={cn(btnSilver, "px-6 py-3.5", focusRing)}>
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Admin Dashboard
            </Link>
          </div>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}

/** Decorative mini dashboard drawn with divs only (hidden from assistive tech). */
function ProductPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md animate-fade-in stagger-2 opacity-0 lg:max-w-none">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-[#4A90D9]/20 via-transparent to-[#C0C0C0]/10 blur-2xl" />
      <div className="relative rounded-3xl border border-[#C0C0C0]/15 bg-[#141414]/90 p-4 shadow-2xl shadow-black/50 sm:p-5">
        {/* Window chrome */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/70" />
          <span className="ml-3 h-2 w-28 rounded-full bg-[#f5f5f5]/[0.06]" />
        </div>

        {/* Net worth card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#262626] via-[#1d1d1d] to-[#262626] p-5 ring-1 ring-[#C0C0C0]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a3a3a3]">Net worth</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#f5f5f5] sm:text-3xl">UGX 28.5M</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2 py-1 text-[11px] font-semibold text-[#22c55e]">
              <TrendingUp className="h-3 w-3" />
              +8.4%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            {[
              ["Savings", "27.7M", "bg-[#4A90D9]"],
              ["Shares", "5.0M", "bg-[#C0C0C0]"],
              ["Loans", "4.2M", "bg-[#f59e0b]"],
            ].map(([label, value, dot]) => (
              <div key={label} className="rounded-lg bg-[#f5f5f5]/[0.04] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[#a3a3a3]">
                  <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                  {label}
                </div>
                <p className="mt-0.5 font-semibold text-[#e5e5e5]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="mt-4 rounded-2xl bg-[#1a1a1a] p-4 ring-1 ring-[#C0C0C0]/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#d4d4d4]">Savings growth</p>
            <p className="text-[11px] text-[#737373]">Last 8 months</p>
          </div>
          <div className="mt-4 flex h-24 items-end gap-2">
            {BARS.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-t-md",
                  i === BARS.length - 1 ? "bg-[#4A90D9]" : "bg-gradient-to-t from-[#4A90D9]/25 to-[#4A90D9]/55",
                )}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-4 space-y-2">
          <TxRow
            icon={<ArrowDownLeft className="h-4 w-4 text-[#22c55e]" />}
            tint="bg-[#22c55e]/10"
            title="Savings deposit · MTN MoMo"
            when="Today, 09:14"
            amount="+UGX 500,000"
            amountClass="text-[#22c55e]"
          />
          <TxRow
            icon={<ArrowUpRight className="h-4 w-4 text-[#4A90D9]" />}
            tint="bg-[#4A90D9]/10"
            title="Loan repayment · LN-2041"
            when="Yesterday"
            amount="-UGX 350,000"
            amountClass="text-[#e5e5e5]"
          />
        </div>
      </div>
    </div>
  );
}

function TxRow(props: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  when: string;
  amount: string;
  amountClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#1a1a1a] px-3 py-2.5 ring-1 ring-[#C0C0C0]/10">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", props.tint)}>{props.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#e5e5e5]">{props.title}</p>
        <p className="text-[11px] text-[#737373]">{props.when}</p>
      </div>
      <p className={cn("shrink-0 text-xs font-semibold tabular-nums", props.amountClass)}>{props.amount}</p>
    </div>
  );
}
