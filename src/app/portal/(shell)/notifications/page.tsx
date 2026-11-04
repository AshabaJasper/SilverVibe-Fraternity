"use client";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, ArrowDownRight, Clock, Megaphone, Settings, CheckCheck, CreditCard,
  Trash2, MailOpen, Mail, Eraser,
} from "lucide-react";
import { NOTIFICATIONS_DATA, type MemberNotification } from "@/lib/mock-data";
import { KEYS } from "@/lib/keys";
import { usePersistedState, showToast } from "@/lib/storage";
import { cn, daysUntil, formatDate, useHydrated } from "@/lib/utils";
import { Button, ConfirmDialog } from "@/components/Modal";
import { EmptyState, PageHeader } from "@/components/ui";

const iconMap: Record<string, React.ElementType> = {
  transaction: ArrowDownRight,
  reminder: Clock,
  announcement: Megaphone,
  system: Settings,
  loan: CreditCard,
};
const colorMap: Record<string, string> = {
  transaction: "#22c55e",
  reminder: "#f59e0b",
  announcement: "#4A90D9",
  system: "#64748b",
  loan: "#a855f7",
};

type Filter = "all" | "unread" | "transaction" | "reminder" | "loan" | "announcement" | "system";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "transaction", label: "Transactions" },
  { id: "reminder", label: "Reminders" },
  { id: "loan", label: "Loans" },
  { id: "announcement", label: "Announcements" },
  { id: "system", label: "System" },
];

function matches(n: MemberNotification, f: Filter) {
  if (f === "all") return true;
  if (f === "unread") return !n.read;
  return n.type === f;
}

/** Bucket by age relative to today. Only called after hydration (uses the client clock). */
function groupLabel(date: string) {
  const d = daysUntil(date);
  if (d >= 0) return "Today";
  if (d >= -6) return "This week";
  return "Earlier";
}

export default function NotificationsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  // Same key + seed as the portal header bell, so the badge stays in sync.
  const [notifications, setNotifications] = usePersistedState(KEYS.memberNotifications, NOTIFICATIONS_DATA);
  const [filter, setFilter] = useState<Filter>("all");
  const [clearOpen, setClearOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;
  const sorted = [...notifications].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = sorted.filter((n) => matches(n, filter));

  // Before hydration render a single ungrouped list so server and client markup match.
  const groups: { label: string | null; items: MemberNotification[] }[] = [];
  if (!hydrated) groups.push({ label: null, items: filtered });
  else {
    for (const n of filtered) {
      const label = groupLabel(n.date);
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push(n);
      else groups.push({ label, items: [n] });
    }
  }

  const setRead = (id: string, read: boolean) =>
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read } : n)));

  const open = (n: MemberNotification) => {
    if (!n.read) setRead(n.id, true);
    router.push(n.href);
  };

  const markAllRead = () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    showToast(`${unreadCount} notification${unreadCount === 1 ? "" : "s"} marked as read`);
  };

  const remove = (e: MouseEvent, n: MemberNotification) => {
    e.stopPropagation();
    setNotifications((list) => list.filter((x) => x.id !== n.id));
    showToast("Notification deleted", "info");
  };

  const toggleRead = (e: MouseEvent, n: MemberNotification) => {
    e.stopPropagation();
    setRead(n.id, !n.read);
  };

  const emptyText: Record<Filter, string> = {
    all: "You're all caught up — new alerts will appear here.",
    unread: "No unread notifications.",
    transaction: "No transaction alerts.",
    reminder: "No reminders right now.",
    loan: "No loan notifications.",
    announcement: "No announcements.",
    system: "No system messages.",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="secondary" disabled={unreadCount === 0} onClick={markAllRead}>
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </Button>
            <Button variant="secondary" disabled={readCount === 0} onClick={() => setClearOpen(true)}>
              <Eraser className="w-4 h-4" /> Clear read
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter notifications">
        {FILTERS.map((f) => {
          const count = notifications.filter((n) => matches(n, f.id)).length;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
                filter === f.id ? "bg-[#1A1A1A] text-white border-transparent" : "dm-surface dm-border dm-text-secondary hover:dm-surface-hover"
              )}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={Bell}
            title="Nothing here"
            hint={emptyText[filter]}
            action={filter !== "all" && notifications.length > 0 ? <Button variant="secondary" onClick={() => setFilter("all")}>Show all</Button> : undefined}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.label ?? "all"} className="space-y-2">
              {g.label && <h2 className="text-xs font-semibold uppercase tracking-wide dm-text-secondary px-1">{g.label}</h2>}
              {g.items.map((n) => (
                <NotificationCard key={n.id} n={n} onOpen={open} onToggleRead={toggleRead} onDelete={remove} />
              ))}
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          setNotifications((list) => list.filter((n) => !n.read));
          showToast(`${readCount} read notification${readCount === 1 ? "" : "s"} cleared`, "info");
        }}
        title="Clear read notifications?"
        message={`${readCount} read notification${readCount === 1 ? "" : "s"} will be removed. Unread ones are kept.`}
        confirmLabel="Clear"
        danger
      />
    </div>
  );
}

function NotificationCard({
  n,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  n: MemberNotification;
  onOpen: (n: MemberNotification) => void;
  onToggleRead: (e: MouseEvent, n: MemberNotification) => void;
  onDelete: (e: MouseEvent, n: MemberNotification) => void;
}) {
  const Icon = iconMap[n.type] || Bell;
  const color = colorMap[n.type] || "#64748b";
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return; // let the inner buttons handle their own keys
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(n);
    }
  };
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => onOpen(n)}
      onKeyDown={onKey}
      aria-label={`${n.title}${n.read ? "" : " (unread)"}`}
      className={cn(
        "group glass-card rounded-xl p-4 flex items-start gap-3 transition-all hover:shadow-md cursor-pointer border-l-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90D9]/40"
      )}
      style={{ borderLeftColor: !n.read ? color : "transparent" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", !n.read ? "font-semibold dm-text" : "font-medium dm-text-secondary")}>{n.title}</p>
          <span className="text-xs dm-text-secondary whitespace-nowrap">{formatDate(n.date)}</span>
        </div>
        <p className="text-xs dm-text-secondary mt-0.5">{n.message}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => onToggleRead(e, n)}
          aria-label={n.read ? "Mark as unread" : "Mark as read"}
          title={n.read ? "Mark as unread" : "Mark as read"}
          className="w-8 h-8 rounded-lg flex items-center justify-center dm-text-secondary hover:text-[#4A90D9] hover:dm-surface-hover transition-colors"
        >
          {n.read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(e, n)}
          aria-label="Delete notification"
          title="Delete"
          className="w-8 h-8 rounded-lg flex items-center justify-center dm-text-secondary hover:text-[#ef4444] hover:dm-surface-hover transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
