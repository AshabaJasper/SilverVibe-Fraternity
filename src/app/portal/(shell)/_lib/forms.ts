// Small validation helpers shared by the portal money modals.

/** Parse a user-typed amount ("1,500,000" or "1500000.5"). NaN when empty/invalid. */
export function parseAmount(v: string): number {
  const s = v.replace(/[,\s]/g, "");
  if (!s) return NaN;
  return Number(s);
}

/** Ugandan mobile number: +256 7XX XXX XXX or 07XX XXX XXX. */
export function isValidPhone(v: string): boolean {
  const s = v.replace(/[\s-]/g, "");
  return /^(\+?256|0)7\d{8}$/.test(s);
}

export const DEFAULT_PHONE = "+256 770 123 456";

export const PAY_SOURCES = [
  { value: "sa-002", label: "Flexi/Wallet balance" },
  { value: "momo", label: "Mobile Money" },
];
