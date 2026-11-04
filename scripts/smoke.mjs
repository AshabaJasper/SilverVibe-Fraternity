#!/usr/bin/env node
// ============================================================
// Smoke test: signs in through the real login forms, then visits every
// route in light and dark mode and fails on console errors, uncaught
// exceptions, hydration warnings, 404s, or placeholder text.
//
// Usage:  BASE_URL=http://localhost:3000 node scripts/smoke.mjs [--shots DIR] [--only /admin/loans]
// ============================================================
import { createRequire } from "node:module";
// Playwright is pre-installed globally in CI/dev containers; require() resolves it, ESM import may not.
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const args = process.argv.slice(2);
const shotsDir = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const ADMIN = ["/admin", "/admin/members", "/admin/savings", "/admin/loans", "/admin/shares", "/admin/accounting",
  "/admin/communications", "/admin/reports", "/admin/settings", "/admin/checklist"];
const PORTAL = ["/portal", "/portal/savings", "/portal/loans", "/portal/shares", "/portal/profile",
  "/portal/notifications", "/portal/support"];
const PUBLIC = ["/", "/admin/login", "/portal/login"];

const BANNED = [/coming soon/i, /lorem ipsum/i, /\bTODO\b/, /\bundefined\b/, /\bNaN\b/, /\[object Object\]/];
const IGNORE_CONSOLE = [/Download the React DevTools/, /width\(-?\d+\) and height\(-?\d+\) of chart/i, /\[Fast Refresh\]/, /\[HMR\]/];

const failures = [];
const fail = (where, msg) => { failures.push(`${where}: ${msg}`); console.log(`  ✗ ${where}: ${msg}`); };

async function visit(page, route, theme) {
  const where = `${route} [${theme}]`;
  const errors = [];
  const onConsole = (m) => {
    if (m.type() === "error" || (m.type() === "warning" && /hydrat/i.test(m.text()))) {
      if (!IGNORE_CONSOLE.some((r) => r.test(m.text()))) errors.push(m.text().slice(0, 300));
    }
  };
  const onPageError = (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  const res = await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  if (!res || res.status() >= 400) fail(where, `HTTP ${res?.status()}`);
  const url = new URL(page.url());
  if (url.pathname !== route) fail(where, `redirected to ${url.pathname}`);
  const text = await page.locator("main, body").first().innerText();
  for (const re of BANNED) if (re.test(text)) fail(where, `contains ${re}`);
  for (const e of errors) fail(where, e);
  if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${theme}${route.replace(/\//g, "_") || "_root"}.png`), fullPage: true });
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  if (!errors.length) console.log(`  ✓ ${where}`);
}

async function setTheme(page, theme) {
  await page.evaluate((t) => localStorage.setItem("silvervibe_theme", t), theme);
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  console.log("Auth gating");
  await page.goto(BASE + "/admin/members", { waitUntil: "networkidle" });
  await page.waitForURL(/\/admin\/login/, { timeout: 8000 }).catch(() => fail("/admin/members", "not redirected to login when signed out"));
  await page.fill("#admin-email", "wrong@example.com");
  await page.fill("#admin-password", "nope");
  await page.click("button[type=submit]");
  if (!(await page.getByRole("alert").first().isVisible().catch(() => false))) fail("/admin/login", "no error for bad credentials");
  await page.fill("#admin-email", "admin@silvervibe.coop");
  await page.fill("#admin-password", "admin123");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin\/members/, { timeout: 8000 }).catch(() => fail("/admin/login", "did not return to ?next after sign in"));

  await page.goto(BASE + "/portal", { waitUntil: "networkidle" });
  await page.waitForURL(/\/portal\/login/, { timeout: 8000 }).catch(() => fail("/portal", "not redirected to login"));
  await page.fill("#sv", "SV-0042");
  await page.fill("#pw", "member123");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/portal", { timeout: 8000 }).catch(() => fail("/portal/login", "sign in failed"));
  // Member login replaces the admin session (one session at a time), so re-login admin per pass below.

  console.log("Landing and 404");
  {
    const res = await page.goto(BASE + "/", { waitUntil: "networkidle" });
    if (res?.status() !== 200) fail("/", `HTTP ${res?.status()}`);
    for (const t of ["Savings. Loans. Shares.", "Demo access", "admin@silvervibe.coop", "SV-0042"]) {
      if (!(await page.getByText(t, { exact: false }).first().isVisible().catch(() => false))) fail("/", `missing "${t}"`);
    }
    const nf = await page.goto(BASE + "/this-page-does-not-exist", { waitUntil: "networkidle" });
    if (nf?.status() !== 404) fail("/404", `expected 404, got ${nf?.status()}`);
    if (!(await page.getByText("Page not found").isVisible().catch(() => false))) fail("/404", "branded 404 not shown");
  }

  const routes = only ? [only] : [...ADMIN, ...PORTAL];
  for (const theme of ["light", "dark"]) {
    await setTheme(page, theme);
    console.log(`\nTheme: ${theme}`);
    for (const r of routes) {
      const needs = r.startsWith("/admin") ? "admin" : "member";
      const session = needs === "admin"
        ? { isAuthenticated: true, userType: "admin", user: { name: "Sarah Nakamya", email: "admin@silvervibe.coop", role: "Super Admin" } }
        : { isAuthenticated: true, userType: "member", user: { name: "James Mukasa", email: "james.mukasa@silvervibe.coop", role: "Member", sv: "SV-0042" } };
      await page.evaluate((s) => localStorage.setItem("silvervibe_auth", JSON.stringify({ state: s, version: 0 })), session);
      await visit(page, r, theme);
    }
    if (!only) {
      await page.evaluate(() => localStorage.removeItem("silvervibe_auth"));
      for (const r of PUBLIC) await visit(page, r, theme);
    }
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : "\nAll smoke checks passed");
process.exit(failures.length ? 1 : 0);
