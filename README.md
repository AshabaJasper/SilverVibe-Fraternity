# SilverVibe Fraternity SACCO Management System

> A comprehensive, interactive demo of a SACCO (Savings and Credit Cooperative) management platform built with Next.js 16, TypeScript, and Tailwind CSS 4.

---

## Live demo

**https://silvervibe-sacco-app.vercel.app**

| Portal | Sign-in | Credentials |
| ------ | ------- | ----------- |
| Admin dashboard | `/admin/login` | `admin@silvervibe.coop` / `admin123` |
| Member portal (password) | `/portal/login` | `SV-0042` / `member123` |
| Member portal (phone OTP) | `/portal/login` → *Phone OTP* | `+256 770 123 456`, code `123456` |

Each login page has a "Click to fill in" demo box. Your changes are saved in your browser (localStorage).
Use **account menu → Reset demo data** to restore the original data.

### 3-minute demo script
1. **Admin → Members**: register a member, edit them, export the list to CSV.
2. **Admin → Loans**: create a new application, review and approve it, disburse it, then view and download its repayment schedule.
3. **Admin → Accounting**: post a journal entry, then watch the trial balance update. Download the income statement PDF.
4. **Admin → Reports**: generate any report as a PDF.
5. **Member portal → Dashboard**: make a quick deposit and watch the balances update. Apply for a loan; it appears in Admin → Loans.
6. **Member portal → Shares**: download a share certificate PDF.
7. Toggle **dark mode** (moon icon) and press **Ctrl + K** to search.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run smoke` | Playwright smoke test against `BASE_URL` (default `http://localhost:3000`) |

---

## Tech Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Framework      | Next.js 16 (App Router, TypeScript)             |
| Styling        | Tailwind CSS 4 (`@theme`, `@layer`, `@utility`) |
| Icons          | Lucide React                                    |
| Charts         | Recharts (Line, Area, Bar, Pie)                 |
| State          | Zustand (persisted demo auth), `usePersistedState` hook |
| Documents      | jsPDF + autotable (lazy-loaded) for statements, reports, certificates |
| Persistence    | localStorage (demo edits survive refresh)       |
| Fonts          | Inter (UI), Plus Jakarta Sans (headings)        |

---

## Project Structure

```
src/
  app/
    page.tsx                    # Landing page (choose portal)
    layout.tsx                  # Root layout: fonts, theme, metadata
    globals.css                 # Tailwind v4 theme, dm-* tokens, dark-mode remap
    admin/
      login/page.tsx            # Admin sign-in (outside the shell)
      (shell)/layout.tsx        # Auth guard + sidebar/header shell
      (shell)/page.tsx          # Dashboard
      (shell)/{members,savings,loans,shares,accounting,
               communications,reports,settings,checklist}/page.tsx
    portal/
      login/page.tsx            # Member sign-in: password or phone OTP
      (shell)/layout.tsx        # Auth guard + member shell
      (shell)/page.tsx          # Member dashboard
      (shell)/{savings,loans,shares,profile,notifications,support}/page.tsx
  components/
    AppShell.tsx                # Shared sidebar, header, search, notifications, user menu
    AuthGuard.tsx               # Redirects to the right login page (?next=)
    Modal.tsx                   # Modal, form controls, Button, ConfirmDialog
    ui.tsx                      # EmptyState, Badge, StatCard, Tabs, PageHeader
    ThemeProvider.tsx           # Light/dark theme
  lib/
    mock-data.ts                # Seed data (computed loan schedule)
    storage.ts                  # usePersistedState (versioned, cross-component sync), showToast
    store.ts / auth.ts          # Persisted demo session and credentials
    pdf-reports.ts              # PDF statements, reports, certificates
    export.ts                   # CSV export and print
    keys.ts                     # Shared persisted-state keys
    utils.ts                    # Formatting, dates, useHydrated
scripts/smoke.mjs               # Playwright smoke test
```

`(shell)` is a Next.js route group. It wraps pages in the sidebar layout without changing their URLs, so the login pages stay outside the shell.

---

## Key Features

### Admin Dashboard (10 pages)
- **Dashboard** — KPIs, savings growth chart, loan performance, portfolio quality, activity feed
- **Members** — Register, edit, view profile, delete, KYC verification, status management
- **Savings** — Product configuration, transaction recording, posting approval
- **Loans** — Application review with credit scoring, approve/decline with reasons
- **Shares** — Issue shares, configure share value/dividend rate, edit shareholders
- **Accounting** — Journal entries (create, post), trial balance, financial statements
- **Communications** — Announcements CRUD, compose messages (SMS/Email/Push), templates
- **Reports** — Report catalog by category
- **Settings** — Organization, security, integrations, notifications, backup, user management
- **Feature Checklist** — Complete feature inventory with progress bar and filters

### Member Portal (8 pages)
- Dashboard, Savings, Loans, Shares, Profile, Notifications, Support, Login

### Interactive Features
- All admin pages have **functional modals** for create/edit/delete operations
- Changes persist in **localStorage** — edits survive page refreshes
- **Toast notifications** for all actions
- Responsive design (mobile/tablet/desktop)
- Animated transitions, hover states, focus rings

---

## Design System

| Token             | Value     | Usage                   |
| ----------------- | --------- | ----------------------- |
| Primary           | `#1A1A1A` | Headers, buttons, text  |
| Secondary         | `#C0C0C0` | Subtle text, borders    |
| Accent            | `#4A90D9` | Links, highlights       |
| Background        | `#F8F9FA` | Page background         |
| Success           | `#22c55e` | Positive states         |
| Warning           | `#f59e0b` | Pending states          |
| Danger            | `#ef4444` | Errors, delete actions  |

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical architecture document covering:
- High-level system diagram
- Application layers (presentation, business logic, data)
- Database schema design
- Security model
- Deployment strategy

See [docs/PRD.md](docs/PRD.md) for the Product Requirements Document.

---

## Development Notes

- This is a **frontend demo** — no backend/database connected yet
- All data is mock data with localStorage persistence
- Authentication is UI-only (no real JWT/session management)
- Charts use Recharts with responsive containers
- The Feature Checklist page (`/admin/checklist`) tracks what's implemented vs. planned

---

## Next Steps (Backend Integration)

1. Set up Supabase (PostgreSQL + Auth + Storage)
2. Create API routes for all CRUD operations
3. Replace `usePersistedState` with TanStack Query + Supabase client
4. Add real authentication with JWT
5. Implement SMS gateway (Africa's Talking) and email (Resend)
6. Add PDF report generation
7. Deploy to Vercel
