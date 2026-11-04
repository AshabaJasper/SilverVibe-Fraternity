"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Opens something when the URL carries `?action=<name>` (e.g. /portal?action=deposit
 * from the command palette), then strips the param so a refresh doesn't reopen it.
 * Must be rendered inside <Suspense> because it reads search params.
 */
export default function ActionParam({ actions }: { actions: Record<string, () => void> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const action = params.get("action");

  useEffect(() => {
    if (!action) return;
    const fn = actions[action];
    if (!fn) return;
    fn();
    router.replace(pathname, { scroll: false });
    // `actions` is an inline object; only react to the URL changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, pathname, router]);

  return null;
}
