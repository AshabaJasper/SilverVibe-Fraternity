/**
 * Shared class strings for the landing page. The page is always dark, so colours
 * are explicit hex values (globals.css remaps bg-white / some hex classes when
 * html.dark is set, which would otherwise shift this page's palette).
 */
export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90D9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#4A90D9] px-5 py-3 text-sm font-semibold text-[#f5f5f5] shadow-lg shadow-[#4A90D9]/20 transition-colors hover:bg-[#3a7bc8]";

export const btnSilver =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e8e8e8] to-[#C0C0C0] px-5 py-3 text-sm font-semibold text-[#111111] shadow-lg shadow-black/30 transition-[filter] hover:brightness-110";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#C0C0C0]/20 bg-[#f5f5f5]/[0.03] px-4 py-2.5 text-sm font-medium text-[#e5e5e5] transition-colors hover:border-[#C0C0C0]/40 hover:bg-[#f5f5f5]/[0.07]";

export const card =
  "rounded-2xl border border-[#C0C0C0]/10 bg-gradient-to-b from-[#1c1c1c] to-[#151515] shadow-xl shadow-black/20";

export const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em] text-[#4A90D9]";
export const sectionTitle = "mt-3 text-3xl font-bold tracking-tight text-[#f5f5f5] sm:text-4xl";
export const sectionLead = "mt-4 max-w-2xl text-base leading-relaxed text-[#a3a3a3]";
