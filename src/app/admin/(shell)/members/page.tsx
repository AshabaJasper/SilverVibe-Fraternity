"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Download, UserPlus, Eye, Edit2, CheckCircle, XCircle, Clock, Shield, Phone, Mail,
  Save, Trash2, AlertTriangle, Users, CreditCard, PiggyBank, FileText, Loader2, BadgeCheck, X,
} from "lucide-react";
import { formatCurrency, formatDate, getInitials, todayISO } from "@/lib/utils";
import { ADMIN_KPI, ADMIN_MEMBERS_LIST, DEMO_MEMBER, RECENT_TRANSACTIONS } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { exportToCsv } from "@/lib/export";
import { generateMemberStatement, type StatementTxn } from "@/lib/pdf-reports";
import Modal, { Button, ConfirmDialog, FormField, SelectInput, TextInput } from "@/components/Modal";
import { Badge, EmptyState, PageHeader, Tabs } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Types, constants and pure helpers (module level on purpose)        */
/* ------------------------------------------------------------------ */

type StatusFilter = "all" | "active" | "dormant" | "suspended" | "pending";

type Member = (typeof ADMIN_MEMBERS_LIST)[number];

type FormErrors = Partial<Record<"name" | "phone" | "email" | "sv_number" | "joined", string>>;

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "dormant", label: "Dormant" },
  { value: "suspended", label: "Suspended" },
];
const KYC_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "incomplete", label: "Incomplete" },
  { value: "verified", label: "Verified" },
];

const KYC_ICON: Record<string, typeof CheckCircle> = { verified: CheckCircle, pending: Clock, incomplete: XCircle };

const CSV_COLUMNS = [
  { key: "sv_number", label: "SV Number" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "kyc", label: "KYC" },
  { key: "savings", label: "Savings (UGX)" },
  { key: "loans", label: "Loans (UGX)" },
  { key: "shares", label: "Shares (UGX)" },
  { key: "joined", label: "Date Joined" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function emptyMember(): Member {
  return {
    sv_number: "", name: "", phone: "+256 ", email: "", status: "pending", kyc: "pending",
    savings: 0, loans: 0, shares: 0, joined: todayISO(),
  };
}

/** Next free SV number, e.g. SV-0096. */
function nextSvNumber(members: Member[]): string {
  const max = members.reduce((m, x) => Math.max(m, parseInt(x.sv_number.replace(/\D/g, ""), 10) || 0), 0);
  return `SV-${String(max + 1).padStart(4, "0")}`;
}

function validateMember(form: Member, members: Member[], isEdit: boolean): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim().length < 3) errors.name = "Enter the member's full name";

  // Ugandan numbers: +256 followed by 9 digits (spaces allowed).
  const digits = form.phone.replace(/\D/g, "");
  if (!form.phone.trim().startsWith("+256")) errors.phone = "Phone must start with +256";
  else if (digits.length - 3 < 9) errors.phone = "Enter 9 digits after +256, e.g. +256 770 123 456";
  else if (digits.length - 3 > 9) errors.phone = "Too many digits — expected 9 after +256";

  const email = form.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";
  else if (members.some((m) => m.email.toLowerCase() === email && m.sv_number !== form.sv_number))
    errors.email = "Another member already uses this email";

  if (isEdit && !members.some((m) => m.sv_number === form.sv_number)) errors.sv_number = "Member no longer exists";
  if (!isEdit && form.sv_number && members.some((m) => m.sv_number === form.sv_number))
    errors.sv_number = "SV number already in use";

  if (!form.joined) errors.joined = "Pick the date joined";
  return errors;
}

/**
 * Statement lines for a member. James Mukasa uses the real portal transactions; for
 * everyone else a short, deterministic history is derived from their balances.
 */
function statementFor(m: Member): StatementTxn[] {
  if (m.sv_number === DEMO_MEMBER.sv_number) {
    return [...RECENT_TRANSACTIONS].sort((a, b) => a.date.localeCompare(b.date));
  }
  const round = (n: number) => Math.max(10_000, Math.round(n / 10_000) * 10_000);
  const deposit = round(m.savings * 0.015);
  const txns: StatementTxn[] = [
    { date: "2026-08-05", type: "Deposit", account: "Regular Savings", amount: deposit, direction: "credit", channel: "Mobile Money" },
    { date: "2026-09-05", type: "Deposit", account: "Regular Savings", amount: deposit, direction: "credit", channel: "Mobile Money" },
    { date: "2026-09-18", type: "Share Purchase", account: "Share Capital", amount: round(m.shares * 0.05), direction: "debit", channel: "Cash" },
    { date: "2026-10-05", type: "Deposit", account: "Regular Savings", amount: deposit, direction: "credit", channel: "Bank Transfer" },
  ];
  if (m.loans > 0) {
    const repay = round(m.loans / 10);
    txns.push(
      { date: "2026-09-01", type: "Loan Repayment", account: "Loan Account", amount: repay, direction: "debit", channel: "Bank Transfer" },
      { date: "2026-10-01", type: "Loan Repayment", account: "Loan Account", amount: repay, direction: "debit", channel: "Bank Transfer" }
    );
  }
  txns.push({ date: "2026-10-31", type: "Interest", account: "Regular Savings", amount: round(m.savings * 0.01), direction: "credit", channel: "System" });
  return txns.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/* Module-level form components (never declare these inside the page) */
/* ------------------------------------------------------------------ */

function MemberForm({
  form, onChange, errors, isEdit,
}: {
  form: Member;
  onChange: (patch: Partial<Member>) => void;
  errors: FormErrors;
  isEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full name" required error={errors.name}>
          <TextInput value={form.name} onChange={(v) => onChange({ name: v })} placeholder="e.g. James Mukasa" />
        </FormField>
        <FormField label="SV number" hint={isEdit ? "SV numbers cannot be changed" : "Assigned automatically"} error={errors.sv_number}>
          <TextInput value={form.sv_number} onChange={() => undefined} disabled />
        </FormField>
        <FormField label="Phone number" required error={errors.phone}>
          <TextInput type="tel" value={form.phone} onChange={(v) => onChange({ phone: v })} placeholder="+256 7XX XXX XXX" />
        </FormField>
        <FormField label="Email" required error={errors.email}>
          <TextInput type="email" value={form.email} onChange={(v) => onChange({ email: v })} placeholder="member@email.com" />
        </FormField>
        <FormField label="Status">
          <SelectInput value={form.status} onChange={(v) => onChange({ status: v })} options={STATUS_OPTIONS} />
        </FormField>
        <FormField label="KYC status">
          <SelectInput value={form.kyc} onChange={(v) => onChange({ kyc: v })} options={KYC_OPTIONS} />
        </FormField>
      </div>
      {isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Savings balance (UGX)">
            <TextInput type="number" min={0} value={String(form.savings)} onChange={(v) => onChange({ savings: Math.max(0, Number(v) || 0) })} />
          </FormField>
          <FormField label="Loan balance (UGX)">
            <TextInput type="number" min={0} value={String(form.loans)} onChange={(v) => onChange({ loans: Math.max(0, Number(v) || 0) })} />
          </FormField>
          <FormField label="Shares value (UGX)">
            <TextInput type="number" min={0} value={String(form.shares)} onChange={(v) => onChange({ shares: Math.max(0, Number(v) || 0) })} />
          </FormField>
        </div>
      )}
      <FormField label="Date joined" required error={errors.joined}>
        <TextInput type="date" value={form.joined} onChange={(v) => onChange({ joined: v })} />
      </FormField>
    </div>
  );
}

function KycBadge({ kyc }: { kyc: string }) {
  const Icon = KYC_ICON[kyc] ?? Clock;
  const tone = kyc === "verified" ? "green" : kyc === "incomplete" ? "red" : "amber";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
      tone === "green" ? "bg-[#22c55e]/10 text-[#16a34a]" : tone === "red" ? "bg-[#ef4444]/10 text-[#dc2626]" : "bg-[#f59e0b]/10 text-[#d97706]"
    }`}>
      <Icon className="w-3 h-3" /> {kyc}
    </span>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="dm-surface-hover rounded-lg p-3">
      <p className="text-[10px] dm-text-secondary">{label}</p>
      <p className="text-sm font-bold dm-text">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminMembersPage() {
  // useSearchParams needs a Suspense boundary on a statically prerendered page.
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto py-16 text-center text-sm dm-text-secondary">Loading members…</div>}>
      <MembersInner />
    </Suspense>
  );
}

function MembersInner() {
  const params = useSearchParams();
  const [members, setMembers] = usePersistedState<Member[]>(KEYS.adminMembers, ADMIN_MEMBERS_LIST);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedSv, setSelectedSv] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<Member>(emptyMember);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pdfBusy, setPdfBusy] = useState(false);

  const openRegister = () => {
    setForm(emptyMember());
    setErrors({});
    setRegisterOpen(true);
  };

  // Deep links (?q=SV-0078, ?action=register). Re-applied whenever the query string
  // changes, e.g. when the header search navigates here while the page is open.
  const paramKey = params.toString();
  const [appliedParams, setAppliedParams] = useState<string | null>(null);
  if (appliedParams !== paramKey) {
    setAppliedParams(paramKey);
    const q = params.get("q");
    if (q) {
      setSearch(q);
      setStatusFilter("all");
      if (/^SV-\d{4}$/i.test(q)) setSelectedSv(q.toUpperCase());
    }
    if (params.get("action") === "register") openRegister();
  }

  const term = search.trim().toLowerCase();
  const filtered = members.filter((m) => {
    const matchSearch =
      !term ||
      m.name.toLowerCase().includes(term) ||
      m.sv_number.toLowerCase().includes(term) ||
      m.phone.replace(/\s/g, "").includes(term.replace(/\s/g, "")) ||
      m.email.toLowerCase().includes(term);
    return matchSearch && (statusFilter === "all" || m.status === statusFilter);
  });

  const count = (s: string) => members.filter((m) => m.status === s).length;
  const tabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: members.length },
    { id: "active", label: "Active", count: count("active") },
    { id: "dormant", label: "Dormant", count: count("dormant") },
    { id: "suspended", label: "Suspended", count: count("suspended") },
    { id: "pending", label: "Pending", count: count("pending") },
  ];

  // Society-wide total (seed 847) moves with members added/removed in the demo register.
  const societyTotal = ADMIN_KPI.total_members.value + (members.length - ADMIN_MEMBERS_LIST.length);
  const selected = selectedSv ? members.find((m) => m.sv_number === selectedSv) ?? null : null;
  const nextSv = nextSvNumber(members);

  // Bulk selection only counts rows that are still visible.
  const visibleChecked = checked.filter((sv) => filtered.some((m) => m.sv_number === sv));
  const allVisibleChecked = filtered.length > 0 && visibleChecked.length === filtered.length;

  const toggleChecked = (sv: string) =>
    setChecked((prev) => (prev.includes(sv) ? prev.filter((x) => x !== sv) : [...prev, sv]));
  const toggleAll = () => setChecked(allVisibleChecked ? [] : filtered.map((m) => m.sv_number));

  /* ---------- actions ---------- */

  const handleRegister = () => {
    const candidate = { ...form, sv_number: nextSv, name: form.name.trim(), email: form.email.trim() };
    const errs = validateMember(candidate, members, false);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setMembers((prev) => [...prev, candidate]);
    setRegisterOpen(false);
    setSearch("");
    setStatusFilter("all");
    setSelectedSv(candidate.sv_number);
    showToast(`${candidate.name} registered as ${candidate.sv_number}`);
  };

  const openEdit = (m: Member) => {
    setForm({ ...m });
    setErrors({});
    setProfileOpen(false);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    const candidate = { ...form, name: form.name.trim(), email: form.email.trim() };
    const errs = validateMember(candidate, members, true);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setMembers((prev) => prev.map((m) => (m.sv_number === candidate.sv_number ? candidate : m)));
    setEditOpen(false);
    showToast(`${candidate.name}'s details updated`);
  };

  const changeStatus = (sv: string, status: string) => {
    setMembers((prev) => prev.map((m) => (m.sv_number === sv ? { ...m, status } : m)));
    showToast(`${sv} marked ${status}`);
  };

  const verifyKyc = (svs: string[]) => {
    setMembers((prev) => prev.map((m) => (svs.includes(m.sv_number) ? { ...m, kyc: "verified" } : m)));
    showToast(svs.length === 1 ? `KYC verified for ${svs[0]}` : `KYC verified for ${svs.length} members`);
  };

  const handleDelete = () => {
    if (!selected) return;
    setMembers((prev) => prev.filter((m) => m.sv_number !== selected.sv_number));
    setChecked((prev) => prev.filter((sv) => sv !== selected.sv_number));
    setSelectedSv(null);
    setProfileOpen(false);
    showToast(`${selected.name} (${selected.sv_number}) removed from the register`, "info");
  };

  const exportRows = (rows: Member[], label: string) => {
    if (!rows.length) {
      showToast("No members to export", "error");
      return;
    }
    exportToCsv(`silvervibe-members-${label}-${todayISO()}`, rows, CSV_COLUMNS);
    showToast(`Exported ${rows.length} member${rows.length === 1 ? "" : "s"} to CSV`);
  };

  const downloadStatement = async (m: Member) => {
    setPdfBusy(true);
    try {
      await generateMemberStatement({ name: m.name, sv: m.sv_number, email: m.email, phone: m.phone }, statementFor(m), [
        { label: "Savings", amount: m.savings },
        { label: "Share capital", amount: m.shares },
        { label: "Loan outstanding", amount: m.loans },
      ]);
      showToast(`Statement for ${m.name} downloaded`);
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  /* ---------- render ---------- */

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Members"
        subtitle={`Showing ${filtered.length} of ${societyTotal} members (demo subset of ${members.length} records)`}
        actions={
          <>
            <Button variant="secondary" onClick={() => exportRows(filtered, statusFilter)}>
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button onClick={openRegister}>
              <UserPlus className="w-4 h-4" /> Register New
            </Button>
          </>
        }
      />

      <Tabs tabs={tabs} active={statusFilter} onChange={setStatusFilter} />

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dm-text-secondary" />
        <input
          type="search"
          aria-label="Search members"
          placeholder="Search by name, SV number, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 border rounded-xl text-sm dm-input focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#f1f5f9]">
            <X className="w-4 h-4 dm-text-secondary" />
          </button>
        )}
      </div>

      {/* Bulk actions bar */}
      {visibleChecked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border border-[#4A90D9]/30 bg-[#4A90D9]/5">
          <span className="text-sm font-medium dm-text mr-auto">{visibleChecked.length} selected</span>
          <Button variant="secondary" className="py-1.5 text-xs"
            onClick={() => exportRows(members.filter((m) => visibleChecked.includes(m.sv_number)), "selected")}>
            <Download className="w-3.5 h-3.5" /> Export selected
          </Button>
          <Button variant="success" className="py-1.5 text-xs" onClick={() => { verifyKyc(visibleChecked); setChecked([]); }}>
            <BadgeCheck className="w-3.5 h-3.5" /> Mark verified
          </Button>
          <Button variant="secondary" className="py-1.5 text-xs" onClick={() => setChecked([])}>Clear</Button>
        </div>
      )}

      <div className="flex gap-6">
        <div className={`flex-1 min-w-0 glass-card rounded-xl overflow-hidden ${selected ? "hidden lg:block" : ""}`}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members match"
              hint={term ? `Nothing matches “${search}” in ${statusFilter === "all" ? "any status" : statusFilter + " members"}.` : "No members have this status."}
              action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" aria-label="Select all visible members" checked={allVisibleChecked}
                        onChange={toggleAll} className="w-4 h-4 accent-[#4A90D9] cursor-pointer" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Member</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">KYC</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Savings</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Loans</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Shares</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748b]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.sv_number}
                      className={`border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors cursor-pointer ${selectedSv === m.sv_number ? "bg-[#4A90D9]/5" : ""}`}
                      onClick={() => setSelectedSv(m.sv_number)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${m.name}`} checked={checked.includes(m.sv_number)}
                          onChange={() => toggleChecked(m.sv_number)} className="w-4 h-4 accent-[#4A90D9] cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#4A90D9] flex items-center justify-center shrink-0">
                            <span className="text-white text-[10px] font-bold">{getInitials(m.name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium dm-text whitespace-nowrap">{m.name}</p>
                            <p className="text-[10px] dm-text-secondary">{m.sv_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs dm-text whitespace-nowrap">{m.phone}</p>
                        <p className="text-[10px] dm-text-secondary truncate max-w-[160px]">{m.email}</p>
                      </td>
                      <td className="px-4 py-3"><Badge status={m.status} tone={m.status === "dormant" ? "amber" : undefined} /></td>
                      <td className="px-4 py-3"><KycBadge kyc={m.kyc} /></td>
                      <td className="px-4 py-3 text-right text-xs font-medium dm-text whitespace-nowrap">{formatCurrency(m.savings)}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium dm-text whitespace-nowrap">{formatCurrency(m.loans)}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium dm-text whitespace-nowrap">{formatCurrency(m.shares)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" className="p-1.5 rounded-lg hover:bg-[#f1f5f9]" title="View profile" aria-label={`View ${m.name}'s profile`}
                            onClick={(e) => { e.stopPropagation(); setSelectedSv(m.sv_number); setProfileOpen(true); }}>
                            <Eye className="w-3.5 h-3.5 dm-text-secondary" />
                          </button>
                          <button type="button" className="p-1.5 rounded-lg hover:bg-[#f1f5f9]" title="Edit member" aria-label={`Edit ${m.name}`}
                            onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                            <Edit2 className="w-3.5 h-3.5 dm-text-secondary" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-full lg:w-80 glass-card rounded-xl p-5 animate-fade-in flex-shrink-0 self-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold dm-text">Member Details</h3>
              <button type="button" onClick={() => setSelectedSv(null)} className="text-xs dm-text-secondary hover:underline">Close</button>
            </div>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-[#4A90D9] flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg font-bold">{getInitials(selected.name)}</span>
              </div>
              <h4 className="font-semibold dm-text">{selected.name}</h4>
              <p className="text-xs dm-text-secondary mb-2">{selected.sv_number}</p>
              <Badge status={selected.status} tone={selected.status === "dormant" ? "amber" : undefined} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 dm-text-secondary" />
                <span className="dm-text">{selected.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 dm-text-secondary" />
                <span className="dm-text break-all">{selected.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 dm-text-secondary" />
                <KycBadge kyc={selected.kyc} />
                {selected.kyc !== "verified" && (
                  <button type="button" onClick={() => verifyKyc([selected.sv_number])}
                    className="ml-auto text-[10px] px-2 py-0.5 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors">
                    Verify KYC
                  </button>
                )}
              </div>

              <hr className="dm-border" />

              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Total Savings" value={formatCurrency(selected.savings)} />
                <MetricTile label="Loan Balance" value={formatCurrency(selected.loans)} />
                <MetricTile label="Shares" value={formatCurrency(selected.shares)} />
                <MetricTile label="Joined" value={formatDate(selected.joined)} />
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex gap-2">
                  <Button variant="accent" className="flex-1 py-2 text-xs" onClick={() => setProfileOpen(true)}>View Full Profile</Button>
                  <Button variant="secondary" className="flex-1 py-2 text-xs" onClick={() => openEdit(selected)}>Edit</Button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {selected.status !== "active" && (
                    <button type="button" onClick={() => changeStatus(selected.sv_number, "active")}
                      className="px-2.5 py-1 text-[10px] font-medium bg-[#22c55e]/10 text-[#16a34a] rounded-lg hover:bg-[#22c55e]/20">
                      Activate
                    </button>
                  )}
                  {selected.status !== "suspended" && (
                    <button type="button" onClick={() => changeStatus(selected.sv_number, "suspended")}
                      className="px-2.5 py-1 text-[10px] font-medium bg-[#ef4444]/10 text-[#dc2626] rounded-lg hover:bg-[#ef4444]/20">
                      Suspend
                    </button>
                  )}
                  {selected.status !== "dormant" && (
                    <button type="button" onClick={() => changeStatus(selected.sv_number, "dormant")}
                      className="px-2.5 py-1 text-[10px] font-medium bg-[#f59e0b]/10 text-[#d97706] rounded-lg hover:bg-[#f59e0b]/20">
                      Mark Dormant
                    </button>
                  )}
                  <button type="button" onClick={() => setDeleteOpen(true)}
                    className="px-2.5 py-1 text-[10px] font-medium bg-[#ef4444]/10 text-[#dc2626] rounded-lg hover:bg-[#ef4444]/20 inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======== REGISTER MODAL ======== */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register New Member"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister}><UserPlus className="w-4 h-4" /> Register Member</Button>
          </>
        }
      >
        <div className="mb-4 p-3 bg-[#4A90D9]/5 rounded-xl border border-[#4A90D9]/20">
          <p className="text-xs text-[#4A90D9]">The member will be assigned SV number <b>{nextSv}</b> automatically.</p>
        </div>
        <MemberForm
          form={{ ...form, sv_number: nextSv }}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          errors={errors}
          isEdit={false}
        />
      </Modal>

      {/* ======== EDIT MODAL ======== */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Member — ${form.sv_number}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleSaveEdit}><Save className="w-4 h-4" /> Save Changes</Button>
          </>
        }
      >
        <MemberForm form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} errors={errors} isEdit />
      </Modal>

      {/* ======== FULL PROFILE MODAL ======== */}
      <Modal
        open={profileOpen && !!selected}
        onClose={() => setProfileOpen(false)}
        title={`Member Profile — ${selected?.name ?? ""}`}
        size="xl"
        footer={
          selected && (
            <>
              <Button variant="secondary" onClick={() => openEdit(selected)}><Edit2 className="w-4 h-4" /> Edit</Button>
              <Button variant="accent" disabled={pdfBusy} onClick={() => downloadStatement(selected)}>
                {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {pdfBusy ? "Generating…" : "Download statement"}
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#4A90D9] flex items-center justify-center shrink-0">
                <span className="text-white text-2xl font-bold">{getInitials(selected.name)}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold dm-text">{selected.name}</h3>
                <p className="text-sm dm-text-secondary mb-2">{selected.sv_number}</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <Badge status={selected.status} tone={selected.status === "dormant" ? "amber" : undefined} />
                  <KycBadge kyc={selected.kyc} />
                  {selected.kyc !== "verified" && (
                    <button type="button" onClick={() => verifyKyc([selected.sv_number])} className="text-xs text-[#16a34a] hover:underline">
                      Verify KYC
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="dm-surface-hover rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center"><Phone className="w-5 h-5 text-[#4A90D9]" /></div>
                <div>
                  <p className="text-[10px] dm-text-secondary">Phone Number</p>
                  <p className="text-sm font-semibold dm-text">{selected.phone}</p>
                </div>
              </div>
              <div className="dm-surface-hover rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center"><Mail className="w-5 h-5 text-[#4A90D9]" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] dm-text-secondary">Email Address</p>
                  <p className="text-sm font-semibold dm-text break-all">{selected.email}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold dm-text mb-3">Financial Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: PiggyBank, color: "#22c55e", label: "Savings", value: formatCurrency(selected.savings) },
                  { icon: CreditCard, color: "#ef4444", label: "Loans", value: formatCurrency(selected.loans) },
                  { icon: Users, color: "#4A90D9", label: "Shares", value: formatCurrency(selected.shares) },
                  { icon: Clock, color: "#a855f7", label: "Member Since", value: formatDate(selected.joined) },
                ].map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className="glass-card rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="text-[10px] dm-text-secondary">{label}</span>
                    </div>
                    <p className="text-base font-bold dm-text">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5 bg-[#4A90D9]/10 border border-[#4A90D9]/20">
              <p className="text-xs dm-text-secondary mb-1">Estimated net position (Savings + Shares − Loans)</p>
              <p className="text-2xl font-bold dm-text">{formatCurrency(selected.savings + selected.shares - selected.loans)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ======== DELETE CONFIRM ======== */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        danger
        title="Remove member?"
        confirmLabel="Remove member"
        message={
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="dm-text">
                Remove <b>{selected?.name}</b> ({selected?.sv_number}) from the member register?
              </p>
              <p className="text-xs mt-1">
                Their record disappears from member lists and search. In a live system, members with balances are closed rather than deleted.
              </p>
            </div>
          </div>
        }
      />
    </div>
  );
}
