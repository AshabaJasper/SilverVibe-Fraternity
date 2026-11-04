"use client";

import { useEffect, useRef, useState } from "react";
import { HandCoins, Landmark, PiggyBank, Users } from "lucide-react";
import { ADMIN_KPI } from "@/lib/mock-data";
import { cn, formatCompact } from "@/lib/utils";
import { container } from "./styles";

const KPIS = [
  {
    label: "Members",
    value: ADMIN_KPI.total_members.value,
    format: (n: number) => Math.round(n).toLocaleString("en-US"),
    icon: Users,
    tint: "text-[#4A90D9] bg-[#4A90D9]/10",
  },
  {
    label: "Total savings",
    value: ADMIN_KPI.total_savings.value,
    format: formatCompact,
    icon: PiggyBank,
    tint: "text-[#22c55e] bg-[#22c55e]/10",
  },
  {
    label: "Loan book",
    value: ADMIN_KPI.total_loan_book.value,
    format: formatCompact,
    icon: HandCoins,
    tint: "text-[#f59e0b] bg-[#f59e0b]/10",
  },
  {
    label: "Share capital",
    value: ADMIN_KPI.total_share_capital.value,
    format: formatCompact,
    icon: Landmark,
    tint: "text-[#C0C0C0] bg-[#C0C0C0]/10",
  },
];

const DURATION_MS = 1000;

/**
 * Animation progress 0..1. Starts at 1 so the server render and the hydration
 * render both show the final figures (no mismatch, no layout jump for no-JS or
 * reduced-motion users). Once the strip scrolls into view, a rAF loop replays
 * the count from 0 with an ease-out curve.
 */
function useCountUp(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const start = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / DURATION_MS);
        setProgress(1 - Math.pow(1 - t, 3)); // easeOutCubic
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);

  return progress;
}

export function KpiStrip() {
  const ref = useRef<HTMLElement>(null);
  const progress = useCountUp(ref);

  return (
    <section ref={ref} aria-label="SACCO at a glance" className="border-y border-[#C0C0C0]/10 bg-[#141414]/70">
      <div className={cn(container, "py-10 sm:py-12")}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-8">
          {KPIS.map(({ label, value, format, icon: Icon, tint }) => (
            <div key={label} className="flex items-center gap-3 sm:gap-4">
              <span className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex", tint)}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wider text-[#8a8a8a]">{label}</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums tracking-tight text-[#f5f5f5] sm:text-2xl lg:text-3xl">
                  {/* Screen readers always get the final figure; the animated one is visual only. */}
                  <span className="sr-only">{format(value)}</span>
                  <span aria-hidden>{format(value * progress)}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
