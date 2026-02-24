"use client";
import { useState } from "react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { ADMIN_MEMBERS_LIST } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  Search, Download, UserPlus, Eye, Edit2,
  CheckCircle, XCircle, Clock, Shield, Phone, Mail,
  Save, Trash2, AlertTriangle, Users, CreditCard, PiggyBank,
} from "lucide-react";

type StatusFilter = "all" | "active" | "dormant" | "suspended" | "pending";

interface Member {
  sv_number: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  kyc: string;
  savings: number;
  loans: number;
  shares: number;
  joined: string;
}

const EMPTY_MEMBER: Member = {
  sv_number: "",
  name: "",
  phone: "+256 ",
  email: "",
  status: "pending",
  kyc: "pending",
  savings: 0,
  loans: 0,
  shares: 0,
  joined: new Date().toISOString().slice(0, 10),
};

export default function AdminMembersPage() {
  const [members, setMembers] = usePersistedState<Member[]>("admin_members", ADMIN_MEMBERS_LIST);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Modal states
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form state
  const [form, setForm] = useState<Member>(EMPTY_MEMBER);

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sv_number.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: members.length,
    active: members.filter((m) => m.status === "active").length,
    dormant: members.filter((m) => m.status === "dormant").length,
    suspended: members.filter((m) => m.status === "suspended").length,
    pending: members.filter((m) => m.status === "pending").length,
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
    dormant: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
    suspended: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
    pending: { bg: "bg-[#64748b]/10", text: "dm-text-secondary" },
  };

  const kycColors: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    verified: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", icon: CheckCircle },
    pending: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", icon: Clock },
    incomplete: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]", icon: XCircle },
  };

  const selected = selectedMember ? members.find((m) => m.sv_number === selectedMember) : null;

  // Generate next SV number
  const getNextSV = () => {
    const nums = members.map((m) => parseInt(m.sv_number.replace("SV-", "")));
    const max = Math.max(...nums, 0);
    return `SV-${String(max + 1).padStart(4, "0")}`;
  };

  // Register new member
  const handleRegister = () => {
    const sv = getNextSV();
    const newMember: Member = { ...form, sv_number: sv };
    setMembers((prev) => [...prev, newMember]);
    setRegisterOpen(false);
    setForm(EMPTY_MEMBER);
    showToast(`Member ${newMember.name} registered as ${sv}`);
  };

  // Edit member
  const openEdit = (m: Member) => {
    setForm({ ...m });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setMembers((prev) => prev.map((m) => (m.sv_number === form.sv_number ? { ...form } : m)));
    setEditOpen(false);
    showToast(`Member ${form.name} updated successfully`);
  };

  // Change status
  const handleChangeStatus = (svNum: string, newStatus: string) => {
    setMembers((prev) => prev.map((m) => (m.sv_number === svNum ? { ...m, status: newStatus } : m)));
    showToast(`Member status changed to ${newStatus}`);
  };

  // KYC verify
  const handleVerifyKYC = (svNum: string) => {
    setMembers((prev) => prev.map((m) => (m.sv_number === svNum ? { ...m, kyc: "verified" } : m)));
    showToast("KYC status updated to verified");
  };

  // Delete member
  const handleDelete = () => {
    if (!selectedMember) return;
    setMembers((prev) => prev.filter((m) => m.sv_number !== selectedMember));
    setSelectedMember(null);
    setDeleteConfirmOpen(false);
    showToast("Member removed successfully", "info");
  };

  // Form field helper
  const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium dm-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputClass =
    "w-full px-3 py-2.5 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors";

  const MemberForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full Name *">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. James Mukasa" />
        </FormField>
        {isEdit && (
          <FormField label="SV Number">
            <input className={`${inputClass} bg-[#f8f9fa] cursor-not-allowed`} value={form.sv_number} disabled />
          </FormField>
        )}
        <FormField label="Phone Number *">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+256 7XX XXX XXX" />
        </FormField>
        <FormField label="Email">
          <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@email.com" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
            <option value="suspended">Suspended</option>
          </select>
        </FormField>
        <FormField label="KYC Status">
          <select className={inputClass} value={form.kyc} onChange={(e) => setForm({ ...form, kyc: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="incomplete">Incomplete</option>
            <option value="verified">Verified</option>
          </select>
        </FormField>
      </div>
      {isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Savings Balance">
            <input className={inputClass} type="number" value={form.savings} onChange={(e) => setForm({ ...form, savings: Number(e.target.value) })} />
          </FormField>
          <FormField label="Loan Balance">
            <input className={inputClass} type="number" value={form.loans} onChange={(e) => setForm({ ...form, loans: Number(e.target.value) })} />
          </FormField>
          <FormField label="Shares Value">
            <input className={inputClass} type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })} />
          </FormField>
        </div>
      )}
      <FormField label="Date Joined">
        <input className={inputClass} type="date" value={form.joined} onChange={(e) => setForm({ ...form, joined: e.target.value })} />
      </FormField>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dm-text">Members</h1>
          <p className="dm-text-secondary text-sm">{members.length} registered members</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border dm-border dm-text rounded-xl text-sm font-medium hover:dm-surface-hover transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => { setForm(EMPTY_MEMBER); setRegisterOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Register New
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 dm-surface-hover rounded-xl p-1">
        {(["all", "active", "dormant", "suspended", "pending"] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
              statusFilter === s ? "dm-surface dm-text shadow-sm" : "dm-text-secondary hover:dm-text"
            }`}>
            {s} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C0C0C0]" />
        <input type="text" placeholder="Search by name, SV number, phone, or email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]" />
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={`flex-1 dm-surface rounded-xl border dm-border overflow-hidden ${selected ? "hidden lg:block" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b dm-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">KYC</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Savings</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Loans</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Shares</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold dm-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const sc = statusColors[m.status] || statusColors.active;
                  const kc = kycColors[m.kyc] || kycColors.pending;
                  const KycIcon = kc.icon;
                  return (
                    <tr key={m.sv_number}
                      className={`border-b dm-border hover:bg-[#f8f9fa] transition-colors cursor-pointer ${
                        selectedMember === m.sv_number ? "bg-[#4A90D9]/5" : ""
                      }`}
                      onClick={() => setSelectedMember(m.sv_number)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">{getInitials(m.name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium dm-text">{m.name}</p>
                            <p className="text-[10px] text-[#C0C0C0]">{m.sv_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs dm-text">{m.phone}</p>
                        <p className="text-[10px] text-[#C0C0C0] truncate max-w-[140px]">{m.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${sc.bg} ${sc.text} px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${kc.bg} ${kc.text} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize`}>
                          <KycIcon className="w-3 h-3" /> {m.kyc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium dm-text">{formatCurrency(m.savings)}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium dm-text">{formatCurrency(m.loans)}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium dm-text">{formatCurrency(m.shares)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1.5 rounded-lg hover:dm-surface-hover" title="View profile"
                            onClick={(e) => { e.stopPropagation(); setSelectedMember(m.sv_number); setProfileOpen(true); }}>
                            <Eye className="w-3.5 h-3.5 dm-text-secondary" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:dm-surface-hover" title="Edit member"
                            onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                            <Edit2 className="w-3.5 h-3.5 dm-text-secondary" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm dm-text-secondary">No members found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && !profileOpen && (
          <div className="w-full lg:w-80 dm-surface rounded-xl border dm-border p-5 animate-fade-in flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold dm-text">Member Details</h3>
              <button onClick={() => setSelectedMember(null)} className="text-xs dm-text-secondary hover:dm-text">Close</button>
            </div>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg font-bold">{getInitials(selected.name)}</span>
              </div>
              <h4 className="font-semibold dm-text">{selected.name}</h4>
              <p className="text-xs text-[#C0C0C0]">{selected.sv_number}</p>
              <span className={`${statusColors[selected.status]?.bg} ${statusColors[selected.status]?.text} px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize mt-2 inline-block`}>
                {selected.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span className="dm-text">{selected.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span className="dm-text">{selected.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-[#C0C0C0]" />
                <span className={`${kycColors[selected.kyc]?.text} capitalize font-medium`}>KYC: {selected.kyc}</span>
                {selected.kyc !== "verified" && (
                  <button onClick={() => handleVerifyKYC(selected.sv_number)}
                    className="ml-auto text-[10px] px-2 py-0.5 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors">
                    Verify
                  </button>
                )}
              </div>

              <hr className="dm-border" />

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[10px] dm-text-secondary">Total Savings</p>
                  <p className="text-sm font-bold dm-text">{formatCurrency(selected.savings)}</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[10px] dm-text-secondary">Active Loans</p>
                  <p className="text-sm font-bold dm-text">{formatCurrency(selected.loans)}</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[10px] dm-text-secondary">Shares</p>
                  <p className="text-sm font-bold dm-text">{formatCurrency(selected.shares)}</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[10px] dm-text-secondary">Joined</p>
                  <p className="text-sm font-bold dm-text">{formatDate(selected.joined)}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setProfileOpen(true)}
                    className="flex-1 py-2 bg-[#4A90D9] text-white rounded-lg text-xs font-medium hover:bg-[#3a7bc8] transition-colors">
                    View Full Profile
                  </button>
                  <button onClick={() => openEdit(selected)}
                    className="flex-1 py-2 border dm-border dm-text rounded-lg text-xs font-medium hover:dm-surface-hover transition-colors">
                    Edit
                  </button>
                </div>
                {/* Status change quick actions */}
                <div className="flex gap-1 flex-wrap">
                  {selected.status !== "active" && (
                    <button onClick={() => handleChangeStatus(selected.sv_number, "active")}
                      className="px-2.5 py-1 text-[10px] font-medium bg-[#22c55e]/10 text-[#22c55e] rounded-lg hover:bg-[#22c55e]/20 transition-colors">
                      Activate
                    </button>
                  )}
                  {selected.status !== "suspended" && (
                    <button onClick={() => handleChangeStatus(selected.sv_number, "suspended")}
                      className="px-2.5 py-1 text-[10px] font-medium bg-[#ef4444]/10 text-[#ef4444] rounded-lg hover:bg-[#ef4444]/20 transition-colors">
                      Suspend
                    </button>
                  )}
                  {selected.status !== "dormant" && (
                    <button onClick={() => handleChangeStatus(selected.sv_number, "dormant")}
                      className="px-2.5 py-1 text-[10px] font-medium bg-[#f59e0b]/10 text-[#f59e0b] rounded-lg hover:bg-[#f59e0b]/20 transition-colors">
                      Mark Dormant
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirmOpen(true)}
                    className="px-2.5 py-1 text-[10px] font-medium bg-[#ef4444]/10 text-[#ef4444] rounded-lg hover:bg-[#ef4444]/20 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======== REGISTER MODAL ======== */}
      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register New Member" size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRegisterOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleRegister} disabled={!form.name || !form.phone}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Register Member
            </button>
          </div>
        }>
        <div className="mb-4 p-3 bg-[#4A90D9]/5 rounded-xl border border-[#4A90D9]/20">
          <p className="text-xs text-[#4A90D9]">
            The member will be assigned SV number <b>{getNextSV()}</b> automatically.
          </p>
        </div>
        <MemberForm isEdit={false} />
      </Modal>

      {/* ======== EDIT MODAL ======== */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Member — ${form.sv_number}`} size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleSaveEdit}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        }>
        <MemberForm isEdit={true} />
      </Modal>

      {/* ======== FULL PROFILE MODAL ======== */}
      <Modal open={profileOpen && !!selected} onClose={() => setProfileOpen(false)}
        title={`Member Profile — ${selected?.name || ""}`} size="xl">
        {selected && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{getInitials(selected.name)}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold dm-text">{selected.name}</h3>
                <p className="text-sm text-[#C0C0C0] mb-2">{selected.sv_number}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className={`${statusColors[selected.status]?.bg} ${statusColors[selected.status]?.text} px-3 py-1 rounded-full text-xs font-semibold capitalize`}>
                    {selected.status}
                  </span>
                  <span className={`${kycColors[selected.kyc]?.bg} ${kycColors[selected.kyc]?.text} px-3 py-1 rounded-full text-xs font-semibold capitalize inline-flex items-center gap-1`}>
                    {(() => { const KycIcon = kycColors[selected.kyc]?.icon || Clock; return <KycIcon className="w-3 h-3" />; })()}
                    KYC: {selected.kyc}
                  </span>
                </div>
              </div>
              <button onClick={() => { setProfileOpen(false); openEdit(selected); }}
                className="px-4 py-2 border dm-border rounded-xl text-xs font-medium dm-text-secondary hover:dm-surface-hover transition-colors flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#f8f9fa] rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#4A90D9]" />
                </div>
                <div>
                  <p className="text-[10px] dm-text-secondary">Phone Number</p>
                  <p className="text-sm font-semibold dm-text">{selected.phone}</p>
                </div>
              </div>
              <div className="bg-[#f8f9fa] rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#4A90D9]" />
                </div>
                <div>
                  <p className="text-[10px] dm-text-secondary">Email Address</p>
                  <p className="text-sm font-semibold dm-text">{selected.email}</p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h4 className="text-sm font-semibold dm-text mb-3">Financial Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="dm-surface rounded-xl p-4 border dm-border">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-[10px] dm-text-secondary">Savings</span>
                  </div>
                  <p className="text-lg font-bold dm-text">{formatCurrency(selected.savings)}</p>
                </div>
                <div className="dm-surface rounded-xl p-4 border dm-border">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-[#ef4444]" />
                    <span className="text-[10px] dm-text-secondary">Loans</span>
                  </div>
                  <p className="text-lg font-bold dm-text">{formatCurrency(selected.loans)}</p>
                </div>
                <div className="dm-surface rounded-xl p-4 border dm-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#4A90D9]" />
                    <span className="text-[10px] dm-text-secondary">Shares</span>
                  </div>
                  <p className="text-lg font-bold dm-text">{formatCurrency(selected.shares)}</p>
                </div>
                <div className="dm-surface rounded-xl p-4 border dm-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-[#a855f7]" />
                    <span className="text-[10px] dm-text-secondary">Member Since</span>
                  </div>
                  <p className="text-lg font-bold dm-text">{formatDate(selected.joined)}</p>
                </div>
              </div>
            </div>

            {/* Net Worth */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-xl p-5 text-white">
              <p className="text-xs text-[#C0C0C0] mb-1">Estimated Net Worth (Savings + Shares - Loans)</p>
              <p className="text-2xl font-bold">{formatCurrency(selected.savings + selected.shares - selected.loans)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ======== DELETE CONFIRM MODAL ======== */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Removal" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete}
              className="px-5 py-2.5 bg-[#ef4444] text-white rounded-xl text-sm font-medium hover:bg-[#dc2626] transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Remove Member
            </button>
          </div>
        }>
        <div className="flex items-start gap-3 p-3 bg-[#ef4444]/5 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium dm-text">
              Are you sure you want to remove <b>{selected?.name}</b> ({selected?.sv_number})?
            </p>
            <p className="text-xs dm-text-secondary mt-1">This action can be reversed by re-registering the member. All balances will be reset.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
