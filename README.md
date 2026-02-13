# SilverVibe Fraternity Cooperative Society Limited — SACCO Management System

> A comprehensive, modern SACCO management platform built with **Next.js 15 + Supabase + Tailwind CSS + shadcn/ui**.

---

## Overview

This system consists of two primary interfaces:

| Interface | Audience | Purpose |
|-----------|----------|---------|
| **Admin Dashboard** (`/admin`) | SACCO officers & management | Member registration, transaction processing, reporting, communications |
| **Member Portal** (`/portal`) | Cooperative members | Account management, loan applications, statements, self-service |

The platform complies with Uganda's cooperative regulations, IFRS reporting standards, and modern financial security best practices.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), shadcn/ui, Tailwind CSS 4, Recharts |
| State | Zustand (client), TanStack Query (server) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| SMS | Africa's Talking API |
| Email | Resend / SendGrid |
| PDF | React-PDF / Puppeteer |
| Hosting | Vercel + Supabase Cloud |
| CI/CD | GitHub Actions |
| Monitoring | Sentry + Supabase Dashboard |

---

## Documentation

All project documentation lives in the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Full Product Requirements Document |
| [Architecture](docs/ARCHITECTURE.md) | System architecture & module design |
| [Database Schema](docs/DATABASE_SCHEMA.md) | PostgreSQL schema, RLS policies, relationships |
| [API Reference](docs/API_REFERENCE.md) | All API endpoints with request/response specs |
| [Development Guide](docs/DEVELOPMENT_GUIDE.md) | Setup, conventions, workflows |
| [Module Specifications](docs/MODULES.md) | Detailed specs per module (Auth, Savings, Loans, etc.) |
| [Design System](docs/DESIGN_SYSTEM.md) | Visual identity, component library, UX guidelines |
| [Deployment & Ops](docs/DEPLOYMENT.md) | Hosting, CI/CD, backups, monitoring |
| [AI Agent Instructions](docs/AI_AGENT_INSTRUCTIONS.md) | Instructions for AI-assisted development |

---

## Project Structure (Target)

```
silvervibe-sacco/
├── docs/                          # Project documentation
├── public/                        # Static assets (logo, favicon, etc.)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Auth pages (login, forgot-password)
│   │   ├── admin/                 # Admin Dashboard pages
│   │   │   ├── members/
│   │   │   ├── savings/
│   │   │   ├── loans/
│   │   │   ├── shares/
│   │   │   ├── accounting/
│   │   │   ├── communications/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── portal/                # Member Portal pages
│   │   │   ├── savings/
│   │   │   ├── loans/
│   │   │   ├── shares/
│   │   │   ├── profile/
│   │   │   ├── notifications/
│   │   │   └── support/
│   │   ├── api/                   # API Routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── admin/                 # Admin-specific components
│   │   ├── portal/                # Member portal components
│   │   └── shared/                # Shared components
│   ├── lib/
│   │   ├── supabase/              # Supabase client & helpers
│   │   ├── validations/           # Zod schemas
│   │   ├── utils/                 # Utility functions
│   │   └── constants/             # Constants & config
│   ├── hooks/                     # Custom React hooks
│   ├── stores/                    # Zustand stores
│   ├── types/                     # TypeScript type definitions
│   └── styles/                    # Global styles
├── supabase/
│   ├── migrations/                # Database migrations
│   ├── seed.sql                   # Seed data
│   └── functions/                 # Edge Functions
├── tests/                         # Test files
├── .env.local.example             # Environment variables template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Implementation Phases

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1–6 | Foundation & Core (Auth, Members, KYC, Layouts, RBAC) |
| 2 | 7–10 | Savings Module |
| 3 | 11–15 | Loans Module |
| 4 | 16–20 | Share Capital, Dividends & Accounting |
| 5 | 21–24 | Communications, Reporting & Polish |
| 6 | 25–28 | UAT, Training & Launch |

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd silvervibe-sacco

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run database migrations
npx supabase db push

# 5. Seed initial data
npx supabase db seed

# 6. Start development server
npm run dev
```

---

## License

Proprietary — SilverVibe Fraternity Cooperative Society Limited. All rights reserved.

**Built by [Persmon Technologies](https://persmon.tech)**
