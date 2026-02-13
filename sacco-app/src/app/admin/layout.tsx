"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, PiggyBank, CreditCard, BarChart3,
  BookOpen, Megaphone, FileBarChart, Settings, LogOut, Menu,
  ChevronRight, Bell, Search, ChevronDown, ClipboardList, Moon, Sun,
} from "lucide-react";

const navItems = [
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
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dynamic import to avoid SSR issues
  const [themeState, setThemeState] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  
  useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("silvervibe_theme") as "light" | "dark" | null;
      if (stored) setThemeState(stored);
      setMounted(true);
    }
  });

  const toggleTheme = () => {
    const next = themeState === "light" ? "dark" : "light";
    setThemeState(next);
    localStorage.setItem("silvervibe_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen dm-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0f0f0f] flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-[#C0C0C0]/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg silver-gradient flex items-center justify-center border border-[#C0C0C0]/20">
              <span className="text-xs font-bold silver-text-gradient">SV</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">SilverVibe</h1>
              <p className="text-[#C0C0C0]/40 text-[10px] uppercase tracking-wider">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[#C0C0C0]/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", active ? "text-white" : "text-[#C0C0C0]/40 group-hover:text-[#C0C0C0]")} />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4A90D9]" />}
              </Link>
            );
          })}
        </nav>

        {/* Admin user */}
        <div className="p-3 border-t border-[#C0C0C0]/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-[#C0C0C0]/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-[#C0C0C0]">SN</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">Sarah Nakamya</p>
              <p className="text-[#C0C0C0]/40 text-[10px]">CEO</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[#C0C0C0]/40 hover:text-red-400 hover:bg-red-500/5 transition-all w-full mt-1"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 dm-header backdrop-blur-xl border-b dm-border px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:dm-surface-hover">
              <Menu className="w-5 h-5 dm-text" />
            </button>
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 dm-surface rounded-lg px-3 py-2 w-80 border dm-border">
              <Search className="w-4 h-4 dm-text-secondary" />
              <input type="text" placeholder="Search members, transactions..."
                className="bg-transparent border-none outline-none text-sm dm-text placeholder:dm-text-secondary flex-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:dm-surface-hover transition-colors"
              title={themeState === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {themeState === "dark" ? (
                <Sun className="w-5 h-5 text-[#f59e0b]" />
              ) : (
                <Moon className="w-5 h-5 dm-text-secondary" />
              )}
            </button>
            <button className="relative p-2 rounded-lg hover:dm-surface-hover transition-colors">
              <Bell className="w-5 h-5 dm-text-secondary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:dm-surface-hover cursor-pointer transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                <span className="text-[10px] font-semibold text-white">SN</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium dm-text">Sarah N.</p>
              </div>
              <ChevronDown className="w-3 h-3 dm-text-secondary" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
