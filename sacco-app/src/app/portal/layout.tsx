"use client";
import { useState, useEffect, useRef } from "react";
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
  Search,
  Settings,
  Key,
  ChevronDown,
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

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "Savings deposit confirmed", desc: "UGX 500,000 deposited to Regular Savings", time: "10 min ago", unread: true },
  { id: 2, title: "Loan repayment due", desc: "Your next repayment of UGX 350,000 is due in 5 days", time: "1 hr ago", unread: true },
  { id: 3, title: "Dividend credited", desc: "Annual dividend of UGX 125,000 has been credited", time: "2 hrs ago", unread: false },
  { id: 4, title: "Profile update approved", desc: "Your phone number change has been approved", time: "1 day ago", unread: false },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Don't render layout for login page
  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  };

  // Derive page title from pathname
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
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky inset-y-0 left-0 z-50 w-72 lg:top-0 lg:h-screen bg-[#0f0f0f] border-r border-[#C0C0C0]/10 flex flex-col transition-transform duration-300 lg:translate-x-0 shrink-0",
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
        <header className="sticky top-0 z-30 bg-[var(--dm-header-bg)] border-b dm-border px-4 lg:px-8">
          {/* Main header row */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:dm-surface-hover transition-colors"
              >
                <Menu className="w-5 h-5 dm-text" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <Link href="/portal" className="dm-text-secondary hover:dm-text transition-colors">Portal</Link>
                {pathname !== "/portal" && (
                  <>
                    <ChevronRight className="w-3 h-3 dm-text-secondary" />
                    <span className="dm-text font-medium">{pageTitle}</span>
                  </>
                )}
              </div>
              <h2 className="lg:hidden text-sm font-semibold dm-text">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-xl hover:dm-surface-hover transition-colors"
                title="Search"
              >
                <Search className="w-4.5 h-4.5 dm-text-secondary" />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:dm-surface-hover transition-colors"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4.5 h-4.5 text-[#f59e0b]" />
                ) : (
                  <Moon className="w-4.5 h-4.5 dm-text-secondary" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                  className="relative p-2 rounded-xl hover:dm-surface-hover transition-colors"
                >
                  <Bell className="w-4.5 h-4.5 dm-text-secondary" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ef4444] rounded-full border-2" style={{ borderColor: "var(--dm-header-bg)" }} />
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 dm-surface border dm-border rounded-xl shadow-xl z-50 overflow-hidden">
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
                          href="/portal/notifications"
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
                      href="/portal/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block text-center text-xs font-medium text-[#4A90D9] py-2.5 border-t dm-border hover:dm-surface-hover transition-colors"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-6 mx-1 hidden sm:block" style={{ borderLeft: '1px solid var(--dm-border)' }} />

              {/* User */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:dm-surface-hover transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#4A90D9]/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#4A90D9]">JM</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium dm-text leading-tight">James M.</p>
                    <p className="text-[10px] dm-text-secondary leading-tight">SV-0042</p>
                  </div>
                  <ChevronDown className={cn("w-3 h-3 dm-text-secondary hidden sm:block transition-transform", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 dm-surface border dm-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b dm-border">
                      <p className="text-sm font-semibold dm-text">James Mukasa</p>
                      <p className="text-xs dm-text-secondary">james@silvervibe.coop</p>
                    </div>
                    <div className="py-1">
                      <Link href="/portal/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <User className="w-4 h-4 dm-text-secondary" /> My Profile
                      </Link>
                      <Link href="/portal/savings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <PiggyBank className="w-4 h-4 dm-text-secondary" /> My Savings
                      </Link>
                      <Link href="/portal/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <Key className="w-4 h-4 dm-text-secondary" /> Change Password
                      </Link>
                      <Link href="/portal/support" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                        <HelpCircle className="w-4 h-4 dm-text-secondary" /> Help & Support
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

          {/* Expandable search */}
          {searchOpen && (
            <div className="pb-3 border-t dm-border pt-3 -mx-4 lg:-mx-8 px-4 lg:px-8">
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dm-text-secondary" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 rounded-xl dm-input border dm-border text-sm outline-none focus:ring-2 focus:ring-[#4A90D9]/30 transition-all"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 dm-text-secondary hover:dm-text" />
                </button>
              </div>
              {searchQuery && (
                <div className="mt-2 dm-surface border dm-border rounded-xl shadow-lg max-w-lg overflow-hidden">
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

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
