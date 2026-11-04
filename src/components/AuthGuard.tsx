"use client";
import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, useAuthHydrated, type UserType } from "@/lib/store";

/**
 * Client-side route guard for the demo. Waits for the persisted session to load,
 * then redirects to the right login page (with ?next=) if the visitor isn't signed
 * in as the required user type.
 *
 * Note: this is UX gating for a static demo, not security. Real protection needs
 * server-side checks (middleware + verified session) once a backend exists.
 */
export default function AuthGuard({ require, children }: { require: UserType; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, userType } = useAuthStore();
  const hydrated = useAuthHydrated();
  const allowed = isAuthenticated && userType === require;

  useEffect(() => {
    if (hydrated && !allowed) {
      const login = require === "admin" ? "/admin/login" : "/portal/login";
      router.replace(`${login}?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, allowed, require, pathname, router]);

  if (!hydrated || !allowed) {
    return (
      <div className="min-h-screen dm-bg flex items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#4A90D9]/30 border-t-[#4A90D9] rounded-full animate-spin" />
          <p className="text-xs dm-text-secondary">{hydrated ? "Redirecting to sign in…" : "Loading…"}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
