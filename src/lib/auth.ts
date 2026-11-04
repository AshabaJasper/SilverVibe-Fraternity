// ============================================================
// Demo credentials — UI-only auth for the showcase build.
// Replace with a real identity provider (e.g. Supabase Auth) before production.
// ============================================================
import { DEMO_ADMIN, DEMO_MEMBER } from "./mock-data";
import type { AuthUser } from "./store";

export const DEMO_CREDENTIALS = {
  admin: { email: "admin@silvervibe.coop", password: "admin123" },
  member: { svNumber: "SV-0042", password: "member123", phone: "+256 770 123 456" },
  otp: "123456",
} as const;

export const ADMIN_USER: AuthUser = {
  name: DEMO_ADMIN.full_name,
  email: DEMO_ADMIN.email,
  role: DEMO_ADMIN.role,
};

export const MEMBER_USER: AuthUser = {
  name: DEMO_MEMBER.full_name,
  email: DEMO_MEMBER.email,
  sv: DEMO_MEMBER.sv_number,
  role: "Member",
};

/** Returns an error message, or null if the credentials are valid. */
export function checkAdminCredentials(email: string, password: string): string | null {
  if (!email.trim() || !password) return "Enter your email and password.";
  if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.admin.email || password !== DEMO_CREDENTIALS.admin.password) {
    return "Invalid email or password. Use the demo credentials below.";
  }
  return null;
}

export function checkMemberCredentials(svNumber: string, password: string): string | null {
  if (!svNumber.trim() || !password) return "Enter your SV number and password.";
  if (svNumber.trim().toUpperCase() !== DEMO_CREDENTIALS.member.svNumber || password !== DEMO_CREDENTIALS.member.password) {
    return "Invalid SV number or password. Use the demo credentials below.";
  }
  return null;
}

export function normalisePhone(p: string) {
  return p.replace(/\D/g, "").replace(/^0/, "256");
}

export function checkMemberPhone(phone: string): string | null {
  const digits = normalisePhone(phone);
  if (digits.length < 12) return "Enter a valid phone number, e.g. +256 770 123 456.";
  if (digits !== normalisePhone(DEMO_CREDENTIALS.member.phone)) {
    return "No member is registered with that number. Try +256 770 123 456.";
  }
  return null;
}

export function checkOtp(code: string): string | null {
  return code.trim() === DEMO_CREDENTIALS.otp ? null : "Incorrect code. The demo OTP is 123456.";
}

/**
 * Only allow same-site relative redirects after login (prevents open redirects).
 * Rejects "//host", "/\\host" (browsers treat a backslash like a slash), control
 * characters, and anything that resolves to another origin.
 */
export function safeNext(next: string | null, fallback: string): string {
  if (!next || !/^\/(?![/\\])/.test(next) || /[\\\x00-\x1f]/.test(next)) return fallback;
  try {
    const base = "https://silvervibe.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
