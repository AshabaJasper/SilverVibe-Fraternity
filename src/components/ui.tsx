"use client";
import { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown when a list or table has no rows (after filtering, or empty data). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-full dm-surface-hover flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 dm-text-secondary" />
      </div>
      <p className="text-sm font-semibold dm-text">{title}</p>
      {hint && <p className="text-xs dm-text-secondary mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const badgeTone: Record<string, string> = {
  green: "bg-[#22c55e]/10 text-[#16a34a]",
  amber: "bg-[#f59e0b]/10 text-[#d97706]",
  red: "bg-[#ef4444]/10 text-[#dc2626]",
  blue: "bg-[#4A90D9]/10 text-[#4A90D9]",
  gray: "bg-[#94a3b8]/15 text-[#64748b]",
  purple: "bg-[#a855f7]/10 text-[#9333ea]",
};

const statusTone: Record<string, keyof typeof badgeTone> = {
  active: "green", verified: "green", approved: "green", posted: "green", completed: "green", paid: "green",
  sent: "green", resolved: "green", enabled: "green", success: "green", disbursed: "green", current: "green",
  pending: "amber", pending_review: "amber", under_appraisal: "amber", draft: "gray", scheduled: "blue",
  open: "blue", in_progress: "blue", processing: "blue", incomplete: "amber", review: "amber",
  rejected: "red", declined: "red", suspended: "red", failed: "red", overdue: "red", reversed: "red",
  dormant: "gray", inactive: "gray", disabled: "gray", closed: "gray",
};

/** Status pill. Pass `tone` to override the colour picked from the status text. */
export function Badge({ status, tone, className }: { status: string; tone?: keyof typeof badgeTone; className?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const t = tone ?? statusTone[key] ?? "gray";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap", badgeTone[t], className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold dm-text">{title}</h1>
        {subtitle && <p className="dm-text-secondary text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "#4A90D9",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  color?: string;
  href?: string;
}) {
  const body = (
    <div className="glass-card rounded-xl p-4 h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs dm-text-secondary font-medium">{label}</p>
          <p className="text-xl font-bold dm-text mt-1 truncate">{value}</p>
          {sub && <div className="text-xs dm-text-secondary mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a` }}>
            <Icon className="w-[18px] h-[18px]" style={{ color }} />
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

/** Segmented tab bar used across pages. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex gap-1 dm-surface-hover rounded-xl p-1 overflow-x-auto" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
            active === t.id ? "dm-surface dm-text shadow-sm" : "dm-text-secondary hover:dm-text"
          )}
        >
          {t.label}
          {typeof t.count === "number" && <span className="ml-1.5 opacity-60">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
