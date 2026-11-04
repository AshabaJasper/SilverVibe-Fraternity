"use client";
import { useCallback } from "react";
import {
  LayoutDashboard, Users, PiggyBank, CreditCard, BarChart3, BookOpen, Megaphone,
  FileBarChart, Settings, ClipboardList, User,
} from "lucide-react";
import AppShell, { type NavItem } from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { usePersistedState } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { ADMIN_NOTIFICATIONS, ADMIN_MEMBERS_LIST } from "@/lib/mock-data";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Members", href: "/admin/members", icon: Users },
  { label: "Savings", href: "/admin/savings", icon: PiggyBank },
  { label: "Loans", href: "/admin/loans", icon: CreditCard },
  { label: "Shares & Dividends", href: "/admin/shares", icon: BarChart3 },
  { label: "Accounting", href: "/admin/accounting", icon: BookOpen },
  { label: "Communications", href: "/admin/communications", icon: Megaphone },
  { label: "Reports", href: "/admin/reports", icon: FileBarChart },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Feature Checklist", href: "/admin/checklist", icon: ClipboardList },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard require="admin">
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = usePersistedState(KEYS.adminNotifications, ADMIN_NOTIFICATIONS);
  // The members page persists edits under "admin_members"; search reads the same list.
  const [members] = usePersistedState(KEYS.adminMembers, ADMIN_MEMBERS_LIST);

  const searchExtra = useCallback(
    (q: string) =>
      members
        .filter((m) => m.name.toLowerCase().includes(q) || m.sv_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((m) => ({ label: m.name, sub: m.sv_number, href: `/admin/members?q=${encodeURIComponent(m.sv_number)}` })),
    [members]
  );

  return (
    <AppShell
      variant="admin"
      navItems={navItems}
      rootHref="/admin"
      subtitle="Admin Dashboard"
      notifications={notifs.map((n) => ({ id: n.id, title: n.title, body: n.desc, when: n.time, read: n.read, href: n.href }))}
      onMarkRead={(id) => setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))}
      onMarkAllRead={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
      allNotificationsHref="/admin/communications"
      searchExtra={searchExtra}
      searchPlaceholder="Search pages or members (name / SV number)…"
      menuLinks={[
        { label: "My Account", href: "/admin/settings?tab=users", icon: User },
        { label: "Settings", href: "/admin/settings?tab=system", icon: Settings },
        { label: "Feature Checklist", href: "/admin/checklist", icon: ClipboardList },
      ]}
    >
      {children}
    </AppShell>
  );
}
