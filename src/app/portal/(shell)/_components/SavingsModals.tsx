"use client";
import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import Modal, { Button, FormField, SelectInput, TextInput } from "@/components/Modal";
import { showToast } from "@/lib/storage";
import { exportToCsv } from "@/lib/export";
import { generateTablePdf } from "@/lib/pdf-reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { shortName, usePortalData, type PortalTxn } from "../_lib/usePortalData";
import { DEFAULT_PHONE, isValidPhone, parseAmount } from "../_lib/forms";

// ============================================================ Statement

const PERIODS = [
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "all", label: "All transactions" },
];

/** First day (YYYY-MM-01) of the month `back` months before `today`. */
function monthStart(today: string, back: number): string {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(y, m - 1 - back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Transactions belonging to an account: posted to it, or paid out of it. */
export const txnInAccount = (t: PortalTxn, id: string) => t.account_id === id || t.source_id === id;

export function StatementModal({ open, onClose, defaultAccount }: { open: boolean; onClose: () => void; defaultAccount?: string | null }) {
  if (!open) return null;
  return <StatementDialog onClose={onClose} defaultAccount={defaultAccount ?? "all"} />;
}

function StatementDialog({ onClose, defaultAccount }: { onClose: () => void; defaultAccount: string }) {
  const { accounts, transactions, today, member } = usePortalData();
  const [account, setAccount] = useState(defaultAccount);
  const [period, setPeriod] = useState("3m");
  const [busy, setBusy] = useState(false);

  const from = period === "month" ? monthStart(today, 0) : period === "3m" ? monthStart(today, 2) : "0000-00-00";
  const rows = transactions.filter((t) => t.date >= from && (account === "all" || txnInAccount(t, account)));
  const acctLabel = account === "all" ? "All accounts" : shortName(accounts.find((a) => a.id === account)?.product ?? account);
  const balances = (account === "all" ? accounts : accounts.filter((a) => a.id === account)).map((a) => ({ label: shortName(a.product), amount: a.balance }));
  const slug = `${member.sv}-${account}-${period}`;
  const periodLabel =
    period === "all" ? `All transactions to ${formatDate(today)}` : `${formatDate(from)} to ${formatDate(today)}`;

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const credits = rows.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
      const debits = rows.filter((t) => t.direction !== "credit").reduce((s, t) => s + t.amount, 0);
      await generateTablePdf({
        title: "Member Account Statement",
        subtitle: `${member.name} · ${member.sv} · ${acctLabel} · ${periodLabel}`,
        filename: `statement-${slug}`,
        summary: [
          ["Member", `${member.name} (${member.sv})`],
          ["Phone", member.phone],
          ["Account", acctLabel],
          ["Period", periodLabel],
          ["Total credits", formatCurrency(credits)],
          ["Total debits", formatCurrency(debits)],
        ],
        sections: [
          ...(balances.length
            ? [{ heading: "Account balances", columns: ["Account", "Balance (UGX)"], rows: balances.map((b) => [b.label, b.amount]), numericCols: [1] }]
            : []),
          {
            heading: "Transactions",
            columns: ["Date", "Type", "Account", "Channel", "Debit", "Credit"],
            rows: rows.length
              ? rows.map((t) => [formatDate(t.date), t.type, t.account, t.channel || "-", t.direction === "credit" ? "-" : t.amount, t.direction === "credit" ? t.amount : "-"])
              : [["-", "No transactions in this period", "", "", "", ""]],
            numericCols: [4, 5],
          },
        ],
      });
      showToast(`Statement (${acctLabel}) downloaded`);
      onClose();
    } catch {
      showToast("Could not generate PDF", "error");
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
    exportToCsv(`statement-${slug}`, rows.map((t) => ({ ...t, debit: t.direction === "credit" ? "" : t.amount, credit: t.direction === "credit" ? t.amount : "" })), [
      { key: "date", label: "Date" },
      { key: "type", label: "Type" },
      { key: "account", label: "Account" },
      { key: "channel", label: "Channel" },
      { key: "status", label: "Status" },
      { key: "debit", label: "Debit (UGX)" },
      { key: "credit", label: "Credit (UGX)" },
    ]);
    showToast(`CSV statement downloaded (${rows.length} rows)`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Download Statement"
      footer={
        <>
          <Button variant="secondary" onClick={downloadCsv} disabled={busy}>
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={downloadPdf} disabled={busy}>
            <FileDown className="w-4 h-4" /> {busy ? "Generating…" : "PDF"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Account">
          <SelectInput
            value={account}
            onChange={setAccount}
            options={[
              { value: "all", label: "All accounts (incl. loan & shares)" },
              ...accounts.map((a) => ({ value: a.id, label: `${shortName(a.product)} · ${a.account_number}` })),
            ]}
          />
        </FormField>
        <FormField label="Period">
          <SelectInput value={period} onChange={setPeriod} options={PERIODS} />
        </FormField>
        <p className="text-sm dm-text-secondary">
          {rows.length} transaction{rows.length === 1 ? "" : "s"} will be included
          {rows.length === 0 ? " — the statement will show balances only." : "."}
        </p>
      </div>
    </Modal>
  );
}

// ============================================================ Transfer

export function TransferModal({ open, onClose, defaultFrom }: { open: boolean; onClose: () => void; defaultFrom?: string | null }) {
  if (!open) return null;
  return <TransferDialog onClose={onClose} defaultFrom={defaultFrom === "sa-001" ? "sa-001" : "sa-002"} />;
}

function TransferDialog({ onClose, defaultFrom }: { onClose: () => void; defaultFrom: string }) {
  const { accounts, transfer } = usePortalData();
  const [fromId, setFromId] = useState(defaultFrom);
  // Money can leave the two liquid accounts; fixed deposits are locked for their tenor.
  const sources = accounts.filter((a) => a.id === "sa-001" || a.id === "sa-002");
  const targets = accounts.filter((a) => a.id !== fromId && a.code !== "SV-FIX");
  const [toId, setToId] = useState(targets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const from = accounts.find((a) => a.id === fromId);

  const changeFrom = (v: string) => {
    setFromId(v);
    if (v === toId) setToId(accounts.find((a) => a.id !== v && a.code !== "SV-FIX")?.id ?? "");
  };

  const submit = () => {
    const amt = parseAmount(amount);
    if (!Number.isFinite(amt) || amt < 1_000) return setError("Enter at least UGX 1,000");
    if (!from || amt > from.available_balance) return setError(`Exceeds available balance of ${formatCurrency(from?.available_balance ?? 0)}`);
    if (!toId) return setError("Choose an account to transfer to");
    transfer(fromId, toId, Math.round(amt));
    showToast(`${formatCurrency(amt)} moved to ${shortName(accounts.find((a) => a.id === toId)?.product ?? "")}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Transfer Between Accounts"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={submit}>Transfer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="From" required hint={from ? `Available: ${formatCurrency(from.available_balance)}` : undefined}>
          <SelectInput value={fromId} onChange={changeFrom} options={sources.map((a) => ({ value: a.id, label: shortName(a.product) }))} />
        </FormField>
        <FormField label="To" required>
          <SelectInput value={toId} onChange={setToId} options={targets.map((a) => ({ value: a.id, label: `${shortName(a.product)} (${formatCurrency(a.balance)})` }))} />
        </FormField>
        <FormField label="Amount (UGX)" required error={error}>
          <TextInput value={amount} onChange={(v) => { setAmount(v); setError(null); }} type="number" min={1000} step={1000} placeholder="e.g. 500000" />
        </FormField>
        {fromId === "sa-001" && (
          <p className="text-xs dm-text-secondary">Regular Savings keeps a minimum balance of {formatCurrency(from?.minimum_balance ?? 0)}; only the amount above it is available.</p>
        )}
      </div>
    </Modal>
  );
}

// ============================================================ Withdraw (Flexi)

export function WithdrawModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <WithdrawDialog onClose={onClose} />;
}

function WithdrawDialog({ onClose }: { onClose: () => void }) {
  const { accounts, requestWithdrawal } = usePortalData();
  const flexi = accounts.find((a) => a.id === "sa-002");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("Mobile Money");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const amt = parseAmount(amount);
    const e: Record<string, string> = {};
    if (!Number.isFinite(amt) || amt < 5_000) e.amount = "Enter at least UGX 5,000";
    else if (amt > (flexi?.available_balance ?? 0)) e.amount = `Exceeds available balance of ${formatCurrency(flexi?.available_balance ?? 0)}`;
    if (channel === "Mobile Money" && !isValidPhone(phone)) e.phone = "Enter a valid number, e.g. +256 770 123 456";
    setErrors(e);
    if (Object.keys(e).length) return;
    requestWithdrawal("sa-002", Math.round(amt), channel);
    showToast(`Withdrawal of ${formatCurrency(amt)} sent for approval`, "info");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Withdraw from Flexi/Wallet"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Request withdrawal</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm dm-text-secondary">
          Available: <strong className="dm-text">{formatCurrency(flexi?.available_balance ?? 0)}</strong>. The amount is held immediately and paid out once a
          savings officer approves it (usually the same working day).
        </p>
        <FormField label="Amount (UGX)" required error={errors.amount}>
          <TextInput value={amount} onChange={setAmount} type="number" min={5000} step={1000} placeholder="e.g. 300000" />
        </FormField>
        <FormField label="Pay out to" required>
          <SelectInput value={channel} onChange={setChannel} options={[{ value: "Mobile Money", label: "Mobile Money" }, { value: "Bank Transfer", label: "Bank account on file" }]} />
        </FormField>
        {channel === "Mobile Money" && (
          <FormField label="Mobile Money number" required error={errors.phone}>
            <TextInput value={phone} onChange={setPhone} type="tel" />
          </FormField>
        )}
      </div>
    </Modal>
  );
}
