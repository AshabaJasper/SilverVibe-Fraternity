"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { clearAllStorage } from "@/lib/storage";

/**
 * Route-level error boundary. In a localStorage-backed demo the most likely cause
 * of a crash is stale or hand-edited browser data, so we offer a one-click reset.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center dm-bg px-6">
      <div className="glass-card rounded-2xl p-8 max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
        </div>
        <h1 className="text-xl font-bold dm-text">Something went wrong</h1>
        <p className="text-sm dm-text-secondary mt-2">
          This page hit an unexpected error. Try again, or reset the demo data if it keeps happening.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button onClick={reset} className="px-4 py-2.5 rounded-xl bg-[#4A90D9] text-[#fff] text-sm font-semibold hover:bg-[#3a7bc8]">
            Try again
          </button>
          <button
            onClick={() => {
              clearAllStorage();
              window.location.reload();
            }}
            className="px-4 py-2.5 rounded-xl border dm-border dm-text text-sm font-medium hover:dm-surface-hover"
          >
            Reset demo data
          </button>
        </div>
      </div>
    </main>
  );
}
