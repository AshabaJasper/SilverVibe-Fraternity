"use client";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp, Users, Award, Download, Plus, Settings, Percent, Edit2, FileText,
  ArrowLeftRight, Coins, Loader2, CheckCircle, Trash2, Wallet,
} from "lucide-react";
import {
  AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatCurrency, formatCompact, formatNumber, formatDate, todayISO, cn } from "@/lib/utils";
import { ADMIN_KPI, ADMIN_MEMBERS_LIST } from "@/lib/mock-data";
import { usePersistedState, showToast } from "@/lib/storage";
import { exportToCsv } from "@/lib/export";
import { generateShareCertificate } from "@/lib/pdf-reports";
import Modal, { FormField, TextInput, SelectInput, Button, ConfirmDialog } from "@/components/Modal";
import { EmptyState, Badge, PageHeader, StatCard, Tabs } from "@/components/ui";

// ------------------------------------------------------------------
// Types & seed data
// ------------------------------------------------------------------
interface ShareConfig {
  shareValue: number;
  minShares: number; // minimum shares per purchase
  maxShares: number; // maximum holding per member
  dividendRate: number; // target rate (%) used as the default when declaring
  iuPrice: number; // current NAV per investment unit
}

interface Shareholder {
  sv: string; // "OTHER" for the aggregated row
  name: string;
  shares: number;
  cert: string;
  since: string;
  /** Aggregated row standing in for members not listed individually. */
  holders?: number;
}

interface Dividend {
  fy: string;
  rate: number;
  amount: number;
  shareholders: number;
  declared: string;
  paid?: string;
  status: "paid" | "declared";
}

interface IuHolding {
  sv: string;
  name: string;
  units: number;
  invested: number; // cost basis (UGX)
  updated: string;
}

const DEFAULT_SHARE_CONFIG: ShareConfig = { shareValue: 20_000, minShares: 5, maxShares: 2_500, dividendRate: 10, iuPrice: 115_000 };

/** Dashboard KPI: share capital UGX 1.28B at UGX 20,000/share = 64,000 shares held by 342 shareholders. */
const TOTAL_SHAREHOLDERS = 342;

// Named holdings = ADMIN_MEMBERS_LIST share values / UGX 20,000.
const NAMED: Shareholder[] = ADMIN_MEMBERS_LIST.map((m, i) => ({
  sv: m.sv_number,
  name: m.name,
  shares: Math.round(m.shares / DEFAULT_SHARE_CONFIG.shareValue),
  cert: `SV-CERT-${String(101 + i * 7).padStart(4, "0")}`,
  since: m.joined,
}));
const NAMED_SHARES = NAMED.reduce((a, s) => a + s.shares, 0);
const TOTAL_SEED_SHARES = ADMIN_KPI.total_share_capital.value / DEFAULT_SHARE_CONFIG.shareValue; // 64,000

const DEFAULT_SHAREHOLDERS: Shareholder[] = [
  ...NAMED,
  {
    sv: "OTHER",
    name: "Other members",
    shares: TOTAL_SEED_SHARES - NAMED_SHARES,
    holders: TOTAL_SHAREHOLDERS - NAMED.length,
    cert: "—",
    since: "2020-09-15",
  },
];

// FY 2024 and FY 2025 rates match the member portal's dividend history.
const DEFAULT_DIVIDENDS: Dividend[] = [
  { fy: "FY 2021", rate: 7, amount: 57_400_000, shareholders: 268, declared: "2022-02-25", paid: "2022-03-18", status: "paid" },
  { fy: "FY 2022", rate: 7.5, amount: 68_250_000, shareholders: 289, declared: "2023-02-24", paid: "2023-03-17", status: "paid" },
  { fy: "FY 2023", rate: 9, amount: 90_000_000, shareholders: 305, declared: "2024-02-23", paid: "2024-03-15", status: "paid" },
  { fy: "FY 2024", rate: 8, amount: 84_800_000, shareholders: 321, declared: "2025-02-28", paid: "2025-03-15", status: "paid" },
  { fy: "FY 2025", rate: 10, amount: 113_800_000, shareholders: 334, declared: "2026-02-27", paid: "2026-03-20", status: "paid" },
];

// James Mukasa (SV-0042) matches the member portal: 15 units, UGX 1.5M invested.
const DEFAULT_IU: IuHolding[] = [
  { sv: "SV-0089", name: "Samuel Byaruhanga", units: 200, invested: 20_000_000, updated: "2026-09-14" },
  { sv: "SV-0012", name: "Robert Kizza", units: 120, invested: 12_400_000, updated: "2026-08-30" },
  { sv: "SV-0056", name: "Fatima Nankya", units: 60, invested: 6_300_000, updated: "2026-10-02" },
  { sv: "SV-0001", name: "Alice Namugga", units: 40, invested: 4_000_000, updated: "2026-06-11" },
  { sv: "SV-0023", name: "Grace Nabirye", units: 25, invested: 2_650_000, updated: "2026-10-21" },
  { sv: "SV-0042", name: "James Mukasa", units: 15, invested: 1_500_000, updated: "2026-03-20" },
  { sv: "SV-0034", name: "David Ssempala", units: 10, invested: 1_080_000, updated: "2026-09-05" },
];

// Total shares in issue, Dec 2025 – Nov 2026 (+12.5% YoY). The last point is replaced by the live total.
const SHARE_GROWTH = [
  { month: "Dec", shares: 57_400 }, { month: "Jan", shares: 57_900 }, { month: "Feb", shares: 58_300 },
  { month: "Mar", shares: 58_900 }, { month: "Apr", shares: 59_500 }, { month: "May", shares: 60_100 },
  { month: "Jun", shares: 60_700 }, { month: "Jul", shares: 61_300 }, { month: "Aug", shares: 62_000 },
  { month: "Sep", shares: 62_700 }, { month: "Oct", shares: 63_300 }, { month: "Nov", shares: 64_000 },
];

const FY_OPTIONS = ["FY 2021", "FY 2022", "FY 2023", "FY 2024", "FY 2025", "FY 2026"];

type TabId = "overview" | "shareholders" | "dividends" | "units";
const TAB_IDS: TabId[] = ["overview", "shareholders", "dividends", "units"];

const MEMBER_OPTIONS = [
  { value: "", label: "Select a member…" },
  ...ADMIN_MEMBERS_LIST.map((m) => ({ value: m.sv_number, label: `${m.name} (${m.sv_number})` })),
];

const th = "text-left px-4 py-3 text-xs font-semibold text-[#64748b] whitespace-nowrap";
const td = "px-4 py-3 text-xs whitespace-nowrap";

type Errors = Record<string, string>;

export default function AdminSharesPage() {
  return (
    <Suspense>
      <SharesInner />
    </Suspense>
  );
}

function SharesInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get("tab") as TabId | null;
  const activeTab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "overview";
  const setTab = (t: TabId) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  const [shareholders, setShareholders] = usePersistedState<Shareholder[]>("admin_shareholders", DEFAULT_SHAREHOLDERS);
  const [config, setConfig] = usePersistedState<ShareConfig>("admin_share_config", DEFAULT_SHARE_CONFIG);
  const [dividends, setDividends] = usePersistedState<Dividend[]>("admin_share_dividends", DEFAULT_DIVIDENDS);
  const [iu, setIu] = usePersistedState<IuHolding[]>("admin_iu_holdings", DEFAULT_IU);

  // Modal state
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ sv: "", shares: "" });
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({ shareValue: "", minShares: "", maxShares: "", dividendRate: "", iuPrice: "" });
  const [editing, setEditing] = useState<Shareholder | null>(null);
  const [editShares, setEditShares] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ from: "", to: "", shares: "" });
  const [declareOpen, setDeclareOpen] = useState(false);
  const [declareForm, setDeclareForm] = useState({ fy: "", rate: "" });
  const [divConfirm, setDivConfirm] = useState<null | { action: "pay" | "cancel"; fy: string }>(null);
  const [iuModal, setIuModal] = useState<null | "buy" | "redeem">(null);
  const [iuForm, setIuForm] = useState({ sv: "", units: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [certBusy, setCertBusy] = useState<string | null>(null);

  // ---------------- Derived figures ----------------
  const totalShares = shareholders.reduce((a, s) => a + s.shares, 0);
  const totalCapital = totalShares * config.shareValue;
  const holderCount = shareholders.reduce((a, s) => a + (s.holders ?? 1), 0);
  const named = shareholders.filter((s) => !s.holders);

  // Sort a copy (never mutate state in render): largest holders first, aggregated row last.
  const sortedShareholders = useMemo(
    () => [...shareholders].sort((a, b) => (a.holders ? 1 : 0) - (b.holders ? 1 : 0) || b.shares - a.shares),
    [shareholders]
  );
  const sortedDividends = useMemo(() => [...dividends].sort((a, b) => a.fy.localeCompare(b.fy)), [dividends]);
  const latestDividend = sortedDividends[sortedDividends.length - 1];
  const growth = useMemo(
    () => SHARE_GROWTH.map((g, i, arr) => (i === arr.length - 1 ? { ...g, shares: totalShares } : g)),
    [totalShares]
  );
  const iuTotals = useMemo(() => {
    const units = iu.reduce((a, h) => a + h.units, 0);
    const invested = iu.reduce((a, h) => a + h.invested, 0);
    const value = units * config.iuPrice;
    return { units, invested, value, gain: value - invested, holders: iu.filter((h) => h.units > 0).length };
  }, [iu, config.iuPrice]);

  const memberBySv = (sv: string) => ADMIN_MEMBERS_LIST.find((m) => m.sv_number === sv);
  const holdingOf = (sv: string) => shareholders.find((s) => s.sv === sv)?.shares ?? 0;
  const nextCert = () => {
    const max = shareholders.reduce((m, s) => Math.max(m, Number(s.cert.replace(/\D/g, "")) || 0), 0);
    return `SV-CERT-${String(max + 1).padStart(4, "0")}`;
  };

  // ---------------- Issue shares ----------------
  const issueQty = Number(issueForm.shares) || 0;
  const submitIssue = () => {
    const e: Errors = {};
    const m = memberBySv(issueForm.sv);
    if (!m) e.sv = "Choose a member";
    else if (m.status === "suspended") e.sv = `${m.name} is suspended`;
    if (!Number.isInteger(issueQty) || issueQty < config.minShares) e.shares = `Minimum purchase is ${config.minShares} shares`;
    else if (m && holdingOf(m.sv_number) + issueQty > config.maxShares)
      e.shares = `Holding would exceed the ${formatNumber(config.maxShares)}-share limit (currently ${formatNumber(holdingOf(m.sv_number))})`;
    setErrors(e);
    if (Object.keys(e).length || !m) return;
    const exists = shareholders.some((s) => s.sv === m.sv_number);
    const cert = nextCert();
    setShareholders((prev) =>
      exists
        ? prev.map((s) => (s.sv === m.sv_number ? { ...s, shares: s.shares + issueQty } : s))
        : [...prev, { sv: m.sv_number, name: m.name, shares: issueQty, cert, since: todayISO() }]
    );
    showToast(`${formatNumber(issueQty)} shares (${formatCurrency(issueQty * config.shareValue)}) issued to ${m.name}`);
    setIssueOpen(false);
  };

  // ---------------- Configure ----------------
  const openConfig = () => {
    setConfigForm({
      shareValue: String(config.shareValue), minShares: String(config.minShares), maxShares: String(config.maxShares),
      dividendRate: String(config.dividendRate), iuPrice: String(config.iuPrice),
    });
    setErrors({});
    setConfigOpen(true);
  };
  const submitConfig = () => {
    const c = {
      shareValue: Number(configForm.shareValue), minShares: Number(configForm.minShares), maxShares: Number(configForm.maxShares),
      dividendRate: Number(configForm.dividendRate), iuPrice: Number(configForm.iuPrice),
    };
    const e: Errors = {};
    if (!(c.shareValue >= 1_000)) e.shareValue = "Share value must be at least UGX 1,000";
    if (!Number.isInteger(c.minShares) || c.minShares < 1) e.minShares = "At least 1 share";
    if (!Number.isInteger(c.maxShares) || c.maxShares <= c.minShares) e.maxShares = "Must be greater than the minimum";
    else if (named.some((s) => s.shares > c.maxShares)) e.maxShares = "A shareholder already holds more than this";
    if (!(c.dividendRate >= 0 && c.dividendRate <= 25)) e.dividendRate = "Between 0 and 25%";
    if (!(c.iuPrice >= 1_000)) e.iuPrice = "At least UGX 1,000";
    setErrors(e);
    if (Object.keys(e).length) return;
    setConfig(c);
    showToast("Share configuration updated");
    setConfigOpen(false);
  };

  // ---------------- Edit shareholder ----------------
  const submitEdit = () => {
    if (!editing) return;
    const n = Number(editShares);
    const e: Errors = {};
    if (!Number.isInteger(n) || n < 0) e.shares = "Enter a whole number of shares";
    else if (n > config.maxShares) e.shares = `Maximum holding is ${formatNumber(config.maxShares)} shares`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setShareholders((prev) => prev.map((s) => (s.sv === editing.sv ? { ...s, shares: n } : s)));
    showToast(`${editing.name} now holds ${formatNumber(n)} shares`);
    setEditing(null);
  };

  // ---------------- Transfer ----------------
  const submitTransfer = () => {
    const qty = Number(transferForm.shares);
    const from = shareholders.find((s) => s.sv === transferForm.from);
    const toMember = memberBySv(transferForm.to);
    const e: Errors = {};
    if (!from) e.from = "Choose the transferring shareholder";
    if (!toMember) e.to = "Choose the receiving member";
    else if (transferForm.to === transferForm.from) e.to = "Choose a different member";
    else if (toMember.status === "suspended") e.to = `${toMember.name} is suspended`;
    if (!Number.isInteger(qty) || qty < 1) e.shares = "Enter a whole number of shares";
    else if (from && qty > from.shares) e.shares = `${from.name} only holds ${formatNumber(from.shares)} shares`;
    else if (toMember && holdingOf(toMember.sv_number) + qty > config.maxShares) e.shares = `Receiver would exceed ${formatNumber(config.maxShares)} shares`;
    setErrors(e);
    if (Object.keys(e).length || !from || !toMember) return;
    const toExists = shareholders.some((s) => s.sv === toMember.sv_number);
    const cert = nextCert();
    setShareholders((prev) => {
      const moved = prev.map((s) =>
        s.sv === from.sv ? { ...s, shares: s.shares - qty } : s.sv === toMember.sv_number ? { ...s, shares: s.shares + qty } : s
      );
      return toExists ? moved : [...moved, { sv: toMember.sv_number, name: toMember.name, shares: qty, cert, since: todayISO() }];
    });
    showToast(`${formatNumber(qty)} shares transferred from ${from.name} to ${toMember.name}`);
    setTransferOpen(false);
  };

  // ---------------- Dividends ----------------
  const availableFy = FY_OPTIONS.filter((fy) => !dividends.some((d) => d.fy === fy));
  const declareRate = Number(declareForm.rate) || 0;
  const declarePayout = Math.round((totalCapital * declareRate) / 100);
  const openDeclare = () => {
    setDeclareForm({ fy: availableFy[availableFy.length - 1] ?? "", rate: String(config.dividendRate) });
    setErrors({});
    setDeclareOpen(true);
  };
  const submitDeclare = () => {
    const e: Errors = {};
    if (!declareForm.fy) e.fy = "All fiscal years have been declared";
    if (!(declareRate > 0 && declareRate <= 25)) e.rate = "Rate must be between 0.1 and 25%";
    setErrors(e);
    if (Object.keys(e).length) return;
    setDividends((prev) => [
      ...prev,
      { fy: declareForm.fy, rate: declareRate, amount: declarePayout, shareholders: holderCount, declared: todayISO(), status: "declared" },
    ]);
    showToast(`${declareForm.fy} dividend of ${declareRate}% declared — payout ${formatCurrency(declarePayout)}`);
    setDeclareOpen(false);
  };
  const runDivConfirm = () => {
    if (!divConfirm) return;
    if (divConfirm.action === "pay") {
      setDividends((prev) => prev.map((d) => (d.fy === divConfirm.fy ? { ...d, status: "paid", paid: todayISO() } : d)));
      showToast(`${divConfirm.fy} dividend marked as paid`);
    } else {
      setDividends((prev) => prev.filter((d) => d.fy !== divConfirm.fy));
      showToast(`${divConfirm.fy} declaration cancelled`, "info");
    }
  };

  // ---------------- Investment units ----------------
  const iuQty = Number(iuForm.units) || 0;
  const openIu = (mode: "buy" | "redeem", sv = "") => {
    setIuForm({ sv, units: "" });
    setErrors({});
    setIuModal(mode);
  };
  const submitIu = () => {
    const e: Errors = {};
    const m = memberBySv(iuForm.sv);
    const holding = iu.find((h) => h.sv === iuForm.sv);
    if (!m) e.sv = "Choose a member";
    if (!Number.isInteger(iuQty) || iuQty < 1) e.units = "Enter a whole number of units";
    else if (iuModal === "redeem" && (!holding || iuQty > holding.units)) e.units = `Only ${holding?.units ?? 0} units held`;
    setErrors(e);
    if (Object.keys(e).length || !m) return;
    const amount = iuQty * config.iuPrice;
    if (iuModal === "buy") {
      setIu((prev) =>
        prev.some((h) => h.sv === m.sv_number)
          ? prev.map((h) => (h.sv === m.sv_number ? { ...h, units: h.units + iuQty, invested: h.invested + amount, updated: todayISO() } : h))
          : [...prev, { sv: m.sv_number, name: m.name, units: iuQty, invested: amount, updated: todayISO() }]
      );
      showToast(`${iuQty} units bought for ${m.name} (${formatCurrency(amount)})`);
    } else if (holding) {
      // Reduce cost basis at average cost so the remaining gain stays accurate.
      const costOut = Math.round((holding.invested / holding.units) * iuQty);
      setIu((prev) =>
        prev
          .map((h) => (h.sv === m.sv_number ? { ...h, units: h.units - iuQty, invested: h.invested - costOut, updated: todayISO() } : h))
          .filter((h) => h.units > 0)
      );
      showToast(`${iuQty} units redeemed for ${m.name} — payout ${formatCurrency(amount)}`);
    }
    setIuModal(null);
  };

  // ---------------- Downloads ----------------
  const downloadCert = async (s: Shareholder) => {
    setCertBusy(s.sv);
    try {
      await generateShareCertificate({ number: s.cert, holder: s.name, sv: s.sv, shares: s.shares, amount: s.shares * config.shareValue, date: todayISO() });
      showToast(`Certificate ${s.cert} downloaded`);
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setCertBusy(null);
    }
  };

  const exportShareholders = () => {
    exportToCsv(
      `shareholders-${todayISO()}`,
      sortedShareholders.map((s) => ({
        sv: s.holders ? "" : s.sv,
        name: s.holders ? `${s.name} (${s.holders})` : s.name,
        holders: s.holders ?? 1,
        shares: s.shares,
        value: s.shares * config.shareValue,
        percent: totalShares ? ((s.shares / totalShares) * 100).toFixed(2) : "0",
        cert: s.cert,
      })),
      [
        { key: "sv", label: "SV No." }, { key: "name", label: "Shareholder" }, { key: "holders", label: "Holders" },
        { key: "shares", label: "Shares" }, { key: "value", label: "Value (UGX)" }, { key: "percent", label: "% of capital" }, { key: "cert", label: "Certificate" },
      ]
    );
    showToast("Shareholder register exported");
  };

  const shareholderOptions = [
    { value: "", label: "Select shareholder…" },
    ...[...named].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ value: s.sv, label: `${s.name} (${s.sv}) — ${formatNumber(s.shares)} shares` })),
  ];
  const iuHolderOptions = [{ value: "", label: "Select holder…" }, ...iu.map((h) => ({ value: h.sv, label: `${h.name} (${h.sv}) — ${h.units} units` }))];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Shares & Dividends"
        subtitle="Manage share capital, dividends, and investment units"
        actions={
          <>
            <Button variant="secondary" onClick={openConfig}><Settings className="w-4 h-4" /> Configure</Button>
            <Button variant="secondary" onClick={() => { setTransferForm({ from: "", to: "", shares: "" }); setErrors({}); setTransferOpen(true); }}>
              <ArrowLeftRight className="w-4 h-4" /> Transfer
            </Button>
            <Button onClick={() => { setIssueForm({ sv: "", shares: String(config.minShares) }); setErrors({}); setIssueOpen(true); }}>
              <Plus className="w-4 h-4" /> Issue Shares
            </Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "overview" as TabId, label: "Overview" },
          { id: "shareholders" as TabId, label: "Shareholders", count: holderCount },
          { id: "dividends" as TabId, label: "Dividends", count: dividends.length },
          { id: "units" as TabId, label: "Investment Units", count: iu.length },
        ]}
        active={activeTab}
        onChange={setTab}
      />

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Share Capital" value={formatCompact(totalCapital)} icon={Coins} color="#4A90D9"
              sub={`${formatNumber(totalShares)} shares × ${formatCurrency(config.shareValue)}`} />
            <StatCard label="Shareholders" value={formatNumber(holderCount)} icon={Users} color="#22c55e"
              sub={`Avg ${formatNumber(Math.round(totalShares / Math.max(holderCount, 1)))} shares each`} />
            <StatCard label="Latest Dividend" value={latestDividend ? `${latestDividend.rate}%` : "—"} icon={Percent} color="#a855f7"
              sub={latestDividend ? `${latestDividend.fy} · ${formatCompact(latestDividend.amount)} (${latestDividend.status})` : "None declared"} />
            <StatCard label="Investment Units" value={formatCompact(iuTotals.value)} icon={Wallet} color="#f59e0b"
              sub={`${formatNumber(iuTotals.units)} units · ${iuTotals.holders} holders`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-1 text-sm">Shares in Issue</h3>
              <p className="text-xs dm-text-secondary mb-4">Dec 2025 – Nov 2026 · latest month is live</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={["dataMin - 1000", "dataMax + 1000"]} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => `${formatNumber(Number(v ?? 0))} shares`} />
                    <Area type="monotone" dataKey="shares" name="Shares" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold dm-text mb-1 text-sm">Dividend History</h3>
              <p className="text-xs dm-text-secondary mb-4">Bars: payout · line: rate</p>
              <div className="h-64">
                <DividendChart data={sortedDividends} />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "shareholders" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dm-border">
            <div>
              <h3 className="font-semibold dm-text text-sm">Shareholder Register</h3>
              <p className="text-xs dm-text-secondary">{formatNumber(holderCount)} shareholders · {formatNumber(totalShares)} shares · {formatCurrency(totalCapital)}</p>
            </div>
            <Button variant="secondary" onClick={exportShareholders}><Download className="w-4 h-4" /> Export CSV</Button>
          </div>
          {sortedShareholders.length === 0 ? (
            <EmptyState icon={Users} title="No shareholders" hint="Issue shares to a member to start the register." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                    <th className={th}>Shareholder</th>
                    <th className={th}>Certificate</th>
                    <th className={cn(th, "text-right")}>Shares</th>
                    <th className={cn(th, "text-right")}>Value</th>
                    <th className={cn(th, "text-right")}>% of capital</th>
                    <th className={cn(th, "text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedShareholders.map((s) => (
                    <tr key={s.sv} className={cn("border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors", s.holders && "bg-[#f8f9fa]")}>
                      <td className={td}>
                        <p className="font-medium dm-text">{s.holders ? `${s.name} (${formatNumber(s.holders)})` : s.name}</p>
                        <p className="text-[11px] dm-text-secondary">{s.holders ? "Aggregated — not listed individually" : `${s.sv} · since ${formatDate(s.since)}`}</p>
                      </td>
                      <td className={cn(td, "font-mono dm-text-secondary")}>{s.cert}</td>
                      <td className={cn(td, "text-right dm-text font-medium")}>{formatNumber(s.shares)}</td>
                      <td className={cn(td, "text-right dm-text")}>{formatCurrency(s.shares * config.shareValue)}</td>
                      <td className={cn(td, "text-right dm-text-secondary")}>{totalShares ? ((s.shares / totalShares) * 100).toFixed(2) : "0.00"}%</td>
                      <td className={cn(td, "text-right")}>
                        {s.holders ? (
                          <span className="text-[10px] dm-text-secondary">—</span>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditing(s); setEditShares(String(s.shares)); setErrors({}); }}
                              className="p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors" aria-label={`Edit ${s.name}`} title="Edit holding">
                              <Edit2 className="w-3.5 h-3.5 dm-text-secondary" />
                            </button>
                            <button onClick={() => downloadCert(s)} disabled={certBusy === s.sv || s.shares === 0}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border dm-border text-[10px] font-medium dm-text hover:bg-[#f1f5f9] transition-colors disabled:opacity-50">
                              {certBusy === s.sv ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Certificate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className={cn(td, "dm-text")}>Total ({formatNumber(holderCount)} shareholders)</td>
                    <td className={td} />
                    <td className={cn(td, "text-right dm-text")}>{formatNumber(totalShares)}</td>
                    <td className={cn(td, "text-right dm-text")}>{formatCurrency(totalCapital)}</td>
                    <td className={cn(td, "text-right dm-text")}>100%</td>
                    <td className={td} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "dividends" && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold dm-text text-sm">Dividend Declaration History</h3>
              <Button onClick={openDeclare}><Award className="w-4 h-4" /> Declare dividend</Button>
            </div>
            <div className="h-64">
              <DividendChart data={sortedDividends} />
            </div>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            {sortedDividends.length === 0 ? (
              <EmptyState icon={Award} title="No dividends declared" action={<Button onClick={openDeclare}>Declare dividend</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                      <th className={th}>Fiscal year</th>
                      <th className={cn(th, "text-right")}>Rate</th>
                      <th className={cn(th, "text-right")}>Total payout</th>
                      <th className={cn(th, "text-right")}>Shareholders</th>
                      <th className={th}>Declared</th>
                      <th className={th}>Paid</th>
                      <th className={th}>Status</th>
                      <th className={cn(th, "text-right")}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sortedDividends].reverse().map((d) => (
                      <tr key={d.fy} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                        <td className={cn(td, "font-medium dm-text")}>{d.fy}</td>
                        <td className={cn(td, "text-right dm-text")}>{d.rate}%</td>
                        <td className={cn(td, "text-right dm-text font-medium")}>{formatCurrency(d.amount)}</td>
                        <td className={cn(td, "text-right dm-text-secondary")}>{formatNumber(d.shareholders)}</td>
                        <td className={cn(td, "dm-text-secondary")}>{formatDate(d.declared)}</td>
                        <td className={cn(td, "dm-text-secondary")}>{d.paid ? formatDate(d.paid) : "—"}</td>
                        <td className={td}><Badge status={d.status} tone={d.status === "declared" ? "blue" : undefined} /></td>
                        <td className={cn(td, "text-right")}>
                          {d.status === "declared" ? (
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => setDivConfirm({ action: "pay", fy: d.fy })}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[#22c55e] text-white rounded-lg text-[10px] font-medium hover:bg-[#16a34a]">
                                <CheckCircle className="w-3 h-3" /> Mark paid
                              </button>
                              <button onClick={() => setDivConfirm({ action: "cancel", fy: d.fy })} aria-label={`Cancel ${d.fy} declaration`}
                                className="p-1.5 rounded-lg hover:bg-[#ef4444]/10 text-[#ef4444]">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] dm-text-secondary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "units" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Units in Issue" value={formatNumber(iuTotals.units)} icon={Coins} color="#4A90D9" sub={`${iuTotals.holders} holders`} />
            <StatCard label="NAV per Unit" value={formatCurrency(config.iuPrice)} icon={TrendingUp} color="#22c55e" sub="Set in Configure" />
            <StatCard label="Fund Value" value={formatCompact(iuTotals.value)} icon={Wallet} color="#a855f7" sub={`Invested ${formatCompact(iuTotals.invested)}`} />
            <StatCard label="Unrealised Gain" value={formatCompact(iuTotals.gain)} icon={Percent} color={iuTotals.gain >= 0 ? "#22c55e" : "#ef4444"}
              sub={iuTotals.invested ? `${((iuTotals.gain / iuTotals.invested) * 100).toFixed(1)}% on cost` : "—"} />
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dm-border">
              <h3 className="font-semibold dm-text text-sm">Investment Unit Holdings</h3>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openIu("redeem")} disabled={iu.length === 0}>Redeem units</Button>
                <Button onClick={() => openIu("buy")}><Plus className="w-4 h-4" /> Buy units</Button>
              </div>
            </div>
            {iu.length === 0 ? (
              <EmptyState icon={Wallet} title="No unit holders" hint="Buy units for a member to open the fund." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-[#e2e8f0]">
                      <th className={th}>Holder</th>
                      <th className={cn(th, "text-right")}>Units</th>
                      <th className={cn(th, "text-right")}>Invested</th>
                      <th className={cn(th, "text-right")}>Current value</th>
                      <th className={cn(th, "text-right")}>Gain</th>
                      <th className={th}>Last activity</th>
                      <th className={cn(th, "text-right")}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...iu].sort((a, b) => b.units - a.units).map((h) => {
                      const value = h.units * config.iuPrice;
                      return (
                        <tr key={h.sv} className="border-b border-[#e2e8f0] hover:bg-[#f8f9fa] transition-colors">
                          <td className={td}>
                            <p className="font-medium dm-text">{h.name}</p>
                            <p className="text-[11px] dm-text-secondary">{h.sv}</p>
                          </td>
                          <td className={cn(td, "text-right dm-text")}>{formatNumber(h.units)}</td>
                          <td className={cn(td, "text-right dm-text-secondary")}>{formatCurrency(h.invested)}</td>
                          <td className={cn(td, "text-right dm-text font-medium")}>{formatCurrency(value)}</td>
                          <td className={cn(td, "text-right", value >= h.invested ? "text-[#16a34a]" : "text-[#ef4444]")}>{formatCurrency(value - h.invested)}</td>
                          <td className={cn(td, "dm-text-secondary")}>{formatDate(h.updated)}</td>
                          <td className={cn(td, "text-right")}>
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => openIu("buy", h.sv)} className="px-2 py-1 rounded-lg border dm-border text-[10px] font-medium dm-text hover:bg-[#f1f5f9]">Buy</button>
                              <button onClick={() => openIu("redeem", h.sv)} className="px-2 py-1 rounded-lg border dm-border text-[10px] font-medium dm-text hover:bg-[#f1f5f9]">Redeem</button>
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

      {/* ======== ISSUE SHARES ======== */}
      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue Shares"
        footer={<><Button variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button><Button onClick={submitIssue}><Plus className="w-4 h-4" /> Issue shares</Button></>}>
        <div className="space-y-4">
          <FormField label="Member" required error={errors.sv}
            hint={issueForm.sv ? `Currently holds ${formatNumber(holdingOf(issueForm.sv))} shares` : undefined}>
            <SelectInput value={issueForm.sv} onChange={(v) => setIssueForm({ ...issueForm, sv: v })} options={MEMBER_OPTIONS} />
          </FormField>
          <FormField label="Number of shares" required error={errors.shares}
            hint={`Min ${config.minShares} per purchase · max holding ${formatNumber(config.maxShares)} shares`}>
            <TextInput type="number" min={config.minShares} value={issueForm.shares} onChange={(v) => setIssueForm({ ...issueForm, shares: v })} />
          </FormField>
          <div className="dm-surface-hover rounded-xl p-4 text-sm flex justify-between">
            <span className="dm-text-secondary">Amount payable</span>
            <b className="dm-text">{formatCurrency(issueQty * config.shareValue)}</b>
          </div>
        </div>
      </Modal>

      {/* ======== CONFIGURE ======== */}
      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Share Configuration"
        footer={<><Button variant="secondary" onClick={() => setConfigOpen(false)}>Cancel</Button><Button variant="accent" onClick={submitConfig}>Save configuration</Button></>}>
        <div className="space-y-4">
          <FormField label="Share value (UGX)" required error={errors.shareValue} hint="Changing this revalues all share capital">
            <TextInput type="number" value={configForm.shareValue} onChange={(v) => setConfigForm({ ...configForm, shareValue: v })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Minimum per purchase" required error={errors.minShares}>
              <TextInput type="number" value={configForm.minShares} onChange={(v) => setConfigForm({ ...configForm, minShares: v })} />
            </FormField>
            <FormField label="Maximum holding" required error={errors.maxShares}>
              <TextInput type="number" value={configForm.maxShares} onChange={(v) => setConfigForm({ ...configForm, maxShares: v })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Target dividend rate (%)" required error={errors.dividendRate}>
              <TextInput type="number" step="0.1" value={configForm.dividendRate} onChange={(v) => setConfigForm({ ...configForm, dividendRate: v })} />
            </FormField>
            <FormField label="IU NAV per unit (UGX)" required error={errors.iuPrice}>
              <TextInput type="number" value={configForm.iuPrice} onChange={(v) => setConfigForm({ ...configForm, iuPrice: v })} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* ======== EDIT SHAREHOLDER ======== */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit holding — ${editing?.name ?? ""}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button variant="accent" onClick={submitEdit}>Save</Button></>}>
        {editing && (
          <div className="space-y-4">
            <p className="text-xs dm-text-secondary">{editing.sv} · certificate {editing.cert}</p>
            <FormField label="Shares held" required error={errors.shares} hint={`Value: ${formatCurrency((Number(editShares) || 0) * config.shareValue)}`}>
              <TextInput type="number" min={0} value={editShares} onChange={setEditShares} />
            </FormField>
          </div>
        )}
      </Modal>

      {/* ======== TRANSFER ======== */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Shares"
        footer={<><Button variant="secondary" onClick={() => setTransferOpen(false)}>Cancel</Button><Button onClick={submitTransfer}><ArrowLeftRight className="w-4 h-4" /> Transfer</Button></>}>
        <div className="space-y-4">
          <FormField label="From shareholder" required error={errors.from}>
            <SelectInput value={transferForm.from} onChange={(v) => setTransferForm({ ...transferForm, from: v })} options={shareholderOptions} />
          </FormField>
          <FormField label="To member" required error={errors.to}>
            <SelectInput value={transferForm.to} onChange={(v) => setTransferForm({ ...transferForm, to: v })} options={MEMBER_OPTIONS} />
          </FormField>
          <FormField label="Shares to transfer" required error={errors.shares}
            hint={`Value: ${formatCurrency((Number(transferForm.shares) || 0) * config.shareValue)}`}>
            <TextInput type="number" min={1} value={transferForm.shares} onChange={(v) => setTransferForm({ ...transferForm, shares: v })} />
          </FormField>
        </div>
      </Modal>

      {/* ======== DECLARE DIVIDEND ======== */}
      <Modal open={declareOpen} onClose={() => setDeclareOpen(false)} title="Declare Dividend"
        footer={<><Button variant="secondary" onClick={() => setDeclareOpen(false)}>Cancel</Button><Button onClick={submitDeclare} disabled={!availableFy.length}><Award className="w-4 h-4" /> Declare</Button></>}>
        <div className="space-y-4">
          <FormField label="Fiscal year" required error={errors.fy}>
            {availableFy.length ? (
              <SelectInput value={declareForm.fy} onChange={(v) => setDeclareForm({ ...declareForm, fy: v })} options={availableFy.map((f) => ({ value: f, label: f }))} />
            ) : (
              <p className="text-sm dm-text-secondary">Every fiscal year up to FY 2026 has a declaration. Cancel an unpaid one to re-declare.</p>
            )}
          </FormField>
          <FormField label="Dividend rate (%)" required error={errors.rate}>
            <TextInput type="number" step="0.1" min={0} max={25} value={declareForm.rate} onChange={(v) => setDeclareForm({ ...declareForm, rate: v })} />
          </FormField>
          <div className="dm-surface-hover rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="dm-text-secondary">Share capital</span><span className="dm-text">{formatCurrency(totalCapital)}</span></div>
            <div className="flex justify-between"><span className="dm-text-secondary">Shareholders</span><span className="dm-text">{formatNumber(holderCount)}</span></div>
            <div className="flex justify-between"><span className="dm-text-secondary">Per share</span><span className="dm-text">{formatCurrency((config.shareValue * declareRate) / 100)}</span></div>
            <div className="flex justify-between border-t dm-border pt-1.5"><span className="font-medium dm-text">Total payout</span><b className="dm-text">{formatCurrency(declarePayout)}</b></div>
          </div>
        </div>
      </Modal>

      {/* ======== BUY / REDEEM UNITS ======== */}
      <Modal open={iuModal !== null} onClose={() => setIuModal(null)} title={iuModal === "redeem" ? "Redeem Investment Units" : "Buy Investment Units"}
        footer={<><Button variant="secondary" onClick={() => setIuModal(null)}>Cancel</Button><Button onClick={submitIu}>{iuModal === "redeem" ? "Redeem" : "Buy units"}</Button></>}>
        <div className="space-y-4">
          <FormField label={iuModal === "redeem" ? "Holder" : "Member"} required error={errors.sv}>
            <SelectInput value={iuForm.sv} onChange={(v) => setIuForm({ ...iuForm, sv: v })} options={iuModal === "redeem" ? iuHolderOptions : MEMBER_OPTIONS} />
          </FormField>
          <FormField label="Units" required error={errors.units} hint={`NAV ${formatCurrency(config.iuPrice)} per unit`}>
            <TextInput type="number" min={1} value={iuForm.units} onChange={(v) => setIuForm({ ...iuForm, units: v })} />
          </FormField>
          <div className="dm-surface-hover rounded-xl p-4 text-sm flex justify-between">
            <span className="dm-text-secondary">{iuModal === "redeem" ? "Payout to member" : "Amount payable"}</span>
            <b className="dm-text">{formatCurrency(iuQty * config.iuPrice)}</b>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={divConfirm !== null}
        onClose={() => setDivConfirm(null)}
        onConfirm={runDivConfirm}
        danger={divConfirm?.action === "cancel"}
        title={divConfirm?.action === "pay" ? "Mark dividend as paid" : "Cancel declaration"}
        confirmLabel={divConfirm?.action === "pay" ? "Mark paid" : "Cancel declaration"}
        message={divConfirm?.action === "pay"
          ? `Confirm that the ${divConfirm.fy} dividend has been credited to all shareholders.`
          : `Remove the unpaid ${divConfirm?.fy ?? ""} dividend declaration?`}
      />
    </div>
  );
}

/** Bars = payout amount (left axis), line = dividend rate (right axis). */
function DividendChart({ data }: { data: Dividend[] }) {
  if (!data.length) return <EmptyState icon={Award} title="No dividend history" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
        <XAxis dataKey="fy" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis yAxisId="amt" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)}M`} />
        <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} domain={[0, "dataMax + 2"]} />
        <Tooltip formatter={(v, name) => (name === "Rate" ? `${v}%` : formatCurrency(Number(v ?? 0)))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="amt" dataKey="amount" name="Payout" fill="#4A90D9" radius={[6, 6, 0, 0]} />
        <Line yAxisId="rate" type="monotone" dataKey="rate" name="Rate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
