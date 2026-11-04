"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/storage";
import { focusRing } from "./styles";

/** Copies `value` to the clipboard and briefly swaps the icon to a tick. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Copied");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked (insecure context, permissions).
      showToast("Could not copy. Select the text instead.", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C0C0C0]/15 text-[#a3a3a3] transition-colors hover:border-[#4A90D9]/50 hover:text-[#f5f5f5]",
        focusRing,
      )}
    >
      {copied ? <Check className="h-4 w-4 text-[#22c55e]" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
    </button>
  );
}
