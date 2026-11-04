"use client";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ADMIN_KPI, ADMIN_LOAN_APPLICATIONS, ADMIN_LOAN_PERFORMANCE, PORTFOLIO_QUALITY } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  CreditCard, TrendingUp, AlertTriangle, Clock, CheckCircle2, XCircle,
  Download, Plus, Eye, FileText, Users, Percent, Target, Send, MessageSquare,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

interface LoanApp {
  id: string; sv: string; member: string; product: string; amount: number; term: string;
  status: string; applied_date: string; score: number; guarantors: string[];
}

const ACTIVE_LOANS = [
  { id: "LN-2024-089", member: "James Mukasa (SV-0042)", product: "Short-Term Loan", principal: 5000000, balance: 3125000, rate: "18%", term: "12 months", status: "current", nextDue: "2025-02-01", disbursed: "2024-07-15" },
  { id: "LN-2024-076", member: "Grace Atim (SV-0156)", product: "Emergency Loan", principal: 800000, balance: 600000, rate: "15%", term: "6 months", status: "current", nextDue: "2025-01-28", disbursed: "2024-10-20" },
  { id: "LN-2024-092", member: "David Ssempijja (SV-0023)", product: "Development Loan", principal: 15000000, balance: 13500000, rate: "20%", term: "24 months", status: "watch", nextDue: "2025-01-22", disbursed: "2024-08-01" },
  { id: "LN-2024-068", member: "Moses Kato (SV-0067)", product: "Short-Term Loan", principal: 3000000, balance: 1200000, rate: "18%", term: "12 months", status: "current", nextDue: "2025-02-05", disbursed: "2024-05-10" },
  { id: "LN-2024-095", member: "Sarah Namuli (SV-0089)", product: "School Fees Loan", principal: 4500000, balance: 4500000, rate: "16%", term: "12 months", status: "arrears", nextDue: "2025-01-15", disbursed: "2024-12-01" },
];

export default function AdminLoansPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "applications" | "active" | "products">("overview");
  const [applications, setApplications] = usePersistedState<LoanApp[]>("admin_loan_apps", ADMIN_LOAN_APPLICATIONS);

  // Modal states
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LoanApp | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [approveNote, setApproveNote] = useState("");

  const handleApprove = () => {
    if (!selectedApp) return;
    setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? { ...a, status: "approved" } : a)));
    setApproveOpen(false);
    setApproveNote("");
    showToast(`Loan ${selectedApp.id} approved for ${selectedApp.member}`);
  };

  const handleDecline = () => {
    if (!selectedApp) return;
    setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? { ...a, status: "rejected" } : a)));
    setDeclineOpen(false);
    setDeclineReason("");
    showToast(`Loan ${selectedApp.id} declined`, "error");
  };

  const loanProducts = [
    { name: "Short-Term Loan", code: "LN-STL", rate: "18%", maxMultiple: "3x savings", maxTerm: "12 months", active: 145, portfolio: 580000000, par: "2.1%" },
    { name: "Development Loan", code: "LN-DVL", rate: "20%", maxMultiple: "5x savings", maxTerm: "36 months", active: 67, portfolio: 890000000, par: "4.5%" },
    { name: "Emergency Loan", code: "LN-EMG", rate: "15%", maxMultiple: "2x savings", maxTerm: "6 months", active: 82, portfolio: 120000000, par: "1.2%" },
    { name: "School Fees Loan", code: "LN-SCH", rate: "16%", maxMultiple: "4x savings", maxTerm: "12 months", active: 56, portfolio: 350000000, par: "3.8%" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Loans Management</h1>
          <p className="text-[#64748b] text-sm">Process applications, monitor portfolio, manage collections</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#f1f5f9] transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors">
            <Plus className="w-4 h-4" /> New Application
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 overflow-x-auto">
        {(["overview", "applications", "active", "products"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === t ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#64748b] hover:text-[#1A1A1A]"
            }`}>{t === "active" ? "Active Loans" : t}</button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/10 flex items-center justify-center mb-3"><CreditCard className="w-5 h-5 text-[#1A1A1A]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Loan Portfolio</p>
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(ADMIN_KPI.total_loan_book.value)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-[#22c55e]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Active Loans</p>
              <p className="text-xl font-bold text-[#1A1A1A]">350</p>
              <span className="text-xs text-[#64748b]">189 members</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center mb-3"><AlertTriangle className="w-5 h-5 text-[#ef4444]" /></div>
              <p className="text-xs text-[#64748b] mb-1">PAR &gt; 30 Days</p>
              <p className="text-xl font-bold text-[#ef4444]">{ADMIN_KPI.par_30.value}%</p>
              <span className="text-xs text-[#64748b]">Industry standard: &lt;5%</span>
            </div>
            <div className="bg-white rounded-xl p-5 border border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center mb-3"><Clock className="w-5 h-5 text-[#f59e0b]" /></div>
              <p className="text-xs text-[#64748b] mb-1">Pending Applications</p>
              <p className="text-xl font-bold text-[#f59e0b]">{ADMIN_LOAN_APPLICATIONS.length}</p>
              <span className="text-xs text-[#4A90D9] cursor-pointer hover:underline" onClick={() => setActiveTab("applications")}>Review now →</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Disbursement vs Recovery</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ADMIN_LOAN_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="disbursed" fill="#4A90D9" radius={[4, 4, 0, 0]} name="Disbursed" />
                    <Bar dataKey="recovered" fill="#22c55e" radius={[4, 4, 0, 0]} name="Recovered" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Portfolio Quality</h3>
              <div className="space-y-3 mt-6">
                {PORTFOLIO_QUALITY.map((pq) => {
                  const colors: Record<string, string> = {
                    "Current": "#22c55e", "Watch (1-30)": "#f59e0b", "Substandard (31-60)": "#f97316",
                    "Doubtful (61-90)": "#ef4444", "Loss (90+)": "#991b1b",
                  };
                  return (
                    <div key={pq.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#64748b]">{pq.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-[#1A1A1A]">{formatCurrency(pq.amount)}</span>
                          <span className="font-semibold" style={{ color: colors[pq.category] }}>{pq.percent}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#e2e8f0] rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pq.percent}%`, backgroundColor: colors[pq.category] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "applications" && (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl p-5 border border-[#e2e8f0] hover:shadow-sm transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-[#C0C0C0]">{app.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      app.status === "pending_review" ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                      app.status === "under_appraisal" ? "bg-[#4A90D9]/10 text-[#4A90D9]" :
                      app.status === "approved" ? "bg-[#22c55e]/10 text-[#22c55e]" :
                      app.status === "rejected" ? "bg-[#ef4444]/10 text-[#ef4444]" :
                      "bg-[#64748b]/10 text-[#64748b]"
                    }`}>{app.status.replace("_", " ")}</span>
                    {app.score && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        app.score >= 80 ? "bg-[#22c55e]/10 text-[#22c55e]" :
                        app.score >= 60 ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                        "bg-[#ef4444]/10 text-[#ef4444]"
                      }`}>Score: {app.score}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-1">{app.member} ({app.sv})</h3>
                  <div className="flex flex-wrap gap-4 text-xs text-[#64748b]">
                    <span>Product: <b className="text-[#1A1A1A]">{app.product}</b></span>
                    <span>Amount: <b className="text-[#1A1A1A]">{formatCurrency(app.amount)}</b></span>
                    <span>Term: <b className="text-[#1A1A1A]">{app.term}</b></span>
                    <span>Applied: <b className="text-[#1A1A1A]">{app.applied_date}</b></span>
                  </div>
                  {app.guarantors && (
                    <p className="text-xs text-[#64748b] mt-1">
                      Guarantors: <span className="text-[#1A1A1A]">{app.guarantors.join(", ")}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedApp(app); setReviewOpen(true); }}
                    className="px-4 py-2 border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
                  {app.status !== "approved" && app.status !== "rejected" && (
                    <>
                      <button onClick={() => { setSelectedApp(app); setApproveOpen(true); }}
                        className="px-4 py-2 bg-[#22c55e] text-white rounded-lg text-xs font-medium hover:bg-[#16a34a] transition-colors flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => { setSelectedApp(app); setDeclineOpen(true); }}
                        className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-xs font-medium hover:bg-[#dc2626] transition-colors flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "active" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Loan ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Principal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b]">Balance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748b]">Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b]">Next Due</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVE_LOANS.map((l) => {
                  const sc: Record<string, { bg: string; text: string }> = {
                    current: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
                    watch: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
                    arrears: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
                  };
                  const s = sc[l.status] || sc.current;
                  const progress = ((l.principal - l.balance) / l.principal) * 100;
                  return (
                    <tr key={l.id} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-[#C0C0C0]">{l.id}</td>
                      <td className="px-4 py-3 text-xs text-[#1A1A1A] font-medium">{l.member}</td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{l.product}</td>
                      <td className="px-4 py-3 text-xs text-right text-[#1A1A1A]">{formatCurrency(l.principal)}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-medium text-[#1A1A1A]">{formatCurrency(l.balance)}</p>
                        <div className="w-16 bg-[#e2e8f0] rounded-full h-1 mt-1 ml-auto">
                          <div className="bg-[#22c55e] h-1 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-[#1A1A1A]">{l.rate}</td>
                      <td className="px-4 py-3">
                        <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize`}>{l.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{l.nextDue}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          {loanProducts.map((p) => (
            <div key={p.code} className="bg-white rounded-xl p-5 border border-[#e2e8f0] hover:shadow-sm transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[#1A1A1A]">{p.name}</h3>
                    <span className="text-[10px] font-mono text-[#C0C0C0]">{p.code}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-[#64748b]">
                    <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Rate: <b className="text-[#1A1A1A]">{p.rate}</b></span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Max: <b className="text-[#1A1A1A]">{p.maxMultiple}</b></span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Term: <b className="text-[#1A1A1A]">{p.maxTerm}</b></span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Active: <b className="text-[#1A1A1A]">{p.active}</b></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#64748b]">Portfolio</p>
                  <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(p.portfolio)}</p>
                  <p className="text-xs mt-1">PAR: <span className={`font-semibold ${parseFloat(p.par) > 3 ? "text-[#ef4444]" : "text-[#22c55e]"}`}>{p.par}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== REVIEW MODAL ======== */}
      <Modal open={reviewOpen && !!selectedApp} onClose={() => setReviewOpen(false)}
        title={`Loan Review — ${selectedApp?.id || ""}`} size="lg">
        {selectedApp && (
          <div className="space-y-5">
            <div className="bg-[#f8f9fa] rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-[#64748b]">Applicant</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{selectedApp.member} ({selectedApp.sv})</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#64748b]">Product</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{selectedApp.product}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#64748b]">Amount Requested</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(selectedApp.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#64748b]">Term</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{selectedApp.term}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#64748b]">Application Date</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{selectedApp.applied_date}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#64748b]">Credit Score</p>
                  <p className={`text-sm font-semibold ${selectedApp.score >= 80 ? "text-[#22c55e]" : selectedApp.score >= 60 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}>
                    {selectedApp.score}/100
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[#64748b] mb-2">Guarantors</p>
              <div className="flex gap-2 flex-wrap">
                {selectedApp.guarantors.map((g) => (
                  <span key={g} className="px-3 py-1.5 bg-[#4A90D9]/10 text-[#4A90D9] rounded-lg text-xs font-medium">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[#f59e0b]/5 rounded-xl border border-[#f59e0b]/20">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
              <p className="text-xs text-[#f59e0b]">Status: <b className="capitalize">{selectedApp.status.replace("_", " ")}</b></p>
            </div>
            {selectedApp.status !== "approved" && selectedApp.status !== "rejected" && (
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setReviewOpen(false); setDeclineOpen(true); }}
                  className="px-4 py-2.5 bg-[#ef4444] text-white rounded-xl text-sm font-medium hover:bg-[#dc2626] transition-colors flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
                <button onClick={() => { setReviewOpen(false); setApproveOpen(true); }}
                  className="px-4 py-2.5 bg-[#22c55e] text-white rounded-xl text-sm font-medium hover:bg-[#16a34a] transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======== APPROVE MODAL ======== */}
      <Modal open={approveOpen && !!selectedApp} onClose={() => setApproveOpen(false)} title="Approve Loan" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setApproveOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
              Cancel
            </button>
            <button onClick={handleApprove}
              className="px-5 py-2.5 bg-[#22c55e] text-white rounded-xl text-sm font-medium hover:bg-[#16a34a] transition-colors flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirm Approval
            </button>
          </div>
        }>
        {selectedApp && (
          <div className="space-y-4">
            <div className="p-3 bg-[#22c55e]/5 rounded-xl border border-[#22c55e]/20">
              <p className="text-sm text-[#1A1A1A]">
                Approve <b>{formatCurrency(selectedApp.amount)}</b> {selectedApp.product} for <b>{selectedApp.member}</b>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#f8f9fa] rounded-lg p-3">
                <p className="text-[#64748b]">Credit Score</p>
                <p className="font-bold text-[#1A1A1A]">{selectedApp.score}/100</p>
              </div>
              <div className="bg-[#f8f9fa] rounded-lg p-3">
                <p className="text-[#64748b]">Guarantors</p>
                <p className="font-bold text-[#1A1A1A]">{selectedApp.guarantors.length}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Approval Note (Optional)</label>
              <textarea className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 focus:border-[#22c55e] transition-colors resize-none"
                rows={3} placeholder="Add any conditions or notes..." value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      {/* ======== DECLINE MODAL ======== */}
      <Modal open={declineOpen && !!selectedApp} onClose={() => setDeclineOpen(false)} title="Decline Loan Application" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeclineOpen(false)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
              Cancel
            </button>
            <button onClick={handleDecline} disabled={!declineReason}
              className="px-5 py-2.5 bg-[#ef4444] text-white rounded-xl text-sm font-medium hover:bg-[#dc2626] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Confirm Decline
            </button>
          </div>
        }>
        {selectedApp && (
          <div className="space-y-4">
            <div className="p-3 bg-[#ef4444]/5 rounded-xl border border-[#ef4444]/20">
              <p className="text-sm text-[#1A1A1A]">
                Decline <b>{formatCurrency(selectedApp.amount)}</b> {selectedApp.product} application from <b>{selectedApp.member}</b>?
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Reason for Decline *</label>
              <select className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ef4444]/20 focus:border-[#ef4444] transition-colors mb-3"
                value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option value="insufficient_savings">Insufficient savings balance</option>
                <option value="poor_credit">Poor credit history</option>
                <option value="missing_guarantors">Missing/inadequate guarantors</option>
                <option value="existing_loan">Existing active loan not cleared</option>
                <option value="incomplete_docs">Incomplete documentation</option>
                <option value="other">Other (specify below)</option>
              </select>
              <textarea className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ef4444]/20 focus:border-[#ef4444] transition-colors resize-none"
                rows={2} placeholder="Additional notes..." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
