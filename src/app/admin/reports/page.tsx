"use client";
import { useState } from "react";
import {
  FileText, Download, Calendar, Filter, BarChart3, Users,
  CreditCard, PiggyBank, TrendingUp, Award, BookOpen, Shield,
  Clock, CheckCircle, FileSpreadsheet, Printer, ChevronDown,
} from "lucide-react";
import {
  generateIncomeStatement,
  generateBalanceSheet,
  generateSavingsSummary,
  generateLoanPortfolio,
  generatePARReport,
  generateMemberRegister,
  generateCustomReport,
} from "@/lib/pdf-reports";


const REPORT_CATEGORIES = [
  {
    title: "Financial Reports",
    icon: BarChart3,
    color: "#4A90D9",
    reports: [
      { name: "Income Statement", desc: "Revenue and expense summary", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "Balance Sheet", desc: "Assets, liabilities, equity snapshot", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "Cash Flow Statement", desc: "Operating, investing, financing flows", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "Trial Balance", desc: "All account balances", frequency: "Daily", lastGenerated: "2025-01-15" },
    ],
  },
  {
    title: "Savings Reports",
    icon: PiggyBank,
    color: "#22c55e",
    reports: [
      { name: "Savings Summary", desc: "Total deposits, withdrawals, balances by product", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "Dormant Accounts", desc: "Accounts with no activity > 6 months", frequency: "Quarterly", lastGenerated: "2024-12-31" },
      { name: "Interest Computation", desc: "Monthly interest calculations per member", frequency: "Monthly", lastGenerated: "2025-01-01" },
    ],
  },
  {
    title: "Loan Reports",
    icon: CreditCard,
    color: "#1A1A1A",
    reports: [
      { name: "Loan Portfolio Report", desc: "Active loans by product, status, and aging", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "PAR Report", desc: "Portfolio at risk by aging bucket", frequency: "Weekly", lastGenerated: "2025-01-13" },
      { name: "Disbursement Report", desc: "Loans disbursed during period", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "Collection Report", desc: "Loan repayments received", frequency: "Daily", lastGenerated: "2025-01-15" },
      { name: "Arrears Report", desc: "Overdue loans and follow-up status", frequency: "Weekly", lastGenerated: "2025-01-13" },
    ],
  },
  {
    title: "Member Reports",
    icon: Users,
    color: "#a855f7",
    reports: [
      { name: "Member Register", desc: "Complete list of all members with details", frequency: "On-demand", lastGenerated: "2025-01-10" },
      { name: "New Registrations", desc: "Members registered during period", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "KYC Compliance", desc: "Member KYC verification status", frequency: "Quarterly", lastGenerated: "2024-12-31" },
    ],
  },
  {
    title: "Regulatory Reports",
    icon: Shield,
    color: "#ef4444",
    reports: [
      { name: "UMRA Quarterly Return", desc: "Uganda Microfinance Regulatory Authority submission", frequency: "Quarterly", lastGenerated: "2024-12-31" },
      { name: "AML/CTF Report", desc: "Suspicious transaction reporting", frequency: "Monthly", lastGenerated: "2025-01-01" },
      { name: "Capital Adequacy", desc: "Regulatory capital ratios", frequency: "Quarterly", lastGenerated: "2024-12-31" },
    ],
  },
];

const RECENT_REPORTS = [
  { name: "Trial Balance - Jan 15, 2025", type: "Financial", generatedBy: "System", date: "2025-01-15 08:00", format: "PDF", size: "245 KB" },
  { name: "Daily Collection Report", type: "Loans", generatedBy: "System", date: "2025-01-15 06:00", format: "Excel", size: "180 KB" },
  { name: "PAR Report - Week 2", type: "Loans", generatedBy: "Sarah N.", date: "2025-01-13 14:30", format: "PDF", size: "320 KB" },
  { name: "Member Register Export", type: "Members", generatedBy: "Sarah N.", date: "2025-01-10 11:00", format: "Excel", size: "1.2 MB" },
  { name: "Monthly Financial Pack - Dec 2024", type: "Financial", generatedBy: "System", date: "2025-01-01 00:00", format: "PDF", size: "2.8 MB" },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "recent" | "scheduled">("catalog");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Financial Reports");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const handleGenerateReport = (reportName: string, category: string) => {
    setGeneratingReport(reportName);

    try {
      // Map report names to their generation functions
      switch (reportName) {
        case "Income Statement":
          generateIncomeStatement();
          break;
        case "Balance Sheet":
          generateBalanceSheet();
          break;
        case "Savings Summary":
          generateSavingsSummary();
          break;
        case "Loan Portfolio Report":
          generateLoanPortfolio();
          break;
        case "PAR Report":
          generatePARReport();
          break;
        case "Member Register":
          generateMemberRegister();
          break;
        default:
          generateCustomReport(reportName, category);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setTimeout(() => setGeneratingReport(null), 500);
    }
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dm-text">Reports</h1>
          <p className="dm-text-secondary text-sm">Generate, download, and schedule reports</p>
        </div>
      </div>

      <div className="flex gap-1 dm-surface-hover rounded-xl p-1">
        {(["catalog", "recent", "scheduled"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${activeTab === t ? "dm-surface dm-text shadow-sm" : "dm-text-secondary hover:dm-text"
              }`}>{t === "catalog" ? "Report Catalog" : t === "recent" ? "Recently Generated" : "Scheduled"}</button>
        ))}
      </div>

      {activeTab === "catalog" && (
        <div className="space-y-4">
          {REPORT_CATEGORIES.map((cat) => (
            <div key={cat.title} className="dm-surface rounded-xl border dm-border overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === cat.title ? null : cat.title)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#f8f9fa] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}12` }}>
                    <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold dm-text text-sm">{cat.title}</h3>
                    <p className="text-xs dm-text-secondary">{cat.reports.length} reports</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 dm-text-secondary transition-transform ${expandedCategory === cat.title ? "rotate-180" : ""}`} />
              </button>
              {expandedCategory === cat.title && (
                <div className="border-t dm-border">
                  {cat.reports.map((r) => (
                    <div key={r.name} className="px-5 py-3 flex items-center justify-between border-b dm-border last:border-0 hover:bg-[#f8f9fa]">
                      <div className="flex-1">
                        <p className="text-sm font-medium dm-text">{r.name}</p>
                        <p className="text-xs dm-text-secondary">{r.desc}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-[#C0C0C0]">
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {r.frequency}</span>
                          <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> Last: {r.lastGenerated}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleGenerateReport(r.name, cat.title)}
                          disabled={generatingReport === r.name}
                          className="px-3 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-xs font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {generatingReport === r.name ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              Generate PDF
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "recent" && (
        <div className="dm-surface rounded-xl border dm-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b dm-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Report</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Generated By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Format</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Size</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold dm-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_REPORTS.map((r, i) => (
                  <tr key={i} className="border-b dm-border hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#C0C0C0]" />
                        <span className="text-xs font-medium dm-text">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs dm-text-secondary">{r.type}</td>
                    <td className="px-4 py-3 text-xs dm-text-secondary">{r.generatedBy}</td>
                    <td className="px-4 py-3 text-xs dm-text-secondary">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.format === "PDF" ? "bg-[#ef4444]/10 text-[#ef4444]" : "bg-[#22c55e]/10 text-[#22c55e]"
                        }`}>{r.format}</span>
                    </td>
                    <td className="px-4 py-3 text-xs dm-text-secondary">{r.size}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-lg hover:dm-surface-hover"><Download className="w-3.5 h-3.5 dm-text-secondary" /></button>
                        <button className="p-1.5 rounded-lg hover:dm-surface-hover"><Printer className="w-3.5 h-3.5 dm-text-secondary" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "scheduled" && (
        <div className="space-y-4">
          {[
            { name: "Daily Collection Report", schedule: "Every day at 6:00 AM", format: "Excel", recipients: "sarah@silvervibe.coop", status: "active" },
            { name: "Weekly PAR Report", schedule: "Every Monday at 8:00 AM", format: "PDF", recipients: "board@silvervibe.coop", status: "active" },
            { name: "Monthly Financial Pack", schedule: "1st of every month", format: "PDF", recipients: "sarah@silvervibe.coop, ceo@silvervibe.coop", status: "active" },
            { name: "Quarterly UMRA Return", schedule: "Last day of quarter", format: "PDF + Excel", recipients: "compliance@silvervibe.coop", status: "active" },
          ].map((s) => (
            <div key={s.name} className="dm-surface rounded-xl p-5 border dm-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold dm-text text-sm">{s.name}</h3>
                  <span className="bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full text-[10px] font-semibold">{s.status}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs dm-text-secondary">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.schedule}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {s.format}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.recipients}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border dm-border rounded-lg text-xs font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
                  Edit
                </button>
                <button className="px-3 py-1.5 border dm-border rounded-lg text-xs font-medium text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors">
                  Disable
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
