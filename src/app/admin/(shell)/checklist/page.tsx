"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2, Circle, ChevronDown, Users, PiggyBank, Landmark, BarChart3, BookOpen,
  Megaphone, FileBarChart, Settings, Smartphone, Sparkles, Server, ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { PageHeader, Tabs, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

type Status = "done" | "planned";

interface Feature {
  name: string;
  status: Status;
  /** Where to see it in the demo. */
  href?: string;
  note?: string;
}

interface Module {
  title: string;
  icon: LucideIcon;
  color: string;
  /** Shown above the feature list when the module is expanded. */
  note?: string;
  features: Feature[];
}

// Inventory of the showcase build. "done" = working in this frontend demo
// (data persisted in the browser). "planned" = needs the backend phase.
const MODULES: Module[] = [
  {
    title: "Member Management",
    icon: Users,
    color: "#4A90D9",
    features: [
      { name: "Register members with auto SV numbering and validation", status: "done", href: "/admin/members?action=register" },
      { name: "Edit, view profile, remove (with confirmation)", status: "done", href: "/admin/members" },
      { name: "KYC verification and status management (active / dormant / suspended)", status: "done", href: "/admin/members" },
      { name: "Search, status filters, bulk select", status: "done", href: "/admin/members" },
      { name: "CSV export (all, filtered or selected)", status: "done", href: "/admin/members" },
      { name: "Member statement PDF", status: "done", href: "/admin/members" },
    ],
  },
  {
    title: "Savings",
    icon: PiggyBank,
    color: "#22c55e",
    features: [
      { name: "Savings products: configure and add", status: "done", href: "/admin/savings?tab=products" },
      { name: "Deposits, withdrawals and transfers with member picker", status: "done", href: "/admin/savings?tab=transactions" },
      { name: "Maker-checker: large withdrawals need posting", status: "done", href: "/admin/savings?tab=transactions" },
      { name: "Reverse posted transactions", status: "done", href: "/admin/savings?tab=transactions" },
      { name: "Live KPIs and charts computed from transactions", status: "done", href: "/admin/savings" },
    ],
  },
  {
    title: "Loans",
    icon: Landmark,
    color: "#f59e0b",
    features: [
      { name: "New application with credit score, guarantors and product limits", status: "done", href: "/admin/loans?action=new" },
      { name: "Review, approve (with note) and decline (with reason)", status: "done", href: "/admin/loans?tab=applications" },
      { name: "Disbursement into active loans", status: "done", href: "/admin/loans?tab=applications" },
      { name: "Reducing-balance schedules, repayment recording, PDF schedule", status: "done", href: "/admin/loans?tab=active" },
      { name: "Loan products: edit and add", status: "done", href: "/admin/loans?tab=products" },
      { name: "Portfolio quality and PAR overview", status: "done", href: "/admin/loans" },
    ],
  },
  {
    title: "Shares & Dividends",
    icon: BarChart3,
    color: "#a855f7",
    features: [
      { name: "Issue and transfer shares with holding limits", status: "done", href: "/admin/shares?tab=shareholders" },
      { name: "Share certificate PDF", status: "done", href: "/admin/shares?tab=shareholders" },
      { name: "Declare dividends and mark paid", status: "done", href: "/admin/shares?tab=dividends" },
      { name: "Investment units: buy and redeem", status: "done", href: "/admin/shares?tab=units" },
    ],
  },
  {
    title: "Accounting",
    icon: BookOpen,
    color: "#0ea5e9",
    features: [
      { name: "Chart of accounts and journal entries (draft, post, reverse)", status: "done", href: "/admin/accounting?tab=journal" },
      { name: "Trial balance computed from posted entries", status: "done", href: "/admin/accounting?tab=trial" },
      { name: "Income statement, balance sheet, cash flow previews and PDFs", status: "done", href: "/admin/accounting?tab=statements" },
    ],
  },
  {
    title: "Communications",
    icon: Megaphone,
    color: "#ef4444",
    features: [
      { name: "Announcements: send, edit, duplicate, delete", status: "done", href: "/admin/communications" },
      { name: "Compose SMS / email / push with recipient counts and SMS segments", status: "done", href: "/admin/communications?tab=compose" },
      { name: "Schedule messages and save drafts", status: "done", href: "/admin/communications?tab=compose" },
      { name: "Message templates with placeholders", status: "done", href: "/admin/communications?tab=templates" },
      { name: "Sent history and admin notifications", status: "done", href: "/admin/communications?tab=history" },
    ],
  },
  {
    title: "Reports",
    icon: FileBarChart,
    color: "#64748b",
    features: [
      { name: "18-report catalogue with PDF generation", status: "done", href: "/admin/reports" },
      { name: "CSV exports, preview and print", status: "done", href: "/admin/reports" },
      { name: "Report schedules (frequency, recipients, enable/disable)", status: "done", href: "/admin/reports?tab=scheduled" },
    ],
  },
  {
    title: "Administration",
    icon: Settings,
    color: "#64748b",
    features: [
      { name: "System users with 2FA, reset password, activate/deactivate", status: "done", href: "/admin/settings?tab=users" },
      { name: "Roles and permission matrix", status: "done", href: "/admin/settings?tab=roles" },
      { name: "Audit log with filters and CSV export", status: "done", href: "/admin/settings?tab=audit" },
      { name: "System settings and on-demand backup", status: "done", href: "/admin/settings?tab=system" },
    ],
  },
  {
    title: "Member Portal",
    icon: Smartphone,
    color: "#4A90D9",
    note: "“Try it” links open the member portal, which needs the member sign-in: SV-0042 / member123.",
    features: [
      { name: "Sign in with password or phone OTP", status: "done", href: "/portal/login" },
      { name: "Dashboard: net worth, health score, quick deposit", status: "done", href: "/portal" },
      { name: "Savings: transfers, withdrawal requests, statement PDF/CSV", status: "done", href: "/portal/savings" },
      { name: "Loans: apply (visible to admin), repay, calculator, schedule PDF", status: "done", href: "/portal/loans" },
      { name: "Shares: buy shares and units, certificate PDFs", status: "done", href: "/portal/shares" },
      { name: "Profile: edit details, photo, next of kin, beneficiaries, KYC uploads, security", status: "done", href: "/portal/profile" },
      { name: "Notifications and support tickets", status: "done", href: "/portal/notifications" },
    ],
  },
  {
    title: "Platform & Experience",
    icon: Sparkles,
    color: "#f59e0b",
    features: [
      { name: "Route guards with demo sessions and sign-out", status: "done" },
      { name: "Dark mode across every page", status: "done" },
      { name: "Global search (Ctrl + K) including members", status: "done" },
      { name: "Live notification badges shared between header and pages", status: "done" },
      { name: "Reset demo data", status: "done" },
      { name: "Responsive layout for phones and tablets", status: "done" },
    ],
  },
  {
    title: "Backend (next phase)",
    icon: Server,
    color: "#94a3b8",
    features: [
      { name: "PostgreSQL database and API (e.g. Supabase)", status: "planned" },
      { name: "Real authentication, sessions and server-side permissions", status: "planned" },
      { name: "SMS and email gateways (Africa's Talking, Resend)", status: "planned" },
      { name: "Mobile Money collections and disbursements", status: "planned" },
      { name: "Server-side audit trail and maker-checker engine", status: "planned" },
      { name: "Scheduled jobs: interest accrual, penalties, report delivery", status: "planned" },
      { name: "Multi-branch / multi-tenant support", status: "planned" },
    ],
  },
];

type Filter = "all" | Status;

/** Module subtitle that matches the active filter: "7 planned", "6 working", "6 of 6 working". */
function moduleCount(filter: Filter, done: number, total: number) {
  if (filter === "planned") return `${total} planned`;
  if (filter === "done") return `${total} working`;
  if (done === 0) return `${total} planned`;
  return `${done} of ${total} working`;
}

export default function ChecklistPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set(MODULES.map((m) => m.title)));

  const all = MODULES.flatMap((m) => m.features);
  const done = all.filter((f) => f.status === "done").length;
  const planned = all.length - done;
  const pct = Math.round((done / all.length) * 100);

  const visible = useMemo(
    () =>
      MODULES.map((m) => ({ ...m, features: filter === "all" ? m.features : m.features.filter((f) => f.status === filter) })).filter(
        (m) => m.features.length > 0
      ),
    [filter]
  );

  const toggle = (title: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Feature Checklist"
        subtitle="What this showcase build covers, and what the backend phase adds"
        actions={
          <>
            <button onClick={() => setOpen(new Set(MODULES.map((m) => m.title)))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border dm-border text-xs font-medium dm-text hover:dm-surface-hover">
              <ChevronsUpDown className="w-3.5 h-3.5" /> Expand all
            </button>
            <button onClick={() => setOpen(new Set())} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border dm-border text-xs font-medium dm-text hover:dm-surface-hover">
              <ChevronsDownUp className="w-3.5 h-3.5" /> Collapse all
            </button>
          </>
        }
      />

      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold dm-text">Frontend demo complete; backend planned</p>
            <p className="text-xs dm-text-secondary mt-1">
              {done} working features · {planned} planned for the backend phase · {MODULES.length} modules
            </p>
          </div>
          <p className="text-3xl font-bold dm-text">{pct}%</p>
        </div>
        <div className="h-3 rounded-full dm-surface-hover overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#4A90D9] to-[#22c55e] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Tabs<Filter>
        tabs={[
          { id: "all", label: "All", count: all.length },
          { id: "done", label: "Working in demo", count: done },
          { id: "planned", label: "Planned", count: planned },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState title="Nothing in this filter" />
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const isOpen = open.has(m.title);
            const mDone = m.features.filter((f) => f.status === "done").length;
            return (
              <div key={m.title} className="glass-card rounded-xl overflow-hidden">
                <button onClick={() => toggle(m.title)} aria-expanded={isOpen} className="w-full px-5 py-4 flex items-center gap-3 hover:dm-surface-hover transition-colors text-left">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${m.color}1a` }}>
                    <m.icon className="w-[18px] h-[18px]" style={{ color: m.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold dm-text">{m.title}</p>
                    <p className="text-xs dm-text-secondary">{moduleCount(filter, mDone, m.features.length)}</p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 dm-text-secondary transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && m.note && (
                  <p className="border-t dm-border px-5 py-2.5 text-xs dm-text-secondary bg-[#f8f9fa]">{m.note}</p>
                )}
                {isOpen && (
                  <ul className="border-t dm-border divide-y divide-[#e2e8f0]">
                    {m.features.map((f) => (
                      <li key={f.name} className="px-5 py-3 flex items-center gap-3">
                        {f.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 dm-text-secondary shrink-0" />
                        )}
                        <span className={cn("text-sm flex-1", f.status === "done" ? "dm-text" : "dm-text-secondary")}>{f.name}</span>
                        {f.href ? (
                          <Link href={f.href} className="text-xs font-medium text-[#4A90D9] hover:underline shrink-0">
                            Try it →
                          </Link>
                        ) : f.status === "planned" ? (
                          <span className="text-[11px] dm-text-secondary shrink-0">Backend phase</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
