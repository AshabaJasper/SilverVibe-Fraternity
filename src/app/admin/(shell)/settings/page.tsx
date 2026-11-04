"use client";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell, Database, Download, Edit2, Globe, HardDriveDownload, Key, Landmark, Loader2, Lock, Plus,
  RotateCcw, Search, Shield, ShieldCheck, Trash2, Unlock, UserCheck, UserX, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal, { Button, ConfirmDialog, FormField, SelectInput, TextAreaInput, TextInput, ToggleSwitch } from "@/components/Modal";
import { Badge, EmptyState, PageHeader, StatCard, Tabs } from "@/components/ui";
import { usePersistedState, showToast } from "@/lib/storage";
import { useAuthHydrated, useAuthStore } from "@/lib/store";
import { exportToCsv } from "@/lib/export";
import { DEMO_ADMIN } from "@/lib/mock-data";
import { cn, formatDateTime, getInitials, uid } from "@/lib/utils";

/* ============================================================
 * Roles & permissions
 * ============================================================ */
const MODULES = ["Members", "Savings", "Loans", "Shares", "Accounting", "Communications", "Reports", "Settings"] as const;
type ModuleName = (typeof MODULES)[number];
const ACTIONS = ["view", "create", "approve"] as const;
type PermAction = (typeof ACTIONS)[number];
type Permissions = Record<ModuleName, Record<PermAction, boolean>>;

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Permissions;
  /** Built-in role whose permissions cannot be changed or removed. */
  protected?: boolean;
}

function perms(spec: Partial<Record<ModuleName, string>>): Permissions {
  // spec letters: v = view, c = create, a = approve
  return Object.fromEntries(
    MODULES.map((m) => {
      const s = spec[m] ?? "";
      return [m, { view: s.includes("v"), create: s.includes("c"), approve: s.includes("a") }];
    })
  ) as Permissions;
}
const ALL = Object.fromEntries(MODULES.map((m) => [m, "vca"])) as Record<ModuleName, string>;

const SEED_ROLES: Role[] = [
  { id: "role-super", name: "Super Admin", description: "Full system access, including users, roles and settings", color: "#ef4444", permissions: perms(ALL), protected: true },
  { id: "role-accountant", name: "Accountant", description: "Journals, statements and financial reports", color: "#4A90D9", permissions: perms({ Members: "v", Savings: "v", Loans: "v", Shares: "v", Accounting: "vca", Reports: "vc" }) },
  { id: "role-loans", name: "Loans Officer", description: "Loan applications, appraisal and collections", color: "#22c55e", permissions: perms({ Members: "v", Savings: "v", Loans: "vca", Communications: "vc", Reports: "v" }) },
  { id: "role-teller", name: "Teller", description: "Deposits, withdrawals and member queries", color: "#f59e0b", permissions: perms({ Members: "v", Savings: "vc", Loans: "v", Shares: "vc" }) },
  { id: "role-relations", name: "Member Relations", description: "Registration, KYC and member communications", color: "#a855f7", permissions: perms({ Members: "vca", Savings: "v", Communications: "vc", Reports: "v" }) },
  { id: "role-auditor", name: "Auditor", description: "Read-only access to every module", color: "#64748b", permissions: perms(Object.fromEntries(MODULES.map((m) => [m, "v"]))) },
];

const ROLE_COLORS = ["#ef4444", "#4A90D9", "#22c55e", "#f59e0b", "#a855f7", "#64748b", "#0ea5e9", "#ec4899"];

/* ============================================================
 * Users
 * ============================================================ */
interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role_id: string;
  status: "active" | "inactive";
  two_factor: boolean;
  last_login: string | null;
  /** The owner account: cannot be deleted, deactivated or demoted. */
  protected?: boolean;
}

const SEED_USERS: SystemUser[] = [
  { id: "usr-001", name: DEMO_ADMIN.full_name, email: DEMO_ADMIN.email, phone: "+256 772 400 100", role_id: "role-super", status: "active", two_factor: true, last_login: DEMO_ADMIN.last_login, protected: true },
  { id: "usr-002", name: "John Mugisha", email: "john.mugisha@silvervibe.coop", phone: "+256 772 400 101", role_id: "role-accountant", status: "active", two_factor: true, last_login: "2026-11-04T09:00:00" },
  { id: "usr-003", name: "Rose Namulema", email: "rose.namulema@silvervibe.coop", phone: "+256 772 400 102", role_id: "role-loans", status: "active", two_factor: false, last_login: "2026-11-03T16:45:00" },
  { id: "usr-004", name: "Peter Ochieng", email: "peter.ochieng@silvervibe.coop", phone: "+256 772 400 103", role_id: "role-teller", status: "active", two_factor: true, last_login: "2026-11-04T07:55:00" },
  { id: "usr-005", name: "Diana Acan", email: "diana.acan@silvervibe.coop", phone: "+256 772 400 104", role_id: "role-relations", status: "inactive", two_factor: false, last_login: "2026-10-14T10:00:00" },
];

const EMPTY_USER: SystemUser = { id: "", name: "", email: "", phone: "", role_id: "role-teller", status: "active", two_factor: true, last_login: null };

/* ============================================================
 * Audit log
 * ============================================================ */
const AUDIT_MODULES = ["Auth", ...MODULES] as const;
interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  module: string;
  action: string;
  detail: string;
  severity: "info" | "important" | "warning";
}

/** Audit timestamps are local wall-clock "YYYY-MM-DDTHH:MM:SS" (no zone), like the seeds. */
const pad2 = (n: number) => String(n).padStart(2, "0");
const localStamp = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
/** Parsed time for sorting; zone-less strings parse as local time, older "…Z" entries as UTC. */
const stampTime = (ts: string) => {
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const SEED_AUDIT: AuditEntry[] = [
  { id: "au-01", timestamp: "2026-11-04T09:15:00", user: "System", module: "Savings", action: "Deposit posted", detail: "UGX 500,000 to Regular Savings for Fatima Nankya (SV-0056)", severity: "info" },
  { id: "au-02", timestamp: "2026-11-04T08:45:00", user: "Diana Acan", module: "Members", action: "Member registered", detail: "Martha Apio (SV-0078) — KYC pending", severity: "info" },
  { id: "au-03", timestamp: "2026-11-04T08:30:12", user: "Sarah Nakamya", module: "Auth", action: "Login", detail: "Successful login with OTP from 197.239.4.18", severity: "info" },
  { id: "au-04", timestamp: "2026-11-04T03:00:00", user: "System", module: "Settings", action: "Backup completed", detail: "Automated daily backup (2.4 GB) to AWS S3 eu-west-1", severity: "info" },
  { id: "au-05", timestamp: "2026-11-03T23:00:00", user: "System", module: "Accounting", action: "Interest accrual", detail: "Monthly savings interest computed and journalised", severity: "info" },
  { id: "au-06", timestamp: "2026-11-03T15:20:00", user: "Rose Namulema", module: "Communications", action: "Message scheduled", detail: "Loan arrears reminder (SMS) to defaulters for 10 Nov 2026", severity: "info" },
  { id: "au-07", timestamp: "2026-11-02T14:05:00", user: "Sarah Nakamya", module: "Loans", action: "Loan approved", detail: "Emergency Loan UGX 2,000,000 for Samuel Byaruhanga (SV-0089)", severity: "important" },
  { id: "au-08", timestamp: "2026-11-01T22:14:00", user: "Unknown", module: "Auth", action: "Failed login", detail: "3 failed attempts for diana.acan@silvervibe.coop from 41.202.230.7", severity: "warning" },
  { id: "au-09", timestamp: "2026-10-28T16:40:00", user: "Sarah Nakamya", module: "Accounting", action: "Journal posted", detail: "JE-2026-0146 Staff salaries — October 2026 UGX 11,800,000", severity: "info" },
  { id: "au-10", timestamp: "2026-10-28T11:05:00", user: "Sarah Nakamya", module: "Reports", action: "Report exported", detail: "Member Register (CSV)", severity: "info" },
  { id: "au-11", timestamp: "2026-10-20T10:15:00", user: "Sarah Nakamya", module: "Communications", action: "Announcement sent", detail: "AGM 2026 notice (Email) to 847 members", severity: "important" },
  { id: "au-12", timestamp: "2026-10-14T16:30:00", user: "Sarah Nakamya", module: "Settings", action: "User deactivated", detail: "Diana Acan set to inactive (extended leave)", severity: "important" },
];

/* ============================================================
 * System settings — stored as one keyed object
 * ============================================================ */
const SEED_SETTINGS = {
  org_name: "SilverVibe Fraternity Cooperative Society Ltd",
  reg_no: "CS/2020/12345",
  contact_email: "info@silvervibe.coop",
  contact_phone: "+256 414 123 456",
  currency: "UGX",
  fiscal_year_start: "January",
  loan_interest_rate: "18",
  loan_interest_method: "Reducing balance",
  loan_penalty_rate: "2",
  loan_max_multiplier: "3",
  sms_sender_id: "SILVERVIBE",
  email_from: "noreply@silvervibe.coop",
  loan_reminder_days: "5",
  session_timeout: "30",
  max_login_attempts: "5",
  require_2fa: "Required for admins",
  backup_schedule: "Daily at 03:00 EAT",
  backup_location: "AWS S3 (eu-west-1)",
  retention_days: "90",
  last_backup: "2026-11-04T03:00:00",
};
type SettingsKey = keyof typeof SEED_SETTINGS;
type SystemSettings = Record<SettingsKey, string>;

interface FieldDef {
  key: SettingsKey;
  label: string;
  type?: "text" | "email" | "number" | "select";
  options?: string[];
  suffix?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  hint?: string;
}
interface SectionDef {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: FieldDef[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const SECTIONS: SectionDef[] = [
  {
    id: "general", title: "Organisation", icon: Globe,
    fields: [
      { key: "org_name", label: "Organisation name", maxLength: 100 },
      { key: "reg_no", label: "Registration number", maxLength: 30 },
      { key: "contact_email", label: "Contact email", type: "email" },
      { key: "contact_phone", label: "Contact phone", maxLength: 20 },
      { key: "currency", label: "Base currency", type: "select", options: ["UGX", "KES", "TZS", "USD"] },
      { key: "fiscal_year_start", label: "Fiscal year starts", type: "select", options: MONTHS },
    ],
  },
  {
    id: "loans", title: "Loan Defaults", icon: Landmark,
    fields: [
      { key: "loan_interest_rate", label: "Default interest rate", type: "number", suffix: "% p.a.", min: 1, max: 60 },
      { key: "loan_interest_method", label: "Interest method", type: "select", options: ["Reducing balance", "Flat rate"] },
      { key: "loan_penalty_rate", label: "Late payment penalty", type: "number", suffix: "% per month", min: 0, max: 10 },
      { key: "loan_max_multiplier", label: "Max loan (× savings)", type: "number", suffix: "× savings", min: 1, max: 10 },
    ],
  },
  {
    id: "notifications", title: "Notifications", icon: Bell,
    fields: [
      { key: "sms_sender_id", label: "SMS sender ID", maxLength: 11, hint: "Up to 11 letters or digits, no spaces" },
      { key: "email_from", label: "Email 'from' address", type: "email" },
      { key: "loan_reminder_days", label: "Loan reminder lead time", type: "number", suffix: "days before due", min: 1, max: 30 },
    ],
  },
  {
    id: "security", title: "Security", icon: Shield,
    fields: [
      { key: "session_timeout", label: "Session timeout", type: "number", suffix: "minutes", min: 5, max: 240 },
      { key: "max_login_attempts", label: "Max login attempts", type: "number", suffix: "before 15-min lock", min: 3, max: 10 },
      { key: "require_2fa", label: "Two-factor authentication", type: "select", options: ["Required for admins", "Optional", "Required for everyone"] },
    ],
  },
  {
    id: "backup", title: "Backup & Recovery", icon: Database,
    fields: [
      { key: "backup_schedule", label: "Backup schedule", type: "select", options: ["Hourly", "Every 6 hours", "Daily at 03:00 EAT", "Weekly (Sunday 03:00 EAT)"] },
      { key: "backup_location", label: "Backup location", type: "select", options: ["AWS S3 (eu-west-1)", "AWS S3 (af-south-1)", "On-premise NAS"] },
      { key: "retention_days", label: "Retention period", type: "number", suffix: "days", min: 7, max: 3650 },
    ],
  },
];

const display = (f: FieldDef, v: string) => (f.suffix ? `${v} ${f.suffix}` : v);
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function validateSection(section: SectionDef, draft: SystemSettings): Partial<Record<SettingsKey, string>> {
  const errs: Partial<Record<SettingsKey, string>> = {};
  for (const f of section.fields) {
    const v = (draft[f.key] ?? "").trim();
    if (!v) errs[f.key] = "Required";
    else if (f.type === "email" && !isEmail(v)) errs[f.key] = "Enter a valid email";
    else if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) errs[f.key] = "Enter a number";
      else if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) errs[f.key] = `Must be between ${f.min} and ${f.max}`;
    } else if (f.key === "sms_sender_id" && !/^[A-Za-z0-9]{3,11}$/.test(v)) errs[f.key] = "3–11 letters or digits, no spaces";
  }
  return errs;
}

/** Persisted list that falls back to seed data if an older build stored a different shape. */
function hasField<T>(arr: unknown, field: keyof T): arr is T[] {
  return Array.isArray(arr) && arr.every((x) => x && typeof x === "object" && field in x);
}
function useSafeList<T>(key: string, seed: T[], field: keyof T) {
  const [raw, setRaw] = usePersistedState<T[]>(key, seed);
  const list = hasField<T>(raw, field) ? raw : seed;
  const update = useCallback(
    (fn: (prev: T[]) => T[]) => setRaw((prev) => fn(hasField<T>(prev, field) ? prev : seed)),
    [setRaw, seed, field]
  );
  return [list, update] as const;
}

/* ============================================================
 * Module-level form components (never declare these inside the page)
 * ============================================================ */
type UserErrors = Partial<Record<"name" | "email" | "phone", string>>;

function UserFormFields({
  draft, onChange, roles, errors,
}: { draft: SystemUser; onChange: (u: SystemUser) => void; roles: Role[]; errors: UserErrors }) {
  const set = <K extends keyof SystemUser>(k: K, v: SystemUser[K]) => onChange({ ...draft, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full name" required error={errors.name}>
          <TextInput value={draft.name} onChange={(v) => set("name", v)} placeholder="e.g. John Mugisha" maxLength={60} />
        </FormField>
        <FormField label="Email" required error={errors.email}>
          <TextInput type="email" value={draft.email} onChange={(v) => set("email", v)} placeholder="name@silvervibe.coop" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Phone" error={errors.phone}>
          <TextInput value={draft.phone} onChange={(v) => set("phone", v)} placeholder="+256 7XX XXX XXX" maxLength={20} />
        </FormField>
        <FormField label="Role" hint={draft.protected ? "The owner account always keeps Super Admin." : undefined}>
          <SelectInput
            value={draft.role_id}
            disabled={draft.protected}
            onChange={(v) => set("role_id", v)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
        </FormField>
      </div>
      <FormField label="Status" hint={draft.protected ? "The owner account cannot be deactivated." : undefined}>
        <SelectInput
          value={draft.status}
          disabled={draft.protected}
          onChange={(v) => set("status", v as SystemUser["status"])}
          options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
        />
      </FormField>
      <ToggleSwitch checked={draft.two_factor} onChange={(v) => set("two_factor", v)} label="Two-factor authentication" description="Require a one-time code at sign-in" />
    </div>
  );
}

function PermissionGrid({ value, onChange, disabled }: { value: Permissions; onChange: (p: Permissions) => void; disabled?: boolean }) {
  const toggle = (m: ModuleName, a: PermAction) => {
    const cur = value[m];
    const on = !cur[a];
    // create/approve imply view; removing view removes everything for that module.
    const next = a === "view" ? (on ? { ...cur, view: true } : { view: false, create: false, approve: false }) : { ...cur, [a]: on, view: on ? true : cur.view };
    onChange({ ...value, [m]: next });
  };
  const column = (a: PermAction) => {
    const allOn = MODULES.every((m) => value[m][a]);
    const next = { ...value };
    for (const m of MODULES) {
      next[m] = a === "view"
        ? (allOn ? { view: false, create: false, approve: false } : { ...value[m], view: true })
        : { ...value[m], [a]: !allOn, view: !allOn ? true : value[m].view };
    }
    onChange(next);
  };
  return (
    <div className="overflow-x-auto border dm-border rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="dm-surface-hover">
            <th className="text-left px-3 py-2 text-xs font-semibold dm-text-secondary">Module</th>
            {ACTIONS.map((a) => (
              <th key={a} className="px-3 py-2 text-xs font-semibold dm-text-secondary capitalize text-center">
                <button type="button" disabled={disabled} onClick={() => column(a)} className="capitalize hover:underline disabled:no-underline disabled:cursor-default" title={`Toggle ${a} for all modules`}>
                  {a}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m) => (
            <tr key={m} className="border-t dm-border">
              <td className="px-3 py-2 dm-text">{m}</td>
              {ACTIONS.map((a) => (
                <td key={a} className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${m} ${a}`}
                    checked={value[m][a]}
                    disabled={disabled}
                    onChange={() => toggle(m, a)}
                    className="w-4 h-4 accent-[#4A90D9] cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function permissionSummary(p: Permissions): string[] {
  if (MODULES.every((m) => ACTIONS.every((a) => p[m][a]))) return ["Full access to every module"];
  return MODULES.filter((m) => p[m].view).map((m) => `${m}: ${ACTIONS.filter((a) => p[m][a]).join(", ")}`);
}

/* ============================================================
 * Page
 * ============================================================ */
type TabId = "users" | "roles" | "audit" | "system";
const TAB_IDS: TabId[] = ["users", "roles", "audit", "system"];

export default function AdminSettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab") as TabId | null;
  const tab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "users";
  const setTab = (t: TabId) => router.replace(`/admin/settings?tab=${t}`, { scroll: false });

  // Logged-in user (read only after the auth store hydrates, so SSR and first client render match).
  const authReady = useAuthHydrated();
  const authUser = useAuthStore((s) => s.user);
  const myEmail = (authReady ? authUser?.email : undefined)?.toLowerCase();
  const actor = (authReady && authUser?.name) || DEMO_ADMIN.full_name;

  const [users, setUsers] = useSafeList<SystemUser>("admin_system_users", SEED_USERS, "role_id");
  const [roles, setRoles] = useSafeList<Role>("admin_roles", SEED_ROLES, "permissions");
  const [audit, setAudit] = useSafeList<AuditEntry>("admin_audit_log", SEED_AUDIT, "module");
  const [storedSettings, setStoredSettings] = usePersistedState<Partial<SystemSettings>>("admin_system_settings", SEED_SETTINGS);
  // Merge over defaults so new keys appear even if an older shape is stored.
  const settings: SystemSettings = { ...SEED_SETTINGS, ...(storedSettings && typeof storedSettings === "object" ? storedSettings : {}) };

  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);
  const roleName = (id: string) => roleById[id]?.name ?? "Unassigned";

  const log = (module: string, action: string, detail: string, severity: AuditEntry["severity"] = "info") =>
    setAudit((prev) => [{ id: uid("au"), timestamp: localStamp(new Date()), user: actor, module, action, detail, severity }, ...prev]);

  /* ---------------- Users ---------------- */
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userDraft, setUserDraft] = useState<SystemUser | null>(null);
  const [userErrors, setUserErrors] = useState<UserErrors>({});
  const [userDelete, setUserDelete] = useState<SystemUser | null>(null);

  const openUser = (u?: SystemUser) => {
    setUserDraft(u ? { ...u } : { ...EMPTY_USER });
    setUserErrors({});
  };

  const saveUser = () => {
    if (!userDraft) return;
    const name = userDraft.name.trim();
    const email = userDraft.email.trim().toLowerCase();
    const errs: UserErrors = {};
    if (!name) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!isEmail(email)) errs.email = "Enter a valid email address";
    else if (users.some((u) => u.id !== userDraft.id && u.email.toLowerCase() === email)) errs.email = "Another user already has this email";
    if (userDraft.phone && !/^\+?[\d\s-]{9,20}$/.test(userDraft.phone)) errs.phone = "Enter a valid phone number";
    if (Object.keys(errs).length) return setUserErrors(errs);

    const prev = users.find((u) => u.id === userDraft.id);
    // Protected (owner) account always keeps its role and active status.
    const clean: SystemUser = prev?.protected
      ? { ...userDraft, name, email, role_id: prev.role_id, status: "active", protected: true }
      : { ...userDraft, name, email };

    if (prev) {
      setUsers((list) => list.map((u) => (u.id === clean.id ? clean : u)));
      const changes: string[] = [];
      if (prev.role_id !== clean.role_id) changes.push(`role ${roleName(prev.role_id)} → ${roleName(clean.role_id)}`);
      if (prev.status !== clean.status) changes.push(`status ${prev.status} → ${clean.status}`);
      if (prev.email !== clean.email) changes.push(`email → ${clean.email}`);
      if (prev.two_factor !== clean.two_factor) changes.push(`2FA ${clean.two_factor ? "on" : "off"}`);
      log("Settings", prev.role_id !== clean.role_id ? "Role changed" : "User updated", `${clean.name}${changes.length ? `: ${changes.join("; ")}` : ""}`, prev.role_id !== clean.role_id ? "important" : "info");
      showToast(`${clean.name} updated`);
    } else {
      setUsers((list) => [...list, { ...clean, id: uid("usr") }]);
      log("Settings", "User created", `${clean.name} (${clean.email}) as ${roleName(clean.role_id)}`, "important");
      showToast(`${clean.name} added — invitation sent to ${clean.email}`);
    }
    setUserDraft(null);
  };

  const toggle2fa = (u: SystemUser) => {
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, two_factor: !x.two_factor } : x)));
    log("Settings", u.two_factor ? "2FA disabled" : "2FA enabled", u.name, u.two_factor ? "warning" : "info");
    showToast(`Two-factor authentication ${u.two_factor ? "disabled" : "enabled"} for ${u.name}`, u.two_factor ? "info" : "success");
  };

  const toggleActive = (u: SystemUser) => {
    if (u.protected) return;
    const next = u.status === "active" ? "inactive" : "active";
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    log("Settings", next === "active" ? "User activated" : "User deactivated", u.name, "important");
    showToast(`${u.name} ${next === "active" ? "activated" : "deactivated"}`, next === "active" ? "success" : "info");
  };

  const resetPassword = (u: SystemUser) => {
    log("Settings", "Password reset", `Reset link emailed to ${u.email}`, "important");
    showToast(`Password reset link sent to ${u.email}`);
  };

  const shownUsers = users.filter((u) => {
    if (userRoleFilter !== "all" && u.role_id !== userRoleFilter) return false;
    const q = userQuery.trim().toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  /* ---------------- Roles ---------------- */
  const [roleDraft, setRoleDraft] = useState<Role | null>(null);
  const [roleErr, setRoleErr] = useState<string | null>(null);
  const [roleDelete, setRoleDelete] = useState<Role | null>(null);
  const userCount = (roleId: string) => users.filter((u) => u.role_id === roleId).length;

  const openRole = (r?: Role) => {
    setRoleDraft(r ? { ...r, permissions: structuredClone(r.permissions) } : { id: "", name: "", description: "", color: ROLE_COLORS[6], permissions: perms({ Members: "v" }) });
    setRoleErr(null);
  };

  const saveRole = () => {
    if (!roleDraft) return;
    const name = roleDraft.name.trim();
    if (!name) return setRoleErr("Role name is required.");
    if (roles.some((r) => r.id !== roleDraft.id && r.name.toLowerCase() === name.toLowerCase())) return setRoleErr("A role with this name already exists.");
    if (!MODULES.some((m) => roleDraft.permissions[m].view)) return setRoleErr("Grant at least one permission.");
    const prev = roles.find((r) => r.id === roleDraft.id);
    // Built-in Super Admin keeps its name and full permissions.
    const clean: Role = prev?.protected ? { ...prev, description: roleDraft.description, color: roleDraft.color } : { ...roleDraft, name };
    if (prev) {
      setRoles((list) => list.map((r) => (r.id === clean.id ? clean : r)));
      log("Settings", "Role updated", `${clean.name}: ${permissionSummary(clean.permissions).join(" · ")}`, "important");
      showToast(`Role "${clean.name}" updated`);
    } else {
      setRoles((list) => [...list, { ...clean, id: uid("role") }]);
      log("Settings", "Role created", `${clean.name}: ${permissionSummary(clean.permissions).join(" · ")}`, "important");
      showToast(`Role "${clean.name}" created`);
    }
    setRoleDraft(null);
  };

  /* ---------------- Audit ---------------- */
  const [auditQuery, setAuditQuery] = useState("");
  const [auditModule, setAuditModule] = useState("all");
  const [auditUser, setAuditUser] = useState("all");
  const auditUsers = useMemo(() => [...new Set(audit.map((a) => a.user))].sort(), [audit]);
  const shownAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return [...audit]
      .sort((a, b) => stampTime(b.timestamp) - stampTime(a.timestamp))
      .filter((a) => (auditModule === "all" || a.module === auditModule) && (auditUser === "all" || a.user === auditUser))
      .filter((a) => !q || `${a.action} ${a.detail} ${a.user}`.toLowerCase().includes(q));
  }, [audit, auditQuery, auditModule, auditUser]);

  /* ---------------- System settings ---------------- */
  const [editSection, setEditSection] = useState<SectionDef | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SystemSettings>(SEED_SETTINGS);
  const [settingsErrs, setSettingsErrs] = useState<Partial<Record<SettingsKey, string>>>({});
  const [backingUp, setBackingUp] = useState(false);

  const openSection = (s: SectionDef) => {
    setSettingsDraft({ ...settings }); // local copy initialised on open; Cancel just discards it
    setSettingsErrs({});
    setEditSection(s);
  };

  const saveSection = () => {
    if (!editSection) return;
    const errs = validateSection(editSection, settingsDraft);
    if (Object.keys(errs).length) return setSettingsErrs(errs);
    const changed = editSection.fields.filter((f) => settingsDraft[f.key].trim() !== settings[f.key]);
    if (changed.length === 0) {
      setEditSection(null);
      return showToast("No changes to save", "info");
    }
    const patch = Object.fromEntries(changed.map((f) => [f.key, settingsDraft[f.key].trim()])) as Partial<SystemSettings>;
    setStoredSettings((prev) => ({ ...SEED_SETTINGS, ...prev, ...patch }));
    log("Settings", `${editSection.title} settings changed`, changed.map((f) => `${f.label}: ${settings[f.key]} → ${patch[f.key]}`).join("; "), "important");
    showToast(`${editSection.title} settings saved`);
    setEditSection(null);
  };

  const runBackup = () => {
    if (backingUp) return;
    setBackingUp(true);
    // Simulated backup job.
    setTimeout(() => {
      const at = new Date().toISOString();
      setStoredSettings((prev) => ({ ...SEED_SETTINGS, ...prev, last_backup: at }));
      log("Settings", "Manual backup", `On-demand backup (2.4 GB) to ${settings.backup_location}`, "info");
      setBackingUp(false);
      showToast("Backup completed successfully");
    }, 1200);
  };

  /* ---------------- Summary ---------------- */
  const activeUsers = users.filter((u) => u.status === "active").length;
  const twoFaPct = users.length ? Math.round((users.filter((u) => u.two_factor).length / users.length) * 100) : 0;

  const tabs = [
    { id: "users" as const, label: "Users", count: users.length },
    { id: "roles" as const, label: "Roles & Permissions", count: roles.length },
    { id: "audit" as const, label: "Audit Log", count: audit.length },
    { id: "system" as const, label: "System" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Settings" subtitle="System users, roles and permissions, audit trail and configuration" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="System users" value={users.length} sub={`${activeUsers} active`} icon={Users} />
        <StatCard label="Roles" value={roles.length} sub={`${roles.filter((r) => userCount(r.id) === 0).length} unassigned`} icon={ShieldCheck} color="#a855f7" />
        <StatCard label="2FA adoption" value={`${twoFaPct}%`} sub={settings.require_2fa} icon={Lock} color="#22c55e" />
        <StatCard label="Last backup" value={formatDateTime(settings.last_backup).split(", ")[0]} sub={formatDateTime(settings.last_backup).split(", ")[1]} icon={Database} color="#f59e0b" />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ================= Users ================= */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 dm-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <TextInput value={userQuery} onChange={setUserQuery} placeholder="Search name or email…" className="pl-9" aria-label="Search users" />
              </div>
              <div className="sm:w-48">
                <SelectInput value={userRoleFilter} onChange={setUserRoleFilter} options={[{ value: "all", label: "All roles" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
              </div>
            </div>
            <Button onClick={() => openUser()}><Plus className="w-4 h-4" /> Add User</Button>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            {shownUsers.length === 0 ? (
              <EmptyState icon={Users} title="No users match" hint="Change the search or role filter." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="dm-surface-hover border-b dm-border">
                      {["User", "Role", "Status", "2FA", "Last login"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">{h}</th>
                      ))}
                      <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownUsers.map((u) => {
                      const isMe = !!myEmail && u.email.toLowerCase() === myEmail;
                      const role = roleById[u.role_id];
                      return (
                        <tr key={u.id} className={cn("border-b dm-border last:border-0 hover:dm-surface-hover", isMe && "bg-[#4A90D9]/5")}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: role?.color ?? "#64748b" }}>
                                <span className="text-white text-[10px] font-bold">{getInitials(u.name)}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium dm-text flex items-center gap-1.5">
                                  {u.name}
                                  {isMe && <Badge status="You" tone="blue" />}
                                  {u.protected && <span title="Owner account — protected"><Shield className="w-3 h-3 text-[#ef4444]" /></span>}
                                </p>
                                <p className="text-[11px] dm-text-secondary">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs dm-text">{roleName(u.role_id)}</td>
                          <td className="px-4 py-3"><Badge status={u.status} /></td>
                          <td className="px-4 py-3">
                            {u.two_factor ? (
                              <span className="flex items-center gap-1 text-xs text-[#16a34a]"><Lock className="w-3 h-3" /> On</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-[#d97706]"><Unlock className="w-3 h-3" /> Off</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs dm-text-secondary whitespace-nowrap">{u.last_login ? formatDateTime(u.last_login) : "Never"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <IconBtn label={`Edit ${u.name}`} icon={Edit2} onClick={() => openUser(u)} />
                              <IconBtn label={u.two_factor ? `Disable 2FA for ${u.name}` : `Enable 2FA for ${u.name}`} icon={Key} onClick={() => toggle2fa(u)} />
                              <IconBtn label={`Reset password for ${u.name}`} icon={RotateCcw} onClick={() => resetPassword(u)} />
                              <IconBtn
                                label={u.protected ? "Owner account cannot be deactivated" : u.status === "active" ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                                icon={u.status === "active" ? UserX : UserCheck}
                                disabled={u.protected}
                                onClick={() => toggleActive(u)}
                              />
                              <IconBtn label={u.protected ? "Owner account cannot be deleted" : `Delete ${u.name}`} icon={Trash2} danger disabled={u.protected} onClick={() => setUserDelete(u)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= Roles ================= */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openRole()}><Plus className="w-4 h-4" /> Create Role</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => {
              const count = userCount(r.id);
              return (
                <div key={r.id} className="glass-card rounded-xl p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${r.color}1a` }}>
                        <Shield className="w-4 h-4" style={{ color: r.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold dm-text text-sm flex items-center gap-1.5">
                          {r.name} {r.protected && <Badge status="Built-in" tone="red" />}
                        </h3>
                        <button type="button" onClick={() => { setUserRoleFilter(r.id); setUserQuery(""); setTab("users"); }} className="text-[11px] text-[#4A90D9] hover:underline">
                          {count} user{count === 1 ? "" : "s"}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <IconBtn label={`Edit ${r.name}`} icon={Edit2} onClick={() => openRole(r)} />
                      <IconBtn
                        label={r.protected ? "Built-in role cannot be deleted" : count > 0 ? `Reassign ${count} user(s) before deleting` : `Delete ${r.name}`}
                        icon={Trash2}
                        danger
                        disabled={r.protected || count > 0}
                        onClick={() => setRoleDelete(r)}
                      />
                    </div>
                  </div>
                  {r.description && <p className="text-xs dm-text-secondary mb-2">{r.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {permissionSummary(r.permissions).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md text-[11px] dm-surface-hover dm-text-secondary">{s}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= Audit ================= */}
      {tab === "audit" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col lg:flex-row gap-2 lg:items-center justify-between border-b dm-border">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 dm-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <TextInput value={auditQuery} onChange={setAuditQuery} placeholder="Search action or detail…" className="pl-9" aria-label="Search audit log" />
              </div>
              <div className="sm:w-44">
                <SelectInput value={auditModule} onChange={setAuditModule} options={[{ value: "all", label: "All modules" }, ...AUDIT_MODULES.map((m) => ({ value: m, label: m }))]} />
              </div>
              <div className="sm:w-44">
                <SelectInput value={auditUser} onChange={setAuditUser} options={[{ value: "all", label: "All users" }, ...auditUsers.map((u) => ({ value: u, label: u }))]} />
              </div>
            </div>
            <Button
              variant="secondary"
              disabled={shownAudit.length === 0}
              onClick={() => {
                exportToCsv("audit-log", shownAudit.map((a) => ({ ...a, timestamp: formatDateTime(a.timestamp) })), [
                  { key: "timestamp", label: "Timestamp" }, { key: "user", label: "User" }, { key: "module", label: "Module" },
                  { key: "action", label: "Action" }, { key: "detail", label: "Detail" }, { key: "severity", label: "Severity" },
                ]);
                showToast(`Exported ${shownAudit.length} audit entries`);
              }}
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
          {shownAudit.length === 0 ? (
            <EmptyState icon={Search} title="No audit entries match" hint="Change the filters or search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dm-surface-hover border-b dm-border">
                    {["Timestamp", "User", "Module", "Action", "Detail", "Severity"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownAudit.map((a) => (
                    <tr key={a.id} className="border-b dm-border last:border-0 hover:dm-surface-hover">
                      <td className="px-4 py-3 text-xs dm-text-secondary whitespace-nowrap">{formatDateTime(a.timestamp)}</td>
                      <td className="px-4 py-3 text-xs dm-text whitespace-nowrap">{a.user}</td>
                      <td className="px-4 py-3 text-xs dm-text-secondary">{a.module}</td>
                      <td className="px-4 py-3 text-xs font-medium dm-text whitespace-nowrap">{a.action}</td>
                      <td className="px-4 py-3 text-xs dm-text-secondary min-w-[240px]">{a.detail}</td>
                      <td className="px-4 py-3"><Badge status={a.severity} tone={a.severity === "warning" ? "amber" : a.severity === "important" ? "blue" : "gray"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= System ================= */}
      {tab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SECTIONS.map((section) => (
            <div key={section.id} className="glass-card rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="w-5 h-5 dm-text" />
                <h3 className="font-semibold dm-text">{section.title}</h3>
              </div>
              <dl className="space-y-1 flex-1">
                {section.fields.map((f) => (
                  <div key={f.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b dm-border last:border-0">
                    <dt className="text-xs dm-text-secondary">{f.label}</dt>
                    <dd className="text-xs font-medium dm-text sm:text-right">{display(f, settings[f.key])}</dd>
                  </div>
                ))}
                {section.id === "backup" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2">
                    <dt className="text-xs dm-text-secondary">Last backup</dt>
                    <dd className="text-xs font-medium dm-text">{formatDateTime(settings.last_backup)} · 2.4 GB</dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="secondary" className="px-4 py-2 text-xs rounded-lg" onClick={() => openSection(section)}>
                  <Edit2 className="w-3 h-3" /> Edit Settings
                </Button>
                {section.id === "backup" && (
                  <Button className="px-4 py-2 text-xs rounded-lg" disabled={backingUp} onClick={runBackup}>
                    {backingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDriveDownload className="w-3 h-3" />}
                    {backingUp ? "Backing up…" : "Run backup now"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= Modals ================= */}
      <Modal
        open={!!userDraft}
        onClose={() => setUserDraft(null)}
        title={userDraft?.id ? `Edit user — ${users.find((u) => u.id === userDraft.id)?.name ?? ""}` : "Add system user"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUserDraft(null)}>Cancel</Button>
            <Button variant="accent" onClick={saveUser}>{userDraft?.id ? "Save Changes" : "Add User"}</Button>
          </>
        }
      >
        {userDraft && (
          <UserFormFields
            draft={userDraft}
            onChange={(d) => { setUserDraft(d); setUserErrors({}); }}
            roles={roles}
            errors={userErrors}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!userDelete}
        onClose={() => setUserDelete(null)}
        onConfirm={() => {
          if (!userDelete || userDelete.protected) return;
          setUsers((list) => list.filter((u) => u.id !== userDelete.id));
          log("Settings", "User deleted", `${userDelete.name} (${userDelete.email})`, "important");
          showToast(`${userDelete.name} removed`, "info");
        }}
        title="Remove user"
        message={<>Remove <b>{userDelete?.name}</b> ({userDelete?.email})? Their system access is revoked immediately.</>}
        confirmLabel="Remove user"
        danger
      />

      <Modal
        open={!!roleDraft}
        onClose={() => setRoleDraft(null)}
        title={roleDraft?.id ? `Edit role — ${roleDraft.name}` : "Create role"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoleDraft(null)}>Cancel</Button>
            <Button variant="accent" onClick={saveRole}>{roleDraft?.id ? "Save Role" : "Create Role"}</Button>
          </>
        }
      >
        {roleDraft && (
          <div className="space-y-4">
            <FormField label="Role name" required hint={roleDraft.protected ? "Built-in role — name and permissions are fixed." : undefined}>
              <TextInput value={roleDraft.name} disabled={roleDraft.protected} onChange={(v) => { setRoleDraft({ ...roleDraft, name: v }); setRoleErr(null); }} placeholder="e.g. Credit Committee" maxLength={40} />
            </FormField>
            <FormField label="Description">
              <TextAreaInput value={roleDraft.description} onChange={(v) => setRoleDraft({ ...roleDraft, description: v })} rows={2} maxLength={160} />
            </FormField>
            <FormField label="Colour">
              <div className="flex gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    aria-pressed={roleDraft.color === c}
                    onClick={() => setRoleDraft({ ...roleDraft, color: c })}
                    className={cn("w-7 h-7 rounded-full border-2", roleDraft.color === c ? "border-[#4A90D9] scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </FormField>
            <FormField label="Permissions" hint="Create and approve include view. Click a column heading to toggle it for every module.">
              <PermissionGrid value={roleDraft.permissions} disabled={roleDraft.protected} onChange={(p) => { setRoleDraft({ ...roleDraft, permissions: p }); setRoleErr(null); }} />
            </FormField>
            {roleErr && <p className="text-xs text-[#ef4444]" role="alert">{roleErr}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!roleDelete}
        onClose={() => setRoleDelete(null)}
        onConfirm={() => {
          if (!roleDelete || roleDelete.protected || userCount(roleDelete.id) > 0) return;
          setRoles((list) => list.filter((r) => r.id !== roleDelete.id));
          log("Settings", "Role deleted", roleDelete.name, "important");
          showToast(`Role "${roleDelete.name}" deleted`, "info");
        }}
        title="Delete role"
        message={<>Delete the role <b>{roleDelete?.name}</b>? No users are assigned to it.</>}
        confirmLabel="Delete role"
        danger
      />

      <Modal
        open={!!editSection}
        onClose={() => setEditSection(null)}
        title={`Edit ${editSection?.title ?? ""} settings`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button variant="accent" onClick={saveSection}>Save Settings</Button>
          </>
        }
      >
        {editSection && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editSection.fields.map((f) => (
              <FormField key={f.key} label={f.suffix ? `${f.label} (${f.suffix})` : f.label} required error={settingsErrs[f.key]} hint={f.hint}>
                {f.type === "select" ? (
                  <SelectInput
                    value={settingsDraft[f.key]}
                    onChange={(v) => setSettingsDraft((d) => ({ ...d, [f.key]: v }))}
                    options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                  />
                ) : (
                  <TextInput
                    type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                    value={settingsDraft[f.key]}
                    onChange={(v) => {
                      setSettingsDraft((d) => ({ ...d, [f.key]: f.key === "sms_sender_id" ? v.toUpperCase() : v }));
                      setSettingsErrs((e) => ({ ...e, [f.key]: undefined }));
                    }}
                    min={f.min}
                    max={f.max}
                    maxLength={f.maxLength}
                  />
                )}
              </FormField>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Small square icon button with tooltip + accessible label. */
function IconBtn({
  label, icon: Icon, onClick, danger, disabled,
}: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        danger ? "hover:bg-[#ef4444]/10" : "hover:dm-surface-hover"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", danger ? "text-[#ef4444]" : "dm-text-secondary")} />
    </button>
  );
}

