"use client";
import { useState } from "react";
import Modal, { Button, FormField, SelectInput, TextInput } from "@/components/Modal";
import { showToast } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePortalData } from "../_lib/usePortalData";
import { DEFAULT_PHONE, PAY_SOURCES, isValidPhone, parseAmount } from "../_lib/forms";

/** Pay the next installment (or more) on the active loan. */
export default function RepayLoanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <RepayDialog onClose={onClose} />;
}

function RepayDialog({ onClose }: { onClose: () => void }) {
  const { nextPayment, outstandingLoan, accounts, repayLoan } = usePortalData();
  const flexi = accounts.find((a) => a.id === "sa-002");
  const [mode, setMode] = useState<"next" | "custom">("next");
  const [custom, setCustom] = useState("");
  const [source, setSource] = useState<"sa-002" | "momo">("sa-002");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!nextPayment) {
    return (
      <Modal open onClose={onClose} title="Make a Repayment" footer={<Button onClick={onClose}>Close</Button>}>
        <p className="text-sm dm-text-secondary">Your loan is fully repaid — there is nothing left to pay.</p>
      </Modal>
    );
  }

  const installment = nextPayment.total;
  const amount = mode === "next" ? installment : parseAmount(custom);

  const submit = () => {
    const e: Record<string, string> = {};
    if (mode === "custom") {
      if (!Number.isFinite(amount) || amount < installment) e.amount = `Enter at least the installment of ${formatCurrency(installment)}`;
      else if (amount > outstandingLoan) e.amount = `The full outstanding balance is ${formatCurrency(outstandingLoan)}`;
    }
    if (source === "sa-002" && Number.isFinite(amount) && amount > (flexi?.available_balance ?? 0)) {
      e.source = `Flexi/Wallet only has ${formatCurrency(flexi?.available_balance ?? 0)} available`;
    }
    if (source === "momo" && !isValidPhone(phone)) e.phone = "Enter a valid number, e.g. +256 770 123 456";
    setErrors(e);
    if (Object.keys(e).length) return;
    const amt = Math.round(amount);
    repayLoan(amt, source, source === "momo" ? phone : undefined);
    showToast(amt >= outstandingLoan ? "Loan fully repaid — congratulations!" : `Repayment of ${formatCurrency(amt)} received`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Make a Repayment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={submit}>Pay {Number.isFinite(amount) && amount > 0 ? formatCurrency(amount) : ""}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {(["next", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-xl border-2 p-3 text-left transition-colors ${mode === m ? "border-[#4A90D9] bg-[#4A90D9]/5" : "dm-border"}`}
            >
              <p className="text-sm font-semibold dm-text">{m === "next" ? "Next installment" : "Custom amount"}</p>
              <p className="text-xs dm-text-secondary">
                {m === "next" ? `${formatCurrency(installment)} · due ${formatDate(nextPayment.due_date)}` : "Pay ahead and save interest"}
              </p>
            </button>
          ))}
        </div>
        {mode === "custom" && (
          <FormField label="Amount (UGX)" required error={errors.amount} hint={`Between ${formatCurrency(installment)} and ${formatCurrency(outstandingLoan)}`}>
            <TextInput value={custom} onChange={setCustom} type="number" min={installment} max={outstandingLoan} step={1000} placeholder={String(installment)} />
          </FormField>
        )}
        <FormField label="Pay from" required error={errors.source} hint={source === "sa-002" ? `Available: ${formatCurrency(flexi?.available_balance ?? 0)}` : undefined}>
          <SelectInput value={source} onChange={(v) => setSource(v as "sa-002" | "momo")} options={PAY_SOURCES} />
        </FormField>
        {source === "momo" && (
          <FormField label="Mobile Money number" required error={errors.phone}>
            <TextInput value={phone} onChange={setPhone} type="tel" />
          </FormField>
        )}
        <p className="text-xs dm-text-secondary">Outstanding before this payment: {formatCurrency(outstandingLoan)}. Extra above the installment is applied to the next installment&apos;s principal.</p>
      </div>
    </Modal>
  );
}
