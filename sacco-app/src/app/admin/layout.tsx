"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, PiggyBank, CreditCard, BarChart3,
  BookOpen, Megaphone, FileBarChart, Settings, LogOut, Menu,
  ChevronRight, Bell, Search, ChevronDown, ClipboardList, Moon, Sun,
  X, Plus, RefreshCw, User, Key, HelpCircle,
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

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "New member registered", desc: "John Doe submitted a registration form", time: "5 min ago", unread: true },
  { id: 2, title: "Loan approval pending", desc: "Loan #LN-0089 requires your review", time: "12 min ago", unread: true },
  { id: 3, title: "Savings deposit", desc: "UGX 2,500,000 deposited by SV-0042", time: "1 hr ago", unread: true },
  { id: 4, title: "System backup completed", desc: "Daily backup completed successfully", time: "3 hrs ago", unread: false },
  { id: 5, title: "Interest computation done", desc: "Monthly interest calculated for all accounts", time: "5 hrs ago", unread: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dynamic import to avoid SSR issues
  const [themeState, setThemeState] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  
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

  // Derive breadcrumb from pathname
  const currentNav = navItems.find((item) => isActive(item.href));
  const pageTitle = currentNav?.label || "Dashboard";

  // Filter nav for search
  const filteredNavItems = searchQuery
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen dm-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky inset-y-0 left-0 z-50 w-64 lg:top-0 lg:h-screen bg-[#0f0f0f] flex flex-col transition-transform duration-300 lg:translate-x-0 shrink-0",
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
        <header className="sticky top-0 z-30 bg-[var(--dm-header-bg)] border-b dm-border px-4 lg:px-6">
          {/* Main header row */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:dm-surface-hover">
                <Menu className="w-5 h-5 dm-text" />
              </button>

              {/* Breadcrumb / Page title */}
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <Link href="/admin" className="dm-text-secondary hover:dm-text transition-colors">Admin</Link>
                {pathname !== "/admin" && (
                  <>
                    <ChevronRight className="w-3 h-3 dm-text-secondary" />
                    <span className="dm-text font-medium">{pageTitle}</span>
                  </>
                )}
              </div>
              <h2 className="lg:hidden text-sm font-semibold dm-text">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg hover:dm-surface-hover transition-colors"
                title="Search (Ctrl+K)"
              >
                <Search className="w-4.5 h-4.5 dm-text-secondary" />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:dm-surface-hover transition-colors"
                title={themeState === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {themeState === "dark" ? (
                  <Sun className="w-4.5 h-4.5 text-[#f59e0b]" />
                ) : (
                  <Moon className="w-4.5 h-4.5 dm-text-secondary" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                  className="relative p-2 rounded-lg hover:dm-surface-hover transition-colors"
                >
                  <Bell className="w-4.5 h-4.5 dm-text-secondary" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full" />
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 dm-surface border dm-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b dm-border">
                      <p className="text-sm font-semibold dm-text">Notifications</p>
                      <span className="text-[10px] font-medium bg-[#ef4444] text-white px-1.5 py-0.5 rounded-full">
                        {MOCK_NOTIFICATIONS.filter((n) => n.unread).length}
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {MOCK_NOTIFICATIONS.map((n) => (
                        <Link
                          key={n.id}
                          href="/admin/communications"
                          onClick={() => setNotifOpen(false)}
                          className={cn(
                            "block px-4 py-3 hover:dm-surface-hover transition-colors border-b dm-border last:border-0",
                            n.unread && "bg-[#4A90D9]/5"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {n.unread && <div className="w-2 h-2 rounded-full bg-[#4A90D9] mt-1.5 shrink-0" />}
                            <div className={n.unread ? "" : "ml-4"}>
                              <p className="text-sm font-medium dm-text">{n.title}</p>
                              <p className="text-xs dm-text-secondary mt-0.5">{n.desc}</p>
                              <p className="text-[10px] dm-text-secondary mt-1">{n.time}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/admin/communications"
                      onClick={() => setNotifOpen(false)}
                      className="block text-center text-xs font-medium text-[#4A90D9] py-2.5 border-t dm-border hover:dm-surface-hover transition-colors"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-6 dm-border mx-1 hidden sm:block" style={{ borderLeft: '1px solid var(--dm-border)' }} />

              {/* User menu */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:dm-surface-hover cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-white">SN</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium dm-text leading-tight">Sarah N.</p>
                    <p className="text-[10px] dm-text-secondary leading-tight">CEO</p>
                  </div>
                  <ChevronDown className={cn("w-3 h-3 dm-text-secondary hidden sm:block transition-transform", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 dm-surface border dm-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b dm-border">
                      <p className="text-sm font-semibold dm-text">Sarah Nakamya</p>
                      <p className="text-xs dm-text-secondary">sarah@silvervibe.coop</p>
                    </div>
                    <div className="py-1">
                      <Link href="/admin/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <User className="w-4 h-4 dm-text-secondary" /> My Profile
                      </Link>
                      <Link href="/admin/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <Settings className="w-4 h-4 dm-text-secondary" /> Settings
                      </Link>
                      <Link href="/admin/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <Key className="w-4 h-4 dm-text-secondary" /> Change Password
                      </Link>
                      <Link href="/admin/checklist" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <HelpCircle className="w-4 h-4 dm-text-secondary" /> Feature Checklist
                      </Link>
                    </div>
                    <div className="border-t dm-border py-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); router.push("/"); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable search bar */}
          {searchOpen && (
            <div className="pb-3 border-t dm-border pt-3 -mx-4 lg:-mx-6 px-4 lg:px-6">
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dm-text-secondary" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search pages, members, transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 rounded-lg dm-input border dm-border text-sm outline-none focus:ring-2 focus:ring-[#4A90D9]/30 transition-all"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 dm-text-secondary hover:dm-text" />
                </button>
              </div>
              {/* Search results */}
              {searchQuery && (
                <div className="mt-2 dm-surface border dm-border rounded-lg shadow-lg max-w-lg overflow-hidden">
                  {filteredNavItems.length > 0 ? (
                    filteredNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:dm-surface-hover transition-colors text-sm"
                        >
                          <Icon className="w-4 h-4 dm-text-secondary" />
                          <span className="dm-text">{item.label}</span>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="px-4 py-3 text-sm dm-text-secondary">No results found</p>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
