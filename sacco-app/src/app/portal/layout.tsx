"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  PiggyBank,
  CreditCard,
  BarChart3,
  User,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Savings", href: "/portal/savings", icon: PiggyBank },
  { label: "Loans", href: "/portal/loans", icon: CreditCard },
  { label: "Shares & Investments", href: "/portal/shares", icon: BarChart3 },
  { label: "Profile", href: "/portal/profile", icon: User },
  { label: "Notifications", href: "/portal/notifications", icon: Bell },
  { label: "Support", href: "/portal/support", icon: HelpCircle },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't render layout for login page
  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen dm-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0f0f0f] border-r border-[#C0C0C0]/10 flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#C0C0C0]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full silver-gradient flex items-center justify-center border border-[#C0C0C0]/20">
              <span className="text-sm font-bold silver-text-gradient">SV</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">SilverVibe</h1>
              <p className="text-[#C0C0C0]/40 text-xs">Member Portal</p>
            </div>
          </div>
        </div>

        {/* Member info */}
        <div className="px-4 py-4 border-b border-[#C0C0C0]/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-[#4A90D9]/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-[#4A90D9]">JM</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">James Mukasa</p>
              <p className="text-[#C0C0C0]/50 text-xs">SV-0042</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  active
                    ? "bg-[#4A90D9] text-white shadow-lg shadow-[#4A90D9]/20"
                    : "text-[#C0C0C0]/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "text-white" : "text-[#C0C0C0]/40 group-hover:text-[#4A90D9]")} />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#C0C0C0]/10">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#C0C0C0]/60 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 dm-header backdrop-blur-xl border-b dm-border px-4 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:dm-surface-hover transition-colors"
          >
            <Menu className="w-5 h-5 dm-text" />
          </button>

          <div className="hidden lg:block">
            <p className="text-sm dm-text-secondary">
              {new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:dm-surface-hover transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-[#f59e0b]" />
              ) : (
                <Moon className="w-5 h-5 dm-text-secondary" />
              )}
            </button>

            <Link href="/portal/notifications" className="relative p-2.5 rounded-xl hover:dm-surface-hover transition-colors">
              <Bell className="w-5 h-5 dm-text-secondary" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ef4444] rounded-full border-2" style={{ borderColor: "var(--dm-surface)" }} />
            </Link>
            <Link href="/portal/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:dm-surface-hover transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#4A90D9]/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-[#4A90D9]">JM</span>
              </div>
              <span className="text-sm font-medium dm-text hidden sm:block">James</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
