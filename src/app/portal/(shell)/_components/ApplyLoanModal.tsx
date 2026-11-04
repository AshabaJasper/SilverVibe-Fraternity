"use client";
import { useState } from "react";
import Modal, { Button, FormField, SelectInput, TextAreaInput, TextInput } from "@/components/Modal";
import { showToast } from "@/lib/storage";
import { ADMIN_MEMBERS_LIST } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { LOAN_PRODUCTS, monthlyInstallment, usePortalData } from "../_lib/usePortalData";
import { parseAmount } from "../_lib/forms";

export interface LoanPrefill {
  product?: string;
  amount?: number;
  term?: number;
}

const TERMS = [3, 6, 12, 18, 24, 36];
const MIN_LOAN = 100_000;

// Guarantors must be other active members (never the applicant, SV-0042).
const GUARANTORS = ADMIN_MEMBERS_LIST.filter((m) => m.sv_number !== "SV-0042" && m.status === "active");

/** Loan application form, shared by the dashboard and the Loans page. */
export default function ApplyLoanModal({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: LoanPrefill }) {
  if (!open) return null;
  return <ApplyLoanDialog onClose={onClose} prefill={prefill} />;
}

function ApplyLoanDialog({ onClose, prefill }: { onClose: () => void; prefill?: LoanPrefill }) {
  const { eligibility, totalSavings, sharesValue, applyForLoan } = usePortalData();
  const initialProduct = LOAN_PRODUCTS.find((p) => p.value === prefill?.product) ?? LOAN_PRODUCTS[0];
  const [product, setProduct] = useState<string>(initialProduct.value);
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : "");
  const [term, setTerm] = useState(String(Math.min(prefill?.term ?? 12, initialProduct.maxTerm)));
  const [purpose, setPurpose] = useState("");
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const prod = LOAN_PRODUCTS.find((p) => p.value === product) ?? LOAN_PRODUCTS[0];
  const termNum = Number(term);
  // Standard terms, plus a custom one carried over from the calculator.
  const termOptions = [...new Set([...TERMS, termNum])].filter((t) => t > 0 && t <= prod.maxTerm).sort((a, b) => a - b);
  const amt = parseAmount(amount);
  const installment = Number.isFinite(amt) && amt > 0 ? monthlyInstallment(amt, prod.rate, termNum) : 0;

  const changeProduct = (v: string) => {
    setProduct(v);
    const p = LOAN_PRODUCTS.find((x) => x.value === v);
    if (p && termNum > p.maxTerm) setTerm(String(p.maxTerm));
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!Number.isFinite(amt) || amt < MIN_LOAN) e.amount = `Enter at least ${formatCurrency(MIN_LOAN)}`;
    else if (amt > eligibility) e.amount = `Maximum you can borrow is ${formatCurrency(eligibility)}`;
    if (!(termNum > 0)) e.term = "Choose a term";
    if (purpose.trim().length < 10) e.purpose = "Describe the purpose in at least 10 characters";
    if (!g1) e.g1 = "Choose at least one guarantor";
    if (g2 && g2 === g1) e.g2 = "Pick two different guarantors";
    setErrors(e);
    if (Object.keys(e).length) return;

    const names = [g1, g2].filter(Boolean).map((sv) => GUARANTORS.find((m) => m.sv_number === sv)?.name ?? sv);
    applyForLoan({ product, amount: Math.round(amt), term: termNum, purpose: purpose.trim(), guarantors: names });
    showToast(`${product} application for ${formatCurrency(amt)} submitted for review`);
    onClose();
  };

  const guarantorOptions = GUARANTORS.map((m) => ({ value: m.sv_number, label: `${m.name} (${m.sv_number})` }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Apply for a Loan"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={submit}>Submit application</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl p-3 bg-[#4A90D9]/10 text-sm dm-text">
          You can borrow up to <strong>{formatCurrency(eligibility)}</strong>
          <span className="dm-text-secondary"> — 3× your savings ({formatCurrency(totalSavings)}) + share capital ({formatCurrency(sharesValue)}).</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Loan product" required>
            <SelectInput value={product} onChange={changeProduct} options={LOAN_PRODUCTS.map((p) => ({ value: p.value, label: p.label }))} />
          </FormField>
          <FormField label="Repayment term" required error={errors.term} hint={`Up to ${prod.maxTerm} months for this product`}>
            <SelectInput value={term} onChange={setTerm} options={termOptions.map((t) => ({ value: String(t), label: `${t} months` }))} />
          </FormField>
        </div>
        <FormField label="Amount (UGX)" required error={errors.amount} hint={`Between ${formatCurrency(MIN_LOAN)} and ${formatCurrency(eligibility)}`}>
          <TextInput value={amount} onChange={setAmount} type="number" min={MIN_LOAN} max={eligibility} step={50000} placeholder="e.g. 5000000" />
        </FormField>
        <FormField label="Purpose" required error={errors.purpose}>
          <TextAreaInput value={purpose} onChange={setPurpose} rows={3} maxLength={300} placeholder="e.g. School fees for Term 1, stock for my hardware shop…" />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Guarantor 1" required error={errors.g1}>
            <SelectInput value={g1} onChange={(v) => { setG1(v); if (v === g2) setG2(""); }} options={[{ value: "", label: "Select a member…" }, ...guarantorOptions]} />
          </FormField>
          <FormField label="Guarantor 2 (optional)" error={errors.g2}>
            <SelectInput value={g2} onChange={setG2} options={[{ value: "", label: "None" }, ...guarantorOptions.filter((o) => o.value !== g1)]} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3 rounded-xl dm-surface-hover p-4 text-center">
          <div>
            <p className="text-xs dm-text-secondary">Monthly installment</p>
            <p className="text-base font-bold text-[#4A90D9]">{installment ? formatCurrency(installment) : "—"}</p>
          </div>
          <div>
            <p className="text-xs dm-text-secondary">Total interest</p>
            <p className="text-base font-semibold dm-text">{installment ? formatCurrency(installment * termNum - amt) : "—"}</p>
          </div>
          <div>
            <p className="text-xs dm-text-secondary">Rate</p>
            <p className="text-base font-semibold dm-text">{prod.rate}% p.a.</p>
          </div>
        </div>
        <p className="text-xs dm-text-secondary">Estimate on a reducing-balance basis. Your guarantors will be notified, and the credit committee reviews applications within 3 working days.</p>
      </div>
    </Modal>
  );
}
