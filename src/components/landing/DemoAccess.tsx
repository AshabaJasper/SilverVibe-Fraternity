import Link from "next/link";
import { ArrowRight, Info, LayoutDashboard, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DEMO_CREDENTIALS } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { btnPrimary, btnSilver, card, container, eyebrow, focusRing, sectionLead, sectionTitle } from "./styles";

type Cred = { label: string; value: string };

const CARDS: { title: string; subtitle: string; icon: LucideIcon; href: string; cta: string; primary: boolean; creds: Cred[] }[] = [
  {
    title: "Admin dashboard",
    subtitle: "Staff view: members, approvals, accounting and reports.",
    icon: LayoutDashboard,
    href: "/admin/login",
    cta: "Sign in as admin",
    primary: false,
    creds: [
      { label: "Email", value: DEMO_CREDENTIALS.admin.email },
      { label: "Password", value: DEMO_CREDENTIALS.admin.password },
    ],
  },
  {
    title: "Member portal",
    subtitle: "Member view: balances, loans, statements and certificates.",
    icon: Users,
    href: "/portal/login",
    cta: "Sign in as member",
    primary: true,
    creds: [
      { label: "SV number", value: DEMO_CREDENTIALS.member.svNumber },
      { label: "Password", value: DEMO_CREDENTIALS.member.password },
      { label: "OTP phone", value: DEMO_CREDENTIALS.member.phone },
      { label: "OTP code", value: DEMO_CREDENTIALS.otp },
    ],
  },
];

export function DemoAccess() {
  return (
    <section id="demo-access" aria-labelledby="demo-access-title" className="scroll-mt-20 py-20 sm:py-24">
      <div className={container}>
        <p className={eyebrow}>Demo access</p>
        <h2 id="demo-access-title" className={sectionTitle}>
          Try it with demo credentials
        </h2>
        <p className={sectionLead}>Sign in as either role and explore every screen with realistic sample data.</p>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {CARDS.map((c) => (
            <article key={c.title} className={cn(card, "flex flex-col p-6 sm:p-8")}>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4A90D9]/10 text-[#4A90D9]">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-[#f5f5f5]">{c.title}</h3>
                  <p className="mt-1 text-sm text-[#a3a3a3]">{c.subtitle}</p>
                </div>
              </div>

              <dl className="mt-6 divide-y divide-[#C0C0C0]/10 rounded-xl border border-[#C0C0C0]/10 bg-[#0f0f0f]/60">
                {c.creds.map((cred) => (
                  // dl > div > (dt, dd) keeps valid markup; the copy button lives inside dd.
                  // Label stacks above the value on phones so long emails still fit.
                  <div key={cred.label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                    <dt className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-[#8a8a8a] sm:w-24">
                      {cred.label}
                    </dt>
                    <dd className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-[#f5f5f5]">{cred.value}</span>
                      <CopyButton value={cred.value} label={`${c.title} ${cred.label.toLowerCase()}`} />
                    </dd>
                  </div>
                ))}
              </dl>

              <Link
                href={c.href}
                className={cn(c.primary ? btnPrimary : btnSilver, "mt-6 self-start", focusRing)}
              >
                {c.cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 flex items-start gap-2.5 rounded-xl border border-[#4A90D9]/20 bg-[#4A90D9]/[0.06] px-4 py-3 text-sm text-[#cbd5e1]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4A90D9]" aria-hidden />
          <span>
            This is a working demo. Changes are saved in your browser only; use <strong className="text-[#f5f5f5]">Reset demo data</strong> in
            the account menu to start over.
          </span>
        </p>
      </div>
    </section>
  );
}
