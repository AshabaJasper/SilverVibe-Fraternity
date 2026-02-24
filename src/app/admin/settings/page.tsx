"use client";
import { useState } from "react";
import { formatDate, getInitials } from "@/lib/utils";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  Settings, Users, Shield, Clock, Globe, Database, Bell,
  Key, Edit2, Plus, Trash2, CheckCircle, XCircle, Eye,
  Lock, Unlock, Mail, Phone, Save,
} from "lucide-react";

interface SystemUser {
  name: string; email: string; role: string; status: string; lastLogin: string; twoFactor: boolean;
}

const DEFAULT_USERS: SystemUser[] = [
  { name: "Sarah Nakamya", email: "sarah@silvervibe.coop", role: "CEO / Super Admin", status: "active", lastLogin: "2025-01-15 08:30", twoFactor: true },
  { name: "John Mugisha", email: "john@silvervibe.coop", role: "Accountant", status: "active", lastLogin: "2025-01-15 09:00", twoFactor: true },
  { name: "Rose Namulema", email: "rose@silvervibe.coop", role: "Loans Officer", status: "active", lastLogin: "2025-01-14 16:45", twoFactor: false },
  { name: "Peter Ochieng", email: "peter@silvervibe.coop", role: "Teller", status: "active", lastLogin: "2025-01-15 07:55", twoFactor: true },
  { name: "Diana Acan", email: "diana@silvervibe.coop", role: "Member Relations", status: "inactive", lastLogin: "2024-12-20 10:00", twoFactor: false },
];

const ROLES = [
  { name: "Super Admin", users: 1, permissions: "Full system access", color: "#ef4444" },
  { name: "Accountant", users: 1, permissions: "Financial transactions, reports, journal entries", color: "#4A90D9" },
  { name: "Loans Officer", users: 1, permissions: "Loan applications, disbursement, collections", color: "#22c55e" },
  { name: "Teller", users: 1, permissions: "Savings transactions, member queries", color: "#f59e0b" },
  { name: "Member Relations", users: 1, permissions: "Member registration, KYC, support", color: "#a855f7" },
  { name: "Auditor", users: 0, permissions: "Read-only access to all modules", color: "#64748b" },
];

const AUDIT_LOG = [
  { action: "Login", user: "Sarah Nakamya", detail: "Successful login from 192.168.1.45", timestamp: "2025-01-15 08:30:12", severity: "info" },
  { action: "Loan Approval", user: "Sarah Nakamya", detail: "Approved loan LN-2024-098 for Grace Atim (UGX 2,000,000)", timestamp: "2025-01-15 09:15:00", severity: "important" },
  { action: "Journal Entry", user: "John Mugisha", detail: "Created JE-0456: Monthly salary provision", timestamp: "2025-01-15 10:00:00", severity: "info" },
  { action: "Member Registration", user: "Rose Namulema", detail: "Registered new member: Robert Kiggundu (SV-0345)", timestamp: "2025-01-15 11:30:00", severity: "info" },
  { action: "Failed Login", user: "Unknown", detail: "Failed login attempt for diana@silvervibe.coop from 41.202.xxx.xxx", timestamp: "2025-01-14 22:15:00", severity: "warning" },
  { action: "Role Change", user: "Sarah Nakamya", detail: "Changed Peter Ochieng role from Intern to Teller", timestamp: "2025-01-14 14:00:00", severity: "important" },
  { action: "Bulk SMS", user: "Sarah Nakamya", detail: "Sent AGM notice to 342 members via SMS + Email", timestamp: "2025-01-10 15:00:00", severity: "info" },
  { action: "Backup", user: "System", detail: "Automated daily backup completed (2.4 GB)", timestamp: "2025-01-15 02:00:00", severity: "info" },
];

interface SettingsSection {
  title: string;
  icon: React.ElementType;
  fields: { label: string; value: string }[];
}

const EMPTY_USER: SystemUser = { name: "", email: "", role: "Teller", status: "active", lastLogin: "Never", twoFactor: false };

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "audit" | "system">("users");
  const [users, setUsers] = usePersistedState<SystemUser[]>("admin_system_users", DEFAULT_USERS);

  // Modal states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userForm, setUserForm] = useState<SystemUser>(EMPTY_USER);
  const [editingSection, setEditingSection] = useState<SettingsSection | null>(null);

  // Settings data stored in localStorage
  const [systemSettings, setSystemSettings] = usePersistedState("admin_system_settings", {
    orgName: "SilverVibe Fraternity Cooperative Society Ltd",
    regNumber: "CS/2020/12345",
    currency: "UGX (Uganda Shilling)",
    fyStart: "January 1",
    workingDays: "Monday - Friday",
    passwordPolicy: "Min 8 chars, must include uppercase, number, special",
    sessionTimeout: "30 minutes",
    maxLoginAttempts: "5 (lock for 15 minutes)",
    twoFactorAuth: "Optional (recommended)",
    smsGateway: "Africa's Talking (Connected)",
    emailProvider: "SMTP (smtp.silvervibe.coop)",
    loanReminders: "5 days before due date",
    savingsAlerts: "Immediate on transaction",
    autoBackup: "Daily at 2:00 AM EAT",
    backupLocation: "AWS S3 (eu-west-1)",
    retention: "90 days",
    lastBackup: "2025-01-15 02:00 (2.4 GB)",
  });

  const handleAddUser = () => {
    setUsers((prev) => [...prev, { ...userForm, lastLogin: "Never" }]);
    setAddUserOpen(false);
    setUserForm(EMPTY_USER);
    showToast(`User ${userForm.name} added successfully`);
  };

  const handleEditUser = () => {
    setUsers((prev) => prev.map((u) => (u.email === userForm.email ? { ...userForm } : u)));
    setEditUserOpen(false);
    showToast(`User ${userForm.name} updated`);
  };

  const handleDeleteUser = () => {
    setUsers((prev) => prev.filter((u) => u.email !== userForm.email));
    setDeleteConfirmOpen(false);
    showToast(`User ${userForm.name} removed`, "info");
  };

  const inputClass =
    "w-full px-3 py-2.5 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors";

  const settingSections: SettingsSection[] = [
    {
      title: "General Settings", icon: Globe,
      fields: [
        { label: "Organization Name", value: systemSettings.orgName },
        { label: "Registration Number", value: systemSettings.regNumber },
        { label: "Default Currency", value: systemSettings.currency },
        { label: "Financial Year Start", value: systemSettings.fyStart },
        { label: "Working Days", value: systemSettings.workingDays },
      ],
    },
    {
      title: "Security Settings", icon: Shield,
      fields: [
        { label: "Password Policy", value: systemSettings.passwordPolicy },
        { label: "Session Timeout", value: systemSettings.sessionTimeout },
        { label: "Max Login Attempts", value: systemSettings.maxLoginAttempts },
        { label: "Two-Factor Auth", value: systemSettings.twoFactorAuth },
      ],
    },
    {
      title: "Notification Settings", icon: Bell,
      fields: [
        { label: "SMS Gateway", value: systemSettings.smsGateway },
        { label: "Email Provider", value: systemSettings.emailProvider },
        { label: "Auto Loan Reminders", value: systemSettings.loanReminders },
        { label: "Savings Alerts", value: systemSettings.savingsAlerts },
      ],
    },
    {
      title: "Backup & Recovery", icon: Database,
      fields: [
        { label: "Auto Backup", value: systemSettings.autoBackup },
        { label: "Backup Location", value: systemSettings.backupLocation },
        { label: "Retention Period", value: systemSettings.retention },
        { label: "Last Backup", value: systemSettings.lastBackup },
      ],
    },
  ];

  const UserForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium dm-text-secondary mb-1.5">Full Name *</label>
          <input className={inputClass} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="e.g. John Mugisha" />
        </div>
        <div>
          <label className="block text-xs font-medium dm-text-secondary mb-1.5">Email *</label>
          <input className={inputClass} type="email" value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            placeholder="user@silvervibe.coop" disabled={editUserOpen} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium dm-text-secondary mb-1.5">Role</label>
          <select className={inputClass} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
            {ROLES.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium dm-text-secondary mb-1.5">Status</label>
          <select className={inputClass} value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={userForm.twoFactor} onChange={(e) => setUserForm({ ...userForm, twoFactor: e.target.checked })} className="sr-only peer" />
          <div className="w-9 h-5 bg-[#e2e8f0] peer-focus:ring-2 peer-focus:ring-[#4A90D9]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:dm-surface after:dm-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A90D9]"></div>
        </label>
        <span className="text-xs dm-text-secondary">Enable Two-Factor Authentication</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dm-text">Settings</h1>
          <p className="dm-text-secondary text-sm">System configuration, users, roles, and audit logs</p>
        </div>
      </div>

      <div className="flex gap-1 dm-surface-hover rounded-xl p-1 overflow-x-auto">
        {(["users", "roles", "audit", "system"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === t ? "dm-surface dm-text shadow-sm" : "dm-text-secondary hover:dm-text"
            }`}>{t === "audit" ? "Audit Log" : t === "system" ? "System" : t}</button>
        ))}
      </div>

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setUserForm(EMPTY_USER); setAddUserOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          <div className="dm-surface rounded-xl border dm-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b dm-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">2FA</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Last Login</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold dm-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email} className="border-b dm-border hover:bg-[#f8f9fa]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">{getInitials(u.name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium dm-text">{u.name}</p>
                            <p className="text-[10px] text-[#C0C0C0]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs dm-text">{u.role}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          u.status === "active" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#64748b]/10 dm-text-secondary"
                        }`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.twoFactor ? (
                          <span className="flex items-center gap-1 text-xs text-[#22c55e]"><Lock className="w-3 h-3" /> Enabled</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-[#f59e0b]"><Unlock className="w-3 h-3" /> Disabled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs dm-text-secondary">{u.lastLogin}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setUserForm({ ...u }); setEditUserOpen(true); }}
                            className="p-1.5 rounded-lg hover:dm-surface-hover"><Edit2 className="w-3.5 h-3.5 dm-text-secondary" /></button>
                          <button onClick={() => {
                            setUsers((prev) => prev.map((x) => x.email === u.email ? { ...x, twoFactor: !x.twoFactor } : x));
                            showToast(`2FA ${u.twoFactor ? "disabled" : "enabled"} for ${u.name}`);
                          }} className="p-1.5 rounded-lg hover:dm-surface-hover"><Key className="w-3.5 h-3.5 dm-text-secondary" /></button>
                          {u.role !== "CEO / Super Admin" && (
                            <button onClick={() => { setUserForm({ ...u }); setDeleteConfirmOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-[#ef4444]/5"><Trash2 className="w-3.5 h-3.5 text-[#ef4444]" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
              <Plus className="w-4 h-4" /> Create Role
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map((r) => (
              <div key={r.name} className="dm-surface rounded-xl p-5 border dm-border hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${r.color}15` }}>
                      <Shield className="w-4 h-4" style={{ color: r.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold dm-text text-sm">{r.name}</h3>
                      <p className="text-[10px] text-[#C0C0C0]">{r.users} user(s)</p>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:dm-surface-hover"><Edit2 className="w-3.5 h-3.5 dm-text-secondary" /></button>
                </div>
                <p className="text-xs dm-text-secondary">{r.permissions}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="dm-surface rounded-xl border dm-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b dm-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Detail</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Severity</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_LOG.map((a, i) => (
                  <tr key={i} className="border-b dm-border hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3 text-xs dm-text-secondary whitespace-nowrap">{a.timestamp}</td>
                    <td className="px-4 py-3 text-xs font-medium dm-text">{a.action}</td>
                    <td className="px-4 py-3 text-xs dm-text">{a.user}</td>
                    <td className="px-4 py-3 text-xs dm-text-secondary max-w-xs truncate">{a.detail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        a.severity === "warning" ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                        a.severity === "important" ? "bg-[#4A90D9]/10 text-[#4A90D9]" :
                        "bg-[#64748b]/10 dm-text-secondary"
                      }`}>{a.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "system" && (
        <div className="space-y-4">
          {settingSections.map((section) => (
            <div key={section.title} className="dm-surface rounded-xl p-6 border dm-border">
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="w-5 h-5 dm-text" />
                <h3 className="font-semibold dm-text">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.fields.map((f) => (
                  <div key={f.label} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b dm-border last:border-0">
                    <span className="text-xs dm-text-secondary">{f.label}</span>
                    <span className="text-xs font-medium dm-text">{f.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setEditingSection(section); setEditSettingsOpen(true); }}
                className="mt-4 px-4 py-2 border dm-border rounded-lg text-xs font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
                <Edit2 className="w-3 h-3 inline mr-1" /> Edit Settings
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ======== ADD USER MODAL ======== */}
      <Modal open={addUserOpen} onClose={() => setAddUserOpen(false)} title="Add System User" size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAddUserOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleAddUser} disabled={!userForm.name || !userForm.email}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
        }>
        <UserForm />
      </Modal>

      {/* ======== EDIT USER MODAL ======== */}
      <Modal open={editUserOpen} onClose={() => setEditUserOpen(false)} title={`Edit User — ${userForm.name}`} size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditUserOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleEditUser}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        }>
        <UserForm />
      </Modal>

      {/* ======== DELETE USER CONFIRM ======== */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Remove User" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleDeleteUser}
              className="px-5 py-2.5 bg-[#ef4444] text-white rounded-xl text-sm font-medium hover:bg-[#dc2626] transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Remove User
            </button>
          </div>
        }>
        <p className="text-sm dm-text">Are you sure you want to remove <b>{userForm.name}</b> ({userForm.email})?</p>
        <p className="text-xs dm-text-secondary mt-1">This will revoke their system access immediately.</p>
      </Modal>

      {/* ======== EDIT SETTINGS MODAL ======== */}
      <Modal open={editSettingsOpen && !!editingSection} onClose={() => setEditSettingsOpen(false)}
        title={`Edit ${editingSection?.title || ""}`} size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditSettingsOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={() => { setEditSettingsOpen(false); showToast(`${editingSection?.title} updated successfully`); }}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Settings
            </button>
          </div>
        }>
        {editingSection && (
          <div className="space-y-4">
            {editingSection.fields.map((f) => {
              const key = Object.entries(systemSettings).find(([, v]) => v === f.value)?.[0] || "";
              return (
                <div key={f.label}>
                  <label className="block text-xs font-medium dm-text-secondary mb-1.5">{f.label}</label>
                  <input className={inputClass}
                    value={f.value}
                    onChange={(e) => {
                      if (key) {
                        setSystemSettings((prev) => ({ ...prev, [key]: e.target.value }));
                      }
                    }} />
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
