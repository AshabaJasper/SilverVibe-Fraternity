"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { btnGhost, btnPrimary, container, focusRing } from "./styles";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#member-experience", label: "Member experience" },
  { href: "#demo-access", label: "Demo access" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  // Close the mobile menu with Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#C0C0C0]/10 bg-[#0f0f0f]/80 backdrop-blur-xl">
      <div className={cn(container, "flex h-16 items-center justify-between gap-4")}>
        <Brand priority />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-[#a3a3a3] transition-colors hover:text-[#f5f5f5]",
                focusRing,
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/portal/login" className={cn(btnGhost, "py-2", focusRing)}>
            Member sign in
          </Link>
          <Link href="/admin/login" className={cn(btnPrimary, "px-4 py-2", focusRing)}>
            Admin sign in
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#C0C0C0]/15 text-[#e5e5e5] transition-colors hover:bg-[#f5f5f5]/[0.06] md:hidden",
            focusRing,
          )}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-[#C0C0C0]/10 bg-[#0f0f0f]/95 md:hidden">
          <nav aria-label="Mobile" className={cn(container, "flex flex-col gap-1 py-4")}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium text-[#d4d4d4] transition-colors hover:bg-[#f5f5f5]/[0.05] hover:text-[#f5f5f5]",
                  focusRing,
                )}
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/portal/login" className={cn(btnGhost, focusRing)}>
                Member sign in
              </Link>
              <Link href="/admin/login" className={cn(btnPrimary, "px-4 py-2.5", focusRing)}>
                Admin sign in
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
