"use client";
import { useState } from "react";
import Modal, { Button, FormField, SelectInput, TextInput } from "@/components/Modal";
import { showToast } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import { shortName, usePortalData } from "../_lib/usePortalData";
import { DEFAULT_PHONE, isValidPhone, parseAmount } from "../_lib/forms";

const MIN_DEPOSIT = 1_000;
const CHANNELS = [
  { value: "Mobile Money", label: "Mobile Money" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash (at branch)" },
];

/** Quick Deposit — credits a savings account and records the transaction. */
export default function DepositModal({ open, onClose, defaultAccount }: { open: boolean; onClose: () => void; defaultAccount?: string }) {
  if (!open) return null;
  return <DepositDialog onClose={onClose} defaultAccount={defaultAccount} />;
}

function DepositDialog({ onClose, defaultAccount }: { onClose: () => void; defaultAccount?: string }) {
  const { accounts, deposit } = usePortalData();
  // Fixed deposits are locked for their tenor, so they can't be topped up.
  const options = accounts.filter((a) => a.code !== "SV-FIX");
  const [accountId, setAccountId] = useState(defaultAccount && options.some((a) => a.id === defaultAccount) ? defaultAccount : "sa-001");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("Mobile Money");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const amt = parseAmount(amount);
    const e: Record<string, string> = {};
    if (!Number.isFinite(amt) || amt < MIN_DEPOSIT) e.amount = `Enter at least ${formatCurrency(MIN_DEPOSIT)}`;
    else if (amt > 50_000_000) e.amount = "Deposits above UGX 50,000,000 must be made at the branch";
    if (channel === "Mobile Money" && !isValidPhone(phone)) e.phone = "Enter a valid number, e.g. +256 770 123 456";
    setErrors(e);
    if (Object.keys(e).length) return;
    const acct = accounts.find((a) => a.id === accountId);
    deposit(accountId, Math.round(amt), channel);
    showToast(`${formatCurrency(amt)} deposited to ${shortName(acct?.product ?? "")}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Quick Deposit"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={submit}>Deposit</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <FormField label="Account" required>
          <SelectInput
            value={accountId}
            onChange={setAccountId}
            options={options.map((a) => ({ value: a.id, label: `${shortName(a.product)} · ${a.account_number} (${formatCurrency(a.balance)})` }))}
          />
        </FormField>
        <FormField label="Amount (UGX)" required error={errors.amount} hint={`Minimum ${formatCurrency(MIN_DEPOSIT)}`}>
          <TextInput value={amount} onChange={setAmount} type="number" min={MIN_DEPOSIT} step={1000} placeholder="e.g. 200000" inputMode="numeric" />
        </FormField>
        <FormField label="Channel" required>
          <SelectInput value={channel} onChange={setChannel} options={CHANNELS} />
        </FormField>
        {channel === "Mobile Money" && (
          <FormField label="Mobile Money number" required error={errors.phone} hint="You'll get a prompt on this phone to approve the payment">
            <TextInput value={phone} onChange={setPhone} type="tel" placeholder="+256 7XX XXX XXX" />
          </FormField>
        )}
        {channel === "Bank Transfer" && (
          <p className="text-xs dm-text-secondary rounded-xl dm-surface-hover p-3">
            Use your member number SV-0042 as the payment reference so the transfer is matched to your account.
          </p>
        )}
        {/* Hidden submit so Enter submits the form. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
