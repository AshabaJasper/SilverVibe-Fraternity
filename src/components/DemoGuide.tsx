"use client";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Lightbulb, Sparkles } from "lucide-react";
import { loadFromStorage, usePersistedState, showToast } from "@/lib/storage";
import { getDemoSteps } from "@/lib/demo-steps";
import { loadSampleActivity } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

type Variant = "admin" | "member";

/** Open/collapsed state of the demo guide, shared live with any header toggle. */
export function useDemoGuide(variant: Variant) {
  const [open, setOpen] = usePersistedState<boolean>(`demo_guide_${variant}`, true);
  return { open, setOpen };
}

/**
 * Floating "what to try here" card for first-time viewers, bottom-left of the
 * main column. Collapses to a round Tips button; the state is remembered per portal.
 */
export function DemoGuide({ variant }: { variant: Variant }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  // The hook subscribes to changes; read storage directly so the very first
  // client paint already reflects a remembered "collapsed" state (no flash).
  const { setOpen } = useDemoGuide(variant);

  const guide = getDemoSteps(pathname);
  if (!hydrated || !guide) return null;
  const open = loadFromStorage<boolean>(`demo_guide_${variant}`, true);

  // Clear the desktop sidebar (admin w-64, portal w-72) so the card never covers it.
  const left = variant === "member" ? "left-4 lg:left-[19rem]" : "left-4 lg:left-[17rem]";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 z-40 h-12 w-12 sm:w-auto sm:px-4 rounded-full flex items-center justify-center gap-2",
          "bg-[#4A90D9] text-white text-sm font-medium shadow-lg shadow-[#4A90D9]/30 hover:bg-[#3a7bc0] transition-colors",
          left
        )}
        aria-label="Show demo tips"
        title="Show demo tips"
      >
        <Lightbulb className="w-5 h-5" />
        <span className="hidden sm:inline">Tips</span>
      </button>
    );
  }

  const loadSample = () => {
    const { added } = loadSampleActivity();
    showToast(`Sample activity loaded: ${added} new records dated today`);
  };

  return (
    <section
      aria-label="Demo guide"
      className={cn(
        "fixed bottom-4 right-4 sm:right-auto z-40 max-w-sm sm:w-96",
        "glass-card dm-text rounded-2xl shadow-2xl animate-fade-in",
        left
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b dm-border">
        <span className="w-9 h-9 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-[18px] h-[18px] text-[#f59e0b]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold dm-text-secondary">Try this on</p>
          <h2 className="text-sm font-bold dm-text truncate">{guide.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center hover:dm-surface-hover transition-colors shrink-0"
          aria-label="Minimise demo tips"
          title="Minimise"
        >
          <ChevronDown className="w-4 h-4 dm-text-secondary" />
        </button>
      </div>

      <ol className="px-4 py-3 space-y-3 max-h-[45vh] overflow-y-auto">
        {guide.steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-3">
            <span className="w-5 h-5 mt-0.5 rounded-full bg-[#4A90D9]/15 text-[#4A90D9] text-[11px] font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium dm-text leading-snug">{s.label}</p>
              {s.detail && <p className="text-xs dm-text-secondary mt-0.5 leading-snug">{s.detail}</p>}
            </div>
            {s.href && (
              <button
                type="button"
                onClick={() => router.push(s.href!)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#4A90D9] border border-[#4A90D9]/30 hover:bg-[#4A90D9]/10 transition-colors"
                aria-label={`Go: ${s.label}`}
              >
                Go <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t dm-border">
        <button
          type="button"
          onClick={loadSample}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A90D9] hover:underline"
        >
          <Sparkles className="w-3.5 h-3.5" /> Load sample activity
        </button>
        <span className="text-[10px] dm-text-secondary">Changes save in this browser</span>
      </div>
    </section>
  );
}

export default DemoGuide;
