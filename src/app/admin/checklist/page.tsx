"use client";
import { useState } from "react";
import {
  CheckCircle, Circle, ChevronDown, ChevronRight,
  Users, PiggyBank, Landmark, BarChart3, FileText,
  Settings, MessageSquare, Shield, TrendingUp, Globe,
  Database, Smartphone, Lock, CreditCard, Bell,
  Layers, Award, Scale, BookOpen, Megaphone,
} from "lucide-react";

interface Feature {
  name: string;
  status: "done" | "demo" | "planned";
  note?: string;
}

interface Module {
  title: string;
  icon: React.ElementType;
  color: string;
  features: Feature[];
}

const MODULES: Module[] = [
  {
    title: "Member Management",
    icon: Users,
    color: "#4A90D9",
    features: [
      { name: "Member registration with auto SV numbering", status: "done" },
      { name: "Member profile (view / edit / delete)", status: "done" },
      { name: "KYC verification workflow", status: "done" },
      { name: "Status management (Active / Suspended / Dormant)", status: "done" },
      { name: "Member search & filter by status", status: "done" },
      { name: "Bulk import / export members", status: "planned", note: "Backend required" },
      { name: "Member document uploads", status: "planned", note: "Backend required" },
      { name: "Next-of-kin management", status: "planned" },
    ],
  },
  {
    title: "Savings Management",
    icon: PiggyBank,
    color: "#22c55e",
    features: [
      { name: "Multiple savings products (Regular, Fixed, Junior, Holiday)", status: "done" },
      { name: "Configure savings products (rate, min deposit, status)", status: "done" },
      { name: "Record deposits / withdrawals / transfers", status: "done" },
      { name: "Transaction posting & approval", status: "done" },
      { name: "Savings overview dashboard with charts", status: "done" },
      { name: "Interest calculation & accrual", status: "planned", note: "Backend required" },
      { name: "Savings statements generation", status: "planned" },
    ],
  },
  {
    title: "Loan Management",
    icon: Landmark,
    color: "#f59e0b",
    features: [
      { name: "Loan application review with credit scoring", status: "done" },
      { name: "Approve / Decline workflow with reasons", status: "done" },
      { name: "Multiple loan products with configurable terms", status: "done" },
      { name: "Guarantor tracking", status: "done" },
      { name: "Loan portfolio overview with KPIs", status: "done" },
      { name: "Loan disbursement processing", status: "planned", note: "Backend required" },
      { name: "Repayment schedule generation", status: "planned" },
      { name: "Automated penalty calculation", status: "planned" },
      { name: "Loan restructuring", status: "planned" },
    ],
  },
  {
    title: "Shares & Dividends",
    icon: Award,
    color: "#a855f7",
    features: [
      { name: "Share issuance with auto-calculation", status: "done" },
      { name: "Shareholder registry with edit", status: "done" },
      { name: "Share configuration (value, min/max, dividend rate)", status: "done" },
      { name: "Share growth chart", status: "done" },
      { name: "Dividend history tracking", status: "done" },
      { name: "Investment Units (IU) management", status: "demo", note: "Read-only display" },
      { name: "Dividend declaration & distribution", status: "planned", note: "Backend required" },
      { name: "Share transfer between members", status: "planned" },
    ],
  },
  {
    title: "Accounting & Finance",
    icon: BookOpen,
    color: "#ef4444",
    features: [
      { name: "Journal entry creation (draft/pending/posted)", status: "done" },
      { name: "Journal entry posting & approval", status: "done" },
      { name: "Trial balance with balance check", status: "done" },
      { name: "Income vs Expense charts", status: "done" },
      { name: "Expense breakdown (pie chart)", status: "done" },
      { name: "Financial statements catalog", status: "demo", note: "Generate button UI only" },
      { name: "Chart of accounts management", status: "planned" },
      { name: "Automated reconciliation", status: "planned" },
      { name: "Budget tracking", status: "planned" },
    ],
  },
  {
    title: "Communications",
    icon: Megaphone,
    color: "#4A90D9",
    features: [
      { name: "Announcement management (create, edit, delete)", status: "done" },
      { name: "Send announcements to audience groups", status: "done" },
      { name: "Message compose (SMS / Email / Push)", status: "done" },
      { name: "Save as draft", status: "done" },
      { name: "SMS templates library", status: "done" },
      { name: "Message delivery history", status: "demo", note: "Static data" },
      { name: "Actual SMS/Email gateway integration", status: "planned", note: "Backend required" },
      { name: "Automated reminders (loan, savings)", status: "planned" },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    color: "#22c55e",
    features: [
      { name: "Admin dashboard with KPIs", status: "done" },
      { name: "Savings growth chart (Line/Area)", status: "done" },
      { name: "Loan performance chart (stacked Bar)", status: "done" },
      { name: "Portfolio quality (Pie chart)", status: "done" },
      { name: "Report catalog with categories", status: "demo", note: "UI only" },
      { name: "PDF / Excel report export", status: "planned" },
      { name: "Custom report builder", status: "planned" },
      { name: "Regulatory reports (UMRA compliance)", status: "planned" },
    ],
  },
  {
    title: "System Settings",
    icon: Settings,
    color: "#64748b",
    features: [
      { name: "Organization settings (name, reg, currency, FY)", status: "done" },
      { name: "Security settings (password, session, login attempts)", status: "done" },
      { name: "Integration settings (SMS, email providers)", status: "done" },
      { name: "Notification preferences (loan, savings alerts)", status: "done" },
      { name: "Backup & recovery settings", status: "done" },
      { name: "User management (add, edit, delete, role assignment)", status: "done" },
      { name: "Two-factor authentication toggle", status: "done" },
      { name: "Audit log viewing", status: "demo", note: "Static data" },
      { name: "Role-based access control (RBAC)", status: "planned", note: "Backend required" },
    ],
  },
  {
    title: "Member Portal",
    icon: Globe,
    color: "#4A90D9",
    features: [
      { name: "Member dashboard with financial summary", status: "done" },
      { name: "Savings account overview", status: "done" },
      { name: "Loan status & repayment history", status: "done" },
      { name: "Share portfolio view", status: "done" },
      { name: "Profile management", status: "done" },
      { name: "Notifications center", status: "done" },
      { name: "Support ticket system", status: "demo", note: "UI only" },
      { name: "Online loan application", status: "planned" },
      { name: "Mobile Money deposit integration", status: "planned" },
    ],
  },
  {
    title: "Security & Infrastructure",
    icon: Shield,
    color: "#ef4444",
    features: [
      { name: "Authentication UI (admin + portal login)", status: "done" },
      { name: "Auth state management (Zustand store)", status: "done" },
      { name: "Responsive design (mobile / tablet / desktop)", status: "done" },
      { name: "Dark mode ready theme system", status: "demo", note: "Theme tokens defined" },
      { name: "localStorage persistence layer", status: "done" },
      { name: "Reusable Modal component", status: "done" },
      { name: "Toast notification system", status: "done" },
      { name: "Backend API integration", status: "planned", note: "API development needed" },
      { name: "Database setup (PostgreSQL)", status: "planned" },
      { name: "JWT authentication", status: "planned" },
      { name: "Data encryption at rest", status: "planned" },
    ],
  },
];

const statusConfig = {
  done: { label: "Implemented", bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", icon: CheckCircle },
  demo: { label: "Demo/UI Only", bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", icon: Circle },
  planned: { label: "Planned", bg: "bg-[#64748b]/10", text: "dm-text-secondary", icon: Circle },
};

export default function ChecklistPage() {
  const [expanded, setExpanded] = useState<string[]>(MODULES.map((m) => m.title));
  const [filter, setFilter] = useState<"all" | "done" | "demo" | "planned">("all");

  const toggle = (title: string) =>
    setExpanded((prev) => prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]);

  const totals = { done: 0, demo: 0, planned: 0, total: 0 };
  MODULES.forEach((m) => m.features.forEach((f) => { totals[f.status]++; totals.total++; }));
  const pctDone = Math.round(((totals.done + totals.demo) / totals.total) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold dm-text">Feature Checklist</h1>
        <p className="dm-text-secondary text-sm mt-1">Complete overview of all features — implemented, demo, and planned</p>
      </div>

      {/* Progress Bar */}
      <div className="dm-surface rounded-xl p-6 border dm-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold dm-text">Overall Progress</p>
          <p className="text-sm font-bold text-[#22c55e]">{pctDone}%</p>
        </div>
        <div className="w-full dm-surface-hover rounded-full h-3 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4A90D9] transition-all duration-500"
            style={{ width: `${pctDone}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#22c55e]">{totals.done}</p>
            <p className="text-xs dm-text-secondary">Implemented</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#f59e0b]">{totals.demo}</p>
            <p className="text-xs dm-text-secondary">Demo / UI Only</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold dm-text-secondary">{totals.planned}</p>
            <p className="text-xs dm-text-secondary">Planned</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 dm-surface-hover rounded-xl p-1">
        {(["all", "done", "demo", "planned"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === f ? "dm-surface dm-text shadow-sm" : "dm-text-secondary hover:dm-text"
            }`}>{f === "all" ? `All (${totals.total})` : f === "done" ? `Implemented (${totals.done})` : f === "demo" ? `Demo (${totals.demo})` : `Planned (${totals.planned})`}</button>
        ))}
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {MODULES.map((mod) => {
          const filtered = filter === "all" ? mod.features : mod.features.filter((f) => f.status === filter);
          if (filtered.length === 0) return null;
          const isOpen = expanded.includes(mod.title);
          const doneCt = mod.features.filter((f) => f.status === "done").length;
          const demoCt = mod.features.filter((f) => f.status === "demo").length;

          return (
            <div key={mod.title} className="dm-surface rounded-xl border dm-border overflow-hidden">
              <button onClick={() => toggle(mod.title)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f8f9fa] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}>
                    <mod.icon className="w-4.5 h-4.5" style={{ color: mod.color }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold dm-text">{mod.title}</p>
                    <p className="text-[10px] dm-text-secondary">{doneCt + demoCt}/{mod.features.length} features ready</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 dm-surface-hover rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#22c55e]"
                      style={{ width: `${((doneCt + demoCt) / mod.features.length) * 100}%` }} />
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 dm-text-secondary" /> : <ChevronRight className="w-4 h-4 dm-text-secondary" />}
                </div>
              </button>
              {isOpen && (
                <div className="border-t dm-border px-5 py-3 space-y-2">
                  {filtered.map((f, i) => {
                    const sc = statusConfig[f.status];
                    return (
                      <div key={i} className="flex items-start gap-3 py-1.5">
                        <sc.icon className={`w-4 h-4 mt-0.5 ${sc.text} ${f.status === "done" ? "fill-current" : ""}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${f.status === "done" ? "dm-text" : "dm-text-secondary"}`}>{f.name}</span>
                            <span className={`${sc.bg} ${sc.text} px-1.5 py-0.5 rounded text-[9px] font-semibold`}>{sc.label}</span>
                          </div>
                          {f.note && <p className="text-[10px] text-[#C0C0C0] mt-0.5">{f.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
