"use client";
import { useState } from "react";
import Modal, { Button, FormField, SelectInput, TextInput } from "@/components/Modal";
import { showToast } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import { usePortalData } from "../_lib/usePortalData";
import { DEFAULT_PHONE, PAY_SOURCES, isValidPhone } from "../_lib/forms";

type Source = "sa-002" | "momo";

/** Shared fields for "how many" + "pay from" purchases. */
function PurchaseFields({
  count, setCount, countLabel, countError, price, source, setSource, phone, setPhone, sourceError, phoneError, flexiAvailable,
}: {
  count: string; setCount: (v: string) => void; countLabel: string; countError?: string; price: number;
  source: Source; setSource: (v: Source) => void; phone: string; setPhone: (v: string) => void;
  sourceError?: string; phoneError?: string; flexiAvailable: number;
}) {
  const n = Number(count);
  const cost = Number.isInteger(n) && n > 0 ? n * price : 0;
  return (
    <div className="space-y-4">
      <FormField label={countLabel} required error={countError} hint={`${formatCurrency(price)} each`}>
        <TextInput value={count} onChange={setCount} type="number" min={1} step={1} />
      </FormField>
      <FormField label="Pay from" required error={sourceError} hint={source === "sa-002" ? `Available: ${formatCurrency(flexiAvailable)}` : undefined}>
        <SelectInput value={source} onChange={(v) => setSource(v as Source)} options={PAY_SOURCES} />
      </FormField>
      {source === "momo" && (
        <FormField label="Mobile Money number" required error={phoneError}>
          <TextInput value={phone} onChange={setPhone} type="tel" />
        </FormField>
      )}
      <div className="rounded-xl dm-surface-hover p-4 flex items-center justify-between">
        <span className="text-sm dm-text-secondary">Total cost</span>
        <span className="text-lg font-bold dm-text">{formatCurrency(cost)}</span>
      </div>
    </div>
  );
}

function validatePurchase(count: string, price: number, source: Source, phone: string, flexiAvailable: number) {
  const n = Number(count);
  const e: Record<string, string> = {};
  if (!Number.isInteger(n) || n < 1) e.count = "Enter a whole number of at least 1";
  else if (n > 1000) e.count = "Maximum 1,000 per purchase";
  else if (source === "sa-002" && n * price > flexiAvailable) e.source = `Needs ${formatCurrency(n * price)} — Flexi/Wallet has ${formatCurrency(flexiAvailable)}`;
  if (source === "momo" && !isValidPhone(phone)) e.phone = "Enter a valid number, e.g. +256 770 123 456";
  return { n, e };
}

// ============================================================ Buy shares

export function BuySharesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <BuySharesDialog onClose={onClose} />;
}

function BuySharesDialog({ onClose }: { onClose: () => void }) {
  const { shares, accounts, buyShares } = usePortalData();
  const flexiAvailable = accounts.find((a) => a.id === "sa-002")?.available_balance ?? 0;
  const [count, setCount] = useState("5");
  const [source, setSource] = useState<Source>("sa-002");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const { n, e } = validatePurchase(count, shares.share_value, source, phone, flexiAvailable);
    setErrors(e);
    if (Object.keys(e).length) return;
    const cost = buyShares(n, source);
    showToast(`${n} share${n === 1 ? "" : "s"} bought for ${formatCurrency(cost)} — certificate issued`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Buy Shares"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={submit}>Buy shares</Button>
        </>
      }
    >
      <p className="text-sm dm-text-secondary mb-4">
        You hold {shares.num_shares} shares. Share capital earns an annual dividend declared at the AGM and counts towards your loan limit.
      </p>
      <PurchaseFields
        count={count} setCount={setCount} countLabel="Number of shares" countError={errors.count} price={shares.share_value}
        source={source} setSource={setSource} phone={phone} setPhone={setPhone}
        sourceError={errors.source} phoneError={errors.phone} flexiAvailable={flexiAvailable}
      />
    </Modal>
  );
}

// ============================================================ Investment units

export function UnitsModal({ mode, onClose }: { mode: "buy" | "redeem" | null; onClose: () => void }) {
  if (!mode) return null;
  return mode === "buy" ? <BuyUnitsDialog onClose={onClose} /> : <RedeemUnitsDialog onClose={onClose} />;
}

function BuyUnitsDialog({ onClose }: { onClose: () => void }) {
  const { unitPrice, accounts, buyUnits, shares } = usePortalData();
  const flexiAvailable = accounts.find((a) => a.id === "sa-002")?.available_balance ?? 0;
  const [count, setCount] = useState("1");
  const [source, setSource] = useState<Source>("sa-002");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const { n, e } = validatePurchase(count, unitPrice, source, phone, flexiAvailable);
    setErrors(e);
    if (Object.keys(e).length) return;
    const cost = buyUnits(n, source);
    showToast(`${n} investment unit${n === 1 ? "" : "s"} bought for ${formatCurrency(cost)}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Buy Investment Units"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={submit}>Buy units</Button>
        </>
      }
    >
      <p className="text-sm dm-text-secondary mb-4">You hold {shares.iu.unit_balance} units. Units are priced at your average cost of {formatCurrency(unitPrice)}.</p>
      <PurchaseFields
        count={count} setCount={setCount} countLabel="Number of units" countError={errors.count} price={unitPrice}
        source={source} setSource={setSource} phone={phone} setPhone={setPhone}
        sourceError={errors.source} phoneError={errors.phone} flexiAvailable={flexiAvailable}
      />
    </Modal>
  );
}

function RedeemUnitsDialog({ onClose }: { onClose: () => void }) {
  const { shares, unitPrice, redeemUnits } = usePortalData();
  const iu = shares.iu;
  const [count, setCount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const n = Number(count);
  const valid = Number.isInteger(n) && n >= 1 && n <= iu.unit_balance;
  const estimate = valid && iu.unit_balance > 0 ? n * unitPrice + Math.round((iu.accrued_returns * n) / iu.unit_balance) : 0;

  const submit = () => {
    if (iu.unit_balance < 1) return setError("You have no units to redeem");
    if (!valid) return setError(`Enter a whole number between 1 and ${iu.unit_balance}`);
    const proceeds = redeemUnits(n);
    showToast(`${formatCurrency(proceeds)} credited to your Flexi/Wallet`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Redeem Investment Units"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={iu.unit_balance < 1}>Redeem</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm dm-text-secondary">
          You hold {iu.unit_balance} units worth {formatCurrency(iu.current_value)}. Redeemed units pay their cost plus their share of accrued returns into your Flexi/Wallet.
        </p>
        <FormField label="Units to redeem" required error={error}>
          <TextInput value={count} onChange={(v) => { setCount(v); setError(null); }} type="number" min={1} max={iu.unit_balance} step={1} />
        </FormField>
        <div className="rounded-xl dm-surface-hover p-4 flex items-center justify-between">
          <span className="text-sm dm-text-secondary">You will receive</span>
          <span className="text-lg font-bold text-[#16a34a]">{formatCurrency(estimate)}</span>
        </div>
      </div>
    </Modal>
  );
}
