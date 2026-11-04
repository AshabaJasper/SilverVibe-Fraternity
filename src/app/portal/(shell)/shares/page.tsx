"use client";
import { useState } from "react";
import {
  BarChart3, Award, TrendingUp, Download, Calendar, DollarSign, FileText, ArrowUpRight, Plus, Minus, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/Modal";
import { EmptyState, PageHeader } from "@/components/ui";
import { showToast } from "@/lib/storage";
import { generateShareCertificate, generateTablePdf } from "@/lib/pdf-reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MEMBER_INFO, usePortalData, type ShareCertificate } from "../_lib/usePortalData";
import { BuySharesModal, UnitsModal } from "../_components/SharesModals";

export default function SharesPage() {
  const { shares, unitPrice, today } = usePortalData();
  const iu = shares.iu;
  const [buyOpen, setBuyOpen] = useState(false);
  const [unitsMode, setUnitsMode] = useState<"buy" | "redeem" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const totalDividends = shares.dividends.reduce((s, d) => s + d.amount, 0);
  const iuReturnPct = iu.total_invested > 0 ? (iu.accrued_returns / iu.total_invested) * 100 : 0;
  // Newest certificate first, without mutating state.
  const certificates = [...shares.certificates].sort((a, b) => (a.date < b.date ? 1 : -1));

  const downloadCert = async (c: ShareCertificate) => {
    setBusy(c.number);
    try {
      await generateShareCertificate({ number: c.number, holder: MEMBER_INFO.name, sv: MEMBER_INFO.sv, shares: c.shares, amount: c.amount, date: c.date });
      showToast(`Certificate ${c.number} downloaded`);
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setBusy(null);
    }
  };

  const downloadDividends = async () => {
    setBusy("dividends");
    try {
      await generateTablePdf({
        title: "Dividend Statement",
        subtitle: `${MEMBER_INFO.name} · ${MEMBER_INFO.sv}`,
        filename: `dividend-statement-${MEMBER_INFO.sv}`,
        summary: [
          ["Member", `${MEMBER_INFO.name} (${MEMBER_INFO.sv})`],
          ["Shares held", `${shares.num_shares} @ UGX ${shares.share_value.toLocaleString("en-US")}`],
          ["Share capital", `UGX ${shares.total_value.toLocaleString("en-US")}`],
          ["As at", formatDate(today)],
        ],
        sections: [
          {
            heading: "Dividends paid",
            columns: ["Financial year", "Rate", "Paid on", "Amount (UGX)"],
            rows: [...shares.dividends.map((d) => [d.year, d.rate, formatDate(d.paid_date), d.amount]), ["Total", "", "", totalDividends]],
            boldRows: [shares.dividends.length],
            numericCols: [3],
          },
        ],
      });
      showToast("Dividend statement downloaded");
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Shares & Investments"
        subtitle="Your share capital and investment units"
        actions={
          <>
            <Button variant="success" onClick={() => setBuyOpen(true)}>
              <Plus className="w-4 h-4" /> Buy Shares
            </Button>
            <Button variant="secondary" onClick={() => setUnitsMode("buy")}>
              <TrendingUp className="w-4 h-4" /> Buy Units
            </Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Summary icon={BarChart3} color="#22c55e" label="Share Capital" value={formatCurrency(shares.total_value)} sub={`${shares.num_shares} shares @ ${formatCurrency(shares.share_value)} each`} />
        <Summary icon={TrendingUp} color="#a855f7" label="Investment Units" value={formatCurrency(iu.current_value)} sub={`${iu.unit_balance} units`} />
        <Summary icon={DollarSign} color="#f59e0b" label="Total Dividends" value={formatCurrency(totalDividends)} sub={`${shares.dividends.length} financial years`} />
        <Summary icon={ArrowUpRight} color="#4A90D9" label="IU Returns" value={formatCurrency(iu.accrued_returns)} sub={`${iuReturnPct.toFixed(1)}% on ${formatCurrency(iu.total_invested)} invested`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificates */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-semibold dm-text flex items-center gap-2">
              <Award className="w-4 h-4 text-[#f59e0b]" /> Share Certificates
            </h3>
            <span className="text-xs dm-text-secondary">{certificates.length} issued</span>
          </div>
          {certificates.length === 0 ? (
            <EmptyState icon={Award} title="No certificates yet" action={<Button variant="success" onClick={() => setBuyOpen(true)}>Buy shares</Button>} />
          ) : (
            <div className="space-y-3">
              {certificates.map((cert) => (
                <div key={cert.number} className="flex items-center justify-between gap-3 p-4 dm-surface-hover rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#f59e0b]/50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium dm-text">{cert.number}</p>
                      <p className="text-xs dm-text-secondary">
                        {cert.shares} shares · issued {formatDate(cert.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold dm-text hidden sm:inline">{formatCurrency(cert.amount)}</span>
                    <button
                      type="button"
                      onClick={() => downloadCert(cert)}
                      disabled={busy !== null}
                      aria-label={`Download certificate ${cert.number}`}
                      title="Download PDF certificate"
                      className="p-2 rounded-lg hover:dm-surface border dm-border transition-colors disabled:opacity-50"
                    >
                      {busy === cert.number ? <Loader2 className="w-4 h-4 dm-text-secondary animate-spin" /> : <Download className="w-4 h-4 dm-text-secondary" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dividends */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-semibold dm-text flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#22c55e]" /> Dividend History
            </h3>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={downloadDividends} disabled={busy !== null}>
              {busy === "dividends" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Statement
            </Button>
          </div>
          {shares.dividends.length === 0 ? (
            <EmptyState icon={DollarSign} title="No dividends paid yet" />
          ) : (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shares.dividends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={44} />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v ?? 0)), "Dividend"]} />
                    <Bar dataKey="amount" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {shares.dividends.map((d) => (
                  <div key={d.year} className="flex items-center justify-between text-sm p-3 dm-surface-hover rounded-xl gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="w-4 h-4 dm-text-secondary" />
                      <span className="dm-text font-medium">{d.year}</span>
                      <span className="text-xs dm-text-secondary">
                        @ {d.rate} · paid {formatDate(d.paid_date)}
                      </span>
                    </div>
                    <span className="font-semibold text-[#16a34a]">{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Investment units */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold dm-text flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#a855f7]" /> Investment Units
          </h3>
          <div className="flex gap-2">
            <Button variant="accent" className="px-3 py-1.5 text-xs" onClick={() => setUnitsMode("buy")}>
              <Plus className="w-3.5 h-3.5" /> Buy units
            </Button>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setUnitsMode("redeem")} disabled={iu.unit_balance < 1}>
              <Minus className="w-3.5 h-3.5" /> Redeem units
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-gradient-to-r from-[#a855f7]/5 to-[#4A90D9]/5 rounded-xl border border-[#a855f7]/15">
          {[
            { label: "Units held", value: String(iu.unit_balance), cls: "dm-text" },
            { label: "Unit price (cost)", value: formatCurrency(unitPrice), cls: "dm-text" },
            { label: "Total invested", value: formatCurrency(iu.total_invested), cls: "dm-text" },
            { label: "Accrued returns", value: formatCurrency(iu.accrued_returns), cls: "text-[#16a34a]" },
            { label: "Current value", value: formatCurrency(iu.current_value), cls: "text-[#a855f7]" },
          ].map((x) => (
            <div key={x.label}>
              <p className="text-xs dm-text-secondary">{x.label}</p>
              <p className={`text-lg font-bold ${x.cls}`}>{x.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs dm-text-secondary mt-3">
          Investment Units fund the society&apos;s long-term assets (real estate, listed shares and other income-earning investments). Returns accrue
          to unit holders; redeemed units pay out at cost plus accrued returns into your Flexi/Wallet.
        </p>
      </div>

      <BuySharesModal open={buyOpen} onClose={() => setBuyOpen(false)} />
      <UnitsModal mode={unitsMode} onClose={() => setUnitsMode(null)} />
    </div>
  );
}

function Summary({ icon: Icon, color, label, value, sub }: { icon: React.ElementType; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm dm-text-secondary">{label}</span>
      </div>
      <p className="text-2xl font-bold dm-text">{value}</p>
      {sub && <p className="text-xs dm-text-secondary mt-1">{sub}</p>}
    </div>
  );
}
