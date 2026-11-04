"use client";
import { useCallback } from "react";
import { LayoutDashboard, PiggyBank, CreditCard, BarChart3, User, Bell, HelpCircle, Settings } from "lucide-react";
import AppShell, { type NavItem } from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { usePersistedState } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { NOTIFICATIONS_DATA } from "@/lib/mock-data";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Savings", href: "/portal/savings", icon: PiggyBank },
  { label: "Loans", href: "/portal/loans", icon: CreditCard },
  { label: "Shares & Investments", href: "/portal/shares", icon: BarChart3 },
  { label: "Profile", href: "/portal/profile", icon: User },
  { label: "Notifications", href: "/portal/notifications", icon: Bell },
  { label: "Support", href: "/portal/support", icon: HelpCircle },
];


const QUICK_LINKS = [
  { label: "Make a deposit", sub: "Dashboard", href: "/portal?action=deposit", keywords: "deposit save money" },
  { label: "Apply for a loan", sub: "Loans", href: "/portal/loans?action=apply", keywords: "loan apply borrow" },
  { label: "Download statement", sub: "Savings", href: "/portal/savings?action=statement", keywords: "statement download pdf" },
  { label: "Change password", sub: "Profile → Security", href: "/portal/profile?tab=security", keywords: "password security 2fa" },
  { label: "Contact support", sub: "Support", href: "/portal/support", keywords: "help support ticket message" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard require="member">
      <PortalShell>{children}</PortalShell>
    </AuthGuard>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = usePersistedState(KEYS.memberNotifications, NOTIFICATIONS_DATA);

  const searchExtra = useCallback(
    (q: string) =>
      QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(q) || l.keywords.includes(q)).map(({ label, sub, href }) => ({ label, sub, href })),
    []
  );

  return (
    <AppShell
      variant="member"
      navItems={navItems}
      rootHref="/portal"
      subtitle="Member Portal"
      notifications={notifs.map((n) => ({ id: n.id, title: n.title, body: n.message, when: n.date, read: n.read, href: n.href }))}
      onMarkRead={(id) => setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))}
      onMarkAllRead={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
      allNotificationsHref="/portal/notifications"
      searchExtra={searchExtra}
      searchPlaceholder="Search pages and actions (deposit, loan, statement)…"
      menuLinks={[
        { label: "My Profile", href: "/portal/profile", icon: User },
        { label: "Preferences", href: "/portal/profile?tab=preferences", icon: Settings },
        { label: "Help & Support", href: "/portal/support", icon: HelpCircle },
      ]}
    >
      {children}
    </AppShell>
  );
}
