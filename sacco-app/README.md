# SilverVibe Fraternity SACCO Management System

> A comprehensive, interactive demo of a SACCO (Savings and Credit Cooperative) management platform built with Next.js 16, TypeScript, and Tailwind CSS 4.

---

## Quick Start

```bash
cd sacco-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Framework      | Next.js 16 (App Router, TypeScript)             |
| Styling        | Tailwind CSS 4 (`@theme`, `@layer`, `@utility`) |
| Icons          | Lucide React                                    |
| Charts         | Recharts (Line, Area, Bar, Pie)                 |
| State          | Zustand (auth store), `usePersistedState` hook  |
| Persistence    | localStorage (demo edits survive refresh)       |
| Fonts          | Inter (UI), Plus Jakarta Sans (headings)        |

---

## Project Structure

```
sacco-app/
  src/
    app/
      page.tsx                  # Landing page (role selector)
      layout.tsx                # Root layout (fonts, metadata)
      globals.css               # Tailwind v4 theme & utilities
      admin/
        layout.tsx              # Sidebar + header shell
        page.tsx                # Dashboard (KPIs, charts, activity)
        members/page.tsx        # CRUD + modals (register, edit, delete, profile)
        savings/page.tsx        # Products, transactions + modals
        loans/page.tsx          # Review, approve, decline + modals
        shares/page.tsx         # Issue shares, configure, shareholders + modals
        accounting/page.tsx     # Journal entries, trial balance, statements + modals
        communications/page.tsx # Announcements, compose, templates + modals
        reports/page.tsx        # Report catalog
        settings/page.tsx       # Org, security, integrations, users + modals
        checklist/page.tsx      # Feature checklist with progress tracking
      portal/
        layout.tsx              # Member portal shell
        page.tsx                # Member dashboard
        savings/page.tsx        # Savings overview
        loans/page.tsx          # Loan status
        shares/page.tsx         # Share portfolio
        profile/page.tsx        # Profile management
        notifications/page.tsx  # Notification center
        support/page.tsx        # Support tickets
        login/page.tsx          # Portal login
    components/
      Modal.tsx                 # Reusable modal (sm/md/lg/xl, ESC close, overlay)
    lib/
      mock-data.ts              # Demo data for all pages
      storage.ts                # usePersistedState hook, showToast, localStorage utils
      store.ts                  # Zustand auth store
      utils.ts                  # formatCurrency, formatNumber, cn()
```

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

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full technical architecture document covering:
- High-level system diagram
- Application layers (presentation, business logic, data)
- Database schema design
- Security model
- Deployment strategy

See [docs/PRD.md](../docs/PRD.md) for the Product Requirements Document.

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
