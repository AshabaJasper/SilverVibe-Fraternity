"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import Modal, { Button } from "@/components/Modal";
import { useDemoGuide } from "@/components/DemoGuide";
import { loadFromStorage, saveToStorage, showToast } from "@/lib/storage";
import { loadSampleActivity } from "@/lib/demo";

type Variant = "admin" | "member";

const CONTENT: Record<Variant, { title: string; intro: string; actions: { label: string; href: string }[] }> = {
  admin: {
    title: "Welcome to the SilverVibe admin demo",
    intro: "You're signed in as a SACCO administrator. Every screen here works end to end.",
    actions: [
      { label: "Register a new member", href: "/admin/members?action=register" },
      { label: "Review pending loan applications", href: "/admin/loans?tab=applications" },
      { label: "Post a large withdrawal (maker-checker)", href: "/admin/savings?tab=transactions" },
    ],
  },
  member: {
    title: "Welcome to your member portal demo",
    intro: "You're signed in as James Mukasa, a SilverVibe member. Everything here works end to end.",
    actions: [
      { label: "Make a quick deposit", href: "/portal?action=deposit" },
      { label: "Apply for a loan", href: "/portal/loans?action=apply" },
      { label: "Download your savings statement", href: "/portal/savings?action=statement" },
    ],
  },
};

const BULLETS = [
  "It's a working demo: forms validate, balances move and reports download.",
  "Your changes are saved in this browser only, so feel free to experiment.",
  "Use Reset demo data (account menu, top right) anytime to start fresh.",
];

/** One-time welcome for first-time viewers, per browser and per portal. */
export function WelcomeModal({ variant }: { variant: Variant }) {
  const key = `demo_welcome_${variant}`;
  const [open, setOpen] = useState(false);
  const { setOpen: setGuideOpen } = useDemoGuide(variant);

  // Client-only: check the flag after mount, and open after a short beat so the page paints first.
  useEffect(() => {
    if (loadFromStorage<boolean>(key, false)) return;
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [key]);

  const close = () => {
    saveToStorage(key, true);
    setOpen(false);
  };

  const loadSample = () => {
    const { added } = loadSampleActivity();
    showToast(`Sample activity loaded: ${added} new records dated today`);
    close();
  };

  const showAround = () => {
    close();
    setGuideOpen(true);
  };

  const c = CONTENT[variant];

  return (
    <Modal
      open={open}
      onClose={close}
      title={c.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={close}>Skip</Button>
          <Button variant="secondary" onClick={loadSample}>
            <Sparkles className="w-4 h-4" /> Load sample activity
          </Button>
          <Button onClick={showAround}>
            <Compass className="w-4 h-4" /> Show me around
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm dm-text-secondary">{c.intro}</p>
        <ul className="space-y-2">
          {BULLETS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm dm-text">
              <CheckCircle2 className="w-4 h-4 text-[#22c55e] mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold dm-text-secondary mb-2">Suggested first steps</p>
          <div className="space-y-2">
            {c.actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={close}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border dm-border hover:dm-surface-hover transition-colors text-sm font-medium dm-text"
              >
                {a.label}
                <ArrowRight className="w-4 h-4 text-[#4A90D9] shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default WelcomeModal;
