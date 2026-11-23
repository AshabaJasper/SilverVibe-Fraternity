"use client";
import { useState } from "react";
import {
  BarChart3, Award, TrendingUp, Download, Calendar, DollarSign, FileText, ArrowUpRight, Plus, Minus, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Button } from "@/components/Modal";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { showToast } from "@/lib/storage";
import { generateShareCertificate, generateTablePdf } from "@/lib/pdf-reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MEMBER_SHARES } from "@/lib/mock-data";
import { TIMELINE_EVENTS as EV } from "@/lib/demo-clock";
import { DECLARED_DIVIDEND, usePortalData, type ShareCertificate } from "../_lib/usePortalData";

/** Paid dividends (seed history), oldest first. */
const PAID_DIVIDENDS = MEMBER_SHARES.dividends;
import { BuySharesModal, UnitsModal } from "../_components/SharesModals";

export default function SharesPage() {
  const { shares, unitPrice, today, member } = usePortalData();
  const iu = shares.iu;
  const [buyOpen, setBuyOpen] = useState(false);
  const [unitsMode, setUnitsMode] = useState<"buy" | "redeem" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // FY 2025/26: announced for the AGM, declared on the AGM date, payable later.
  const declared = today >= EV.agm;
  const currentFy = {
    year: EV.dividendFy,
    rate: `${EV.dividendRatePct}%`,
    amount: declared ? DECLARED_DIVIDEND : 0,
    note: declared
      ? `declared · payable ${formatDate(EV.dividendPayable)}`
      : `to be declared at the AGM on ${formatDate(EV.agm)}`,
  };
  const totalDividends = PAID_DIVIDENDS.reduce((s, d) => s + d.amount, 0);
  const chartData = [
    ...PAID_DIVIDENDS.map((d) => ({ year: d.year, amount: d.amount, paid: true })),
    ...(declared ? [{ year: currentFy.year, amount: currentFy.amount, paid: false }] : []),
  ];
  const iuReturnPct = iu.total_invested > 0 ? (iu.accrued_returns / iu.total_invested) * 100 : 0;
  // Newest certificate first, without mutating state.
  const certificates = [...shares.certificates].sort((a, b) => (a.date < b.date ? 1 : -1));

  const downloadCert = async (c: ShareCertificate) => {
    setBusy(c.number);
    try {
      await generateShareCertificate({ number: c.number, holder: member.name, sv: member.sv, shares: c.shares, amount: c.amount, date: c.date });
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
        subtitle: `${member.name} · ${member.sv}`,
        filename: `dividend-statement-${member.sv}`,
        summary: [
          ["Member", `${member.name} (${member.sv})`],
          ["Shares held", `${shares.num_shares} @ UGX ${shares.share_value.toLocaleString("en-US")}`],
          ["Share capital", `UGX ${shares.total_value.toLocaleString("en-US")}`],
          ["As at", formatDate(today)],
        ],
        sections: [
          {
            heading: "Dividends paid",
            columns: ["Financial year", "Rate", "Paid on", "Amount (UGX)"],
            rows: [...PAID_DIVIDENDS.map((d) => [d.year, d.rate, formatDate(d.paid_date), d.amount]), ["Total paid", "", "", totalDividends]],
            boldRows: [PAID_DIVIDENDS.length],
            numericCols: [3],
          },
          {
            heading: `${currentFy.year} dividend`,
            columns: ["Financial year", "Rate", "Status", "Amount (UGX)"],
            rows: [[currentFy.year, declared ? currentFy.rate : `${currentFy.rate} proposed`, currentFy.note, declared ? currentFy.amount : "-"]],
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
        subtitle={`Your share capital and investment units · as at ${formatDate(today)}`}
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
        <Summary icon={DollarSign} color="#f59e0b" label="Total Dividends" value={formatCurrency(totalDividends)} sub={declared ? `Paid over ${PAID_DIVIDENDS.length} years · ${formatCurrency(DECLARED_DIVIDEND)} declared` : `Paid over ${PAID_DIVIDENDS.length} financial years`} />
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
          <p className="text-xs dm-text-secondary -mt-2 mb-4">As at {formatDate(today)}</p>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border)" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--dm-text-secondary)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={44} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v ?? 0)), "Dividend"]} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.year} fill={d.paid ? "#22c55e" : "#4A90D9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-3 rounded-xl gap-2 border border-[#4A90D9]/20 bg-[#4A90D9]/5">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-[#4A90D9]" />
                <span className="dm-text font-medium">{currentFy.year}</span>
                <span className="text-xs dm-text-secondary">
                  @ {currentFy.rate}
                  {declared ? "" : " proposed"} · {currentFy.note}
                </span>
              </div>
              {declared ? (
                <span className="font-semibold text-[#4A90D9]">{formatCurrency(currentFy.amount)}</span>
              ) : (
                <Badge status="Upcoming" tone="blue" />
              )}
            </div>
            {[...PAID_DIVIDENDS].reverse().map((d) => (
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
          to the units held while they were earned (new units only share in later returns); redeemed units pay out at cost plus their returns into your Flexi/Wallet.
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
