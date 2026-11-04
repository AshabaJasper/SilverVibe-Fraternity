"use client";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell, ChevronDown, ChevronRight, Key, LogOut, Menu, Moon, Search, Sun, X, RotateCcw, CheckCheck,
} from "lucide-react";
import { cn, getInitials, timeAgo, formatDate } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useAuthStore, type UserType } from "@/lib/store";
import { clearAllStorage, showToast } from "@/lib/storage";
import Modal, { Button, FormField, TextInput } from "@/components/Modal";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
export interface ShellNotification {
  id: string;
  title: string;
  body: string;
  /** ISO date or datetime */
  when: string;
  read: boolean;
  href: string;
}
export interface SearchResult {
  label: string;
  sub?: string;
  href: string;
}
export interface MenuLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AppShellProps {
  variant: UserType;
  navItems: NavItem[];
  rootHref: string;
  subtitle: string;
  notifications: ShellNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  allNotificationsHref: string;
  /** Extra search results beyond page names (e.g. members). */
  searchExtra?: (q: string) => SearchResult[];
  searchPlaceholder: string;
  menuLinks: MenuLink[];
  children: ReactNode;
}

/**
 * Shared chrome for the admin dashboard and the member portal:
 * sidebar, header, search (Ctrl/⌘+K), theme toggle, notifications, user menu.
 */
export default function AppShell({
  variant,
  navItems,
  rootHref,
  subtitle,
  notifications,
  onMarkRead,
  onMarkAllRead,
  allNotificationsHref,
  searchExtra,
  searchPlaceholder,
  menuLinks,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isPortal = variant === "member";
  const unread = notifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Ctrl/⌘+K opens search; Escape closes it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => (href === rootHref ? pathname === rootHref : pathname.startsWith(href));
  const pageTitle = navItems.find((i) => isActive(i.href))?.label ?? "Dashboard";

  const results: SearchResult[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const pages = navItems.filter((i) => i.label.toLowerCase().includes(q)).map((i) => ({ label: i.label, sub: "Page", href: i.href }));
    return [...pages, ...(searchExtra?.(q) ?? [])].slice(0, 8);
  }, [searchQuery, navItems, searchExtra]);

  const signOut = () => {
    logout();
    setUserMenuOpen(false);
    showToast("You have been signed out", "info");
    router.push("/");
  };

  const name = user?.name ?? (isPortal ? "Member" : "Administrator");
  const roleLabel = isPortal ? user?.sv ?? "" : user?.role ?? "";
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen dm-bg flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed lg:sticky inset-y-0 left-0 z-50 lg:top-0 lg:h-screen bg-[#0f0f0f] border-r border-[#C0C0C0]/10 flex flex-col transition-transform duration-300 lg:translate-x-0 shrink-0",
          isPortal ? "w-72" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("border-b border-[#C0C0C0]/10 flex items-center justify-between", isPortal ? "p-6" : "p-5")}>
          <Link href={rootHref} className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="SilverVibe logo" width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-[#C0C0C0]/20" priority />
            <div>
              <p className="text-white font-semibold text-sm">SilverVibe</p>
              <p className="text-[#C0C0C0]/40 text-[10px] uppercase tracking-wider">{subtitle}</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-[#C0C0C0]/60 hover:text-white" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPortal && (
          <div className="px-4 py-4 border-b border-[#C0C0C0]/10">
            <Link href="/portal/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-[#4A90D9]/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-[#4A90D9]">{getInitials(name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{name}</p>
                <p className="text-[#C0C0C0]/50 text-xs">{roleLabel}</p>
              </div>
            </Link>
          </div>
        )}

        <nav className={cn("flex-1 px-3 py-4 overflow-y-auto", isPortal ? "space-y-1" : "space-y-0.5")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badge = item.href === allNotificationsHref.split("?")[0] && unread > 0 ? unread : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 text-sm font-medium transition-all group",
                  isPortal ? "px-4 py-3 rounded-xl" : "px-3 py-2.5 rounded-lg",
                  active
                    ? isPortal
                      ? "bg-[#4A90D9] text-white shadow-lg shadow-[#4A90D9]/20"
                      : "bg-white/10 text-white"
                    : "text-[#C0C0C0]/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn(isPortal ? "w-5 h-5" : "w-[18px] h-[18px]", active ? "text-white" : "text-[#C0C0C0]/40 group-hover:text-[#C0C0C0]")} />
                {item.label}
                {badge ? (
                  <span className="ml-auto text-[10px] font-semibold bg-[#ef4444] text-white px-1.5 py-0.5 rounded-full">{badge}</span>
                ) : active ? (
                  isPortal ? <ChevronRight className="w-4 h-4 ml-auto" /> : <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4A90D9]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#C0C0C0]/10">
          {!isPortal && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-[#C0C0C0]/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-[#C0C0C0]">{getInitials(name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{name}</p>
                <p className="text-[#C0C0C0]/40 text-[10px]">{roleLabel}</p>
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#C0C0C0]/60 hover:text-red-400 hover:bg-red-500/5 transition-all w-full mt-1"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-[var(--dm-header-bg)] border-b dm-border px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:dm-surface-hover" aria-label="Open menu">
                <Menu className="w-5 h-5 dm-text" />
              </button>
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <Link href={rootHref} className="dm-text-secondary hover:dm-text transition-colors">{isPortal ? "Portal" : "Admin"}</Link>
                {pathname !== rootHref && (
                  <>
                    <ChevronRight className="w-3 h-3 dm-text-secondary" />
                    <span className="dm-text font-medium">{pageTitle}</span>
                  </>
                )}
              </div>
              <h2 className="lg:hidden text-sm font-semibold dm-text truncate">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="flex items-center gap-2 p-2 sm:px-3 rounded-lg hover:dm-surface-hover transition-colors"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px] dm-text-secondary" />
                <kbd className="hidden md:inline text-[10px] dm-text-secondary border dm-border rounded px-1.5 py-0.5">Ctrl K</kbd>
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:dm-surface-hover transition-colors"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="w-[18px] h-[18px] text-[#f59e0b]" /> : <Moon className="w-[18px] h-[18px] dm-text-secondary" />}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setUserMenuOpen(false);
                  }}
                  className="relative p-2 rounded-lg hover:dm-surface-hover transition-colors"
                  aria-label={`Notifications (${unread} unread)`}
                >
                  <Bell className="w-[18px] h-[18px] dm-text-secondary" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#ef4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] dm-surface border dm-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b dm-border">
                      <p className="text-sm font-semibold dm-text">Notifications</p>
                      {unread > 0 ? (
                        <button onClick={onMarkAllRead} className="flex items-center gap-1 text-[11px] font-medium text-[#4A90D9] hover:underline">
                          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      ) : (
                        <span className="text-[11px] dm-text-secondary">All caught up</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.slice(0, 6).map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => {
                            onMarkRead(n.id);
                            setNotifOpen(false);
                          }}
                          className={cn("block px-4 py-3 hover:dm-surface-hover transition-colors border-b dm-border last:border-0", !n.read && "bg-[#4A90D9]/5")}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && <div className="w-2 h-2 rounded-full bg-[#4A90D9] mt-1.5 shrink-0" />}
                            <div className={n.read ? "ml-4" : ""}>
                              <p className="text-sm font-medium dm-text">{n.title}</p>
                              <p className="text-xs dm-text-secondary mt-0.5">{n.body}</p>
                              <p className="text-[10px] dm-text-secondary mt-1">{n.when.includes("T") ? timeAgo(n.when) : formatDate(n.when)}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={allNotificationsHref}
                      onClick={() => setNotifOpen(false)}
                      className="block text-center text-xs font-medium text-[#4A90D9] py-2.5 border-t dm-border hover:dm-surface-hover transition-colors"
                    >
                      View all
                    </Link>
                  </div>
                )}
              </div>

              <div className="w-px h-6 mx-1 hidden sm:block" style={{ borderLeft: "1px solid var(--dm-border)" }} />

              {/* User menu */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => {
                    setUserMenuOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:dm-surface-hover transition-colors"
                  aria-label="Account menu"
                >
                  <div className={cn("w-7 h-7 flex items-center justify-center", isPortal ? "rounded-full bg-[#4A90D9]" : "rounded-lg bg-[#1A1A1A]")}>
                    <span className="text-[10px] font-semibold text-white">{getInitials(name)}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-medium dm-text leading-tight">{name.split(" ")[0]}</p>
                    <p className="text-[10px] dm-text-secondary leading-tight">{roleLabel}</p>
                  </div>
                  <ChevronDown className={cn("w-3 h-3 dm-text-secondary hidden sm:block transition-transform", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 dm-surface border dm-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b dm-border">
                      <p className="text-sm font-semibold dm-text">{name}</p>
                      <p className="text-xs dm-text-secondary truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      {menuLinks.map((l) => (
                        <Link key={l.label} href={l.href} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors">
                          <l.icon className="w-4 h-4 dm-text-secondary" /> {l.label}
                        </Link>
                      ))}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setPwOpen(true);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors w-full"
                      >
                        <Key className="w-4 h-4 dm-text-secondary" /> Change Password
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setResetOpen(true);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm dm-text hover:dm-surface-hover transition-colors w-full"
                      >
                        <RotateCcw className="w-4 h-4 dm-text-secondary" /> Reset demo data
                      </button>
                    </div>
                    <div className="border-t dm-border py-1">
                      <button onClick={signOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors w-full">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {searchOpen && (
            <div className="pb-3 border-t dm-border pt-3 -mx-4 lg:-mx-6 px-4 lg:px-6">
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dm-text-secondary" />
                <input
                  autoFocus
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && results[0]) {
                      router.push(results[0].href);
                      closeSearch();
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2 rounded-lg dm-input border dm-border text-sm outline-none focus:ring-2 focus:ring-[#4A90D9]/30 transition-all"
                />
                <button onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Close search">
                  <X className="w-4 h-4 dm-text-secondary" />
                </button>
              </div>
              {searchQuery && (
                <div className="mt-2 dm-surface border dm-border rounded-lg shadow-lg max-w-lg overflow-hidden">
                  {results.length > 0 ? (
                    results.map((r) => (
                      <Link key={r.href + r.label} href={r.href} onClick={closeSearch} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:dm-surface-hover transition-colors text-sm">
                        <span className="dm-text">{r.label}</span>
                        {r.sub && <span className="text-xs dm-text-secondary">{r.sub}</span>}
                      </Link>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-sm dm-text-secondary">No results for “{searchQuery}”</p>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-6 min-w-0">{children}</main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAllStorage();
                window.location.reload();
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="text-sm dm-text-secondary">
          This clears every change you made in this browser (members, transactions, settings…) and restores the original demo data. You will stay signed in.
        </p>
      </Modal>
    </div>
  );
}

/** Demo password change: validates and confirms, nothing is sent anywhere. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = () => {
    if (!current) return setError("Enter your current password.");
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (!/[0-9]/.test(next) || !/[A-Za-z]/.test(next)) return setError("Use both letters and numbers.");
    if (next !== confirm) return setError("Passwords don't match.");
    showToast("Password updated successfully");
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change Password"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={submit}>Update password</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Current password" required>
          <TextInput type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
        </FormField>
        <FormField label="New password" required hint="At least 8 characters, letters and numbers">
          <TextInput type="password" value={next} onChange={setNext} autoComplete="new-password" />
        </FormField>
        <FormField label="Confirm new password" required error={error}>
          <TextInput type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </FormField>
      </div>
    </Modal>
  );
}
