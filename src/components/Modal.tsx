"use client";
import { useEffect, useId, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}

/**
 * Accessible modal dialog. Closes on Escape and overlay click, locks body scroll,
 * and moves focus to the first form field when it opens.
 */
export default function Modal({ open, onClose, title, children, size = "md", footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first input so keyboard users can start typing straight away.
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), select, textarea"
      );
      el?.focus();
    }, 30);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Modals only open after user interaction, so document is always available here.
  if (!open || typeof document === "undefined") return null;

  const widthClass = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

  // Portal to <body> so an ancestor with a transform/filter (e.g. an animated
  // card) can't become the containing block for this fixed overlay.
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${widthClass} dm-surface dm-text rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-in max-h-[92dvh] sm:max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dm-border">
          <h2 id={titleId} className="text-lg font-bold dm-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:dm-surface-hover transition-colors"
          >
            <X className="w-4 h-4 dm-text-secondary" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t dm-border flex flex-wrap items-center justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------
 * Form controls. IMPORTANT: always import these — never declare form
 * components inside a page component, or inputs remount on every
 * keystroke and lose focus.
 * ------------------------------------------------------------------ */

export function FormField({
  label,
  children,
  required,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium dm-text">
        {label}
        {required && <span className="text-[#ef4444] ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[#ef4444]">{error}</p>
      ) : hint ? (
        <p className="text-xs dm-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full px-3 py-2.5 border rounded-xl text-sm dm-input focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors disabled:opacity-60";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">) {
  return (
    <input
      {...rest}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(inputBase, className)}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputBase, className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className={cn(inputBase, "resize-none", className)}
    />
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium dm-text">{label}</p>
        {description && <p className="text-xs dm-text-secondary">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${checked ? "bg-[#4A90D9]" : "bg-[#cbd5e1]"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#fdfdfd] shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Buttons — consistent styling for modal footers and page headers.
 * ------------------------------------------------------------------ */
type BtnVariant = "primary" | "secondary" | "danger" | "accent" | "success";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-[#1A1A1A] text-white hover:bg-[#333] dark:bg-[#4A90D9]",
  accent: "bg-[#4A90D9] text-white hover:bg-[#3a7bc8]",
  success: "bg-[#16a34a] text-white hover:bg-[#15803d]",
  danger: "bg-[#ef4444] text-white hover:bg-[#dc2626]",
  secondary: "border dm-border dm-text hover:dm-surface-hover",
};

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...rest
}: { variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        btnVariants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/** Yes/No confirmation dialog. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm dm-text-secondary">{message}</div>
    </Modal>
  );
}
