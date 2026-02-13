// ============================================================
// localStorage-backed store for demo persistence
// ============================================================
"use client";

const PREFIX = "silvervibe_";

function getKey(key: string) {
  return `${PREFIX}${key}`;
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(getKey(key));
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

export function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(key), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(key));
  } catch {
    // ignore
  }
}

export function clearAllStorage(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}

// ============================================================
// Hook: usePersistedState  —  useState backed by localStorage
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";

export function usePersistedState<T>(key: string, fallback: T) {
  const initialized = useRef(false);
  const [state, _setState] = useState<T>(fallback);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = loadFromStorage<T>(key, fallback);
    _setState(stored);
    initialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      _setState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        saveToStorage(key, next);
        return next;
      });
    },
    [key]
  );

  return [state, setState, initialized.current] as const;
}

// ============================================================
// Toast notification helper
// ============================================================
export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  if (typeof window === "undefined") return;

  const toast = document.createElement("div");
  toast.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2`;
  toast.style.backgroundColor = type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#4A90D9";

  const iconSvg =
    type === "success"
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : type === "error"
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

  toast.innerHTML = `${iconSvg} ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.transform = "translateY(8px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
