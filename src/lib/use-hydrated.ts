"use client";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
/**
 * `true` only after hydration on the client. Use it to gate anything that differs
 * between server and browser (time-of-day greeting, Date.now(), localStorage).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
