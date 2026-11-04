// ============================================================
// localStorage-backed store for demo persistence
// ============================================================
"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Bump DATA_VERSION whenever mock-data shape or seed values change.
 * Keys are namespaced with it, so visitors who used an older build of the demo
 * never see stale records from their browser storage.
 */
export const DATA_VERSION = 3;
const PREFIX = `silvervibe_v${DATA_VERSION}_`;

/** Fired on window when any persisted key changes, so every hook using it re-syncs. */
const CHANGE_EVENT = "silvervibe:storage";

function getKey(key: string) {
  return `${PREFIX}${key}`;
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(getKey(key));
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore corrupt / unavailable storage
  }
  return fallback;
}

export function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(key), JSON.stringify(data));
  } catch {
    // ignore quota / private mode errors
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(key));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

/** Wipe all demo data (every version) — used by "Reset demo data". */
export function clearAllStorage(): void {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("silvervibe_") && k !== "silvervibe_theme")
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ============================================================
// Hook: usePersistedState  —  useState backed by localStorage
// ============================================================
/**
 * Like useState, but the value is saved to localStorage and shared live between
 * every component that uses the same key (e.g. header badge + notifications page).
 *
 * The first render always uses `fallback` (matches the server render, so no
 * hydration mismatch); the stored value is swapped in right after mount.
 */
export function usePersistedState<T>(key: string, fallback: T) {
  const [state, _setState] = useState<T>(fallback);

  useEffect(() => {
    // Hydrate from localStorage after mount (intentional external-state sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    _setState(loadFromStorage<T>(key, fallback));

    const onChange = (e: Event) => {
      const changed = (e as CustomEvent<string>).detail;
      if (changed === key) _setState(loadFromStorage<T>(key, fallback));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === getKey(key)) _setState(loadFromStorage<T>(key, fallback));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
    // fallback is intentionally excluded: callers pass inline literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      // Read the latest saved value so concurrent writers on the page don't clobber each other.
      const prev = loadFromStorage<T>(key, state);
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      _setState(next);
      saveToStorage(key, next);
    },
    [key, state]
  );

  return [state, setState] as const;
}

// ============================================================
// Toast notification helper
// ============================================================
const TOAST_COLORS = { success: "#16a34a", error: "#dc2626", info: "#4A90D9" } as const;
const TOAST_ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

function getToastContainer(): HTMLElement {
  let el = document.getElementById("sv-toasts");
  if (!el) {
    el = document.createElement("div");
    el.id = "sv-toasts";
    el.setAttribute("aria-live", "polite");
    el.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;max-width:calc(100vw - 32px)";
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  if (typeof window === "undefined") return;

  const toast = document.createElement("div");
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.style.cssText = `background:${TOAST_COLORS[type]};color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 10px 25px rgba(0,0,0,.2);display:flex;align-items:center;gap:8px;transform:translateY(8px);opacity:0;transition:all .3s ease;pointer-events:auto`;

  // Icon markup is static; the message goes in via textContent (never innerHTML).
  const icon = document.createElement("span");
  icon.style.display = "flex";
  icon.innerHTML = TOAST_ICONS[type];
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(icon, text);

  getToastContainer().appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });
  setTimeout(() => {
    toast.style.transform = "translateY(8px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
