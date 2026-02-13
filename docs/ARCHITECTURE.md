# System Architecture

> SilverVibe SACCO Management System — Technical Architecture Document

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                       │
│  ┌─────────────────────┐    ┌──────────────────────┐                │
│  │   Admin Dashboard    │    │   Member Portal       │                │
│  │   (Next.js SSR)      │    │   (Next.js SSR/CSR)   │                │
│  │   /admin/*           │    │   /portal/*            │                │
│  └──────────┬──────────┘    └──────────┬───────────┘                │
└─────────────┼──────────────────────────┼────────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION (Vercel)                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  App Router                                                    │   │
│  │  ├── Server Components (data fetching, SSR)                   │   │
│  │  ├── Client Components (interactivity, real-time)             │   │
│  │  ├── API Routes (/api/*) — server-side business logic         │   │
│  │  ├── Middleware (auth guards, role checks, redirects)          │   │
│  │  └── Server Actions (form mutations)                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────────┐
│  Supabase Auth   │ │ Supabase DB    │ │ Supabase Storage   │
│  ─────────────   │ │ ────────────   │ │ ────────────────   │
│  • JWT tokens    │ │ • PostgreSQL   │ │ • KYC documents    │
│  • Session mgmt  │ │ • RLS policies │ │ • Profile photos   │
│  • MFA (TOTP)    │ │ • Triggers     │ │ • Certificates     │
│  • Password hash │ │ • Functions    │ │ • Signatures       │
│  • OTP (SMS)     │ │ • Indexes      │ │ • Receipts         │
└──────────────────┘ └────────────────┘ └────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────────┐
│ Supabase         │ │ Supabase Edge  │ │ External Services  │
│ Realtime         │ │ Functions      │ │ ──────────────     │
│ ──────────       │ │ ──────────     │ │ • Africa's Talking │
│ • Live balances  │ │ • Interest     │ │   (SMS gateway)    │
│ • Notifications  │ │   computation  │ │ • Resend/SendGrid  │
│ • Activity feeds │ │ • Reminders    │ │   (email)          │
│ • Status updates │ │ • Dormancy     │ │ • Sentry           │
│                  │ │   checks       │ │   (error tracking) │
│                  │ │ • Report gen   │ │                    │
│                  │ │ • PDF gen      │ │                    │
└──────────────────┘ └────────────────┘ └────────────────────┘
```

---

## 2. Application Layers

### 2.1 Presentation Layer

```
┌──────────────────────────────────────────────────┐
│              Presentation Layer                    │
│                                                    │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Pages      │  │ Layouts  │  │ Components   │ │
│  │  (App       │  │ (Admin,  │  │ (shadcn/ui,  │ │
│  │   Router)   │  │  Portal, │  │  custom)     │ │
│  │             │  │  Auth)   │  │              │ │
│  └──────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│         │              │               │          │
│  ┌──────▼──────────────▼───────────────▼───────┐ │
│  │  State Management                            │ │
│  │  ├── Zustand (UI state, preferences)         │ │
│  │  ├── TanStack Query (server state, caching)  │ │
│  │  └── React Hook Form (form state)            │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2.2 Business Logic Layer

```
┌──────────────────────────────────────────────────┐
│            Business Logic Layer                    │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  API Routes (/api/*)                          │ │
│  │  ├── /api/auth/*        — Authentication      │ │
│  │  ├── /api/members/*     — Member management   │ │
│  │  ├── /api/savings/*     — Savings operations  │ │
│  │  ├── /api/loans/*       — Loan operations     │ │
│  │  ├── /api/shares/*      — Share capital       │ │
│  │  ├── /api/accounting/*  — GL & journals       │ │
│  │  ├── /api/communications/* — SMS, email       │ │
│  │  └── /api/reports/*     — Report generation   │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Server Actions                               │ │
│  │  ├── Member registration mutations            │ │
│  │  ├── Transaction processing                   │ │
│  │  ├── Approval workflows                       │ │
│  │  └── Profile updates                          │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Service Layer (lib/services/)                │ │
│  │  ├── MemberService                            │ │
│  │  ├── SavingsService                           │ │
│  │  ├── LoanService                              │ │
│  │  ├── AccountingService                        │ │
│  │  ├── NotificationService                      │ │
│  │  ├── ReportService                            │ │
│  │  └── AuditService                             │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2.3 Data Layer

```
┌──────────────────────────────────────────────────┐
│                Data Layer                          │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Supabase Client (lib/supabase/)              │ │
│  │  ├── createServerClient() — Server Components │ │
│  │  ├── createBrowserClient() — Client Comps     │ │
│  │  ├── createServiceRoleClient() — Edge Funcs   │ │
│  │  └── createMiddlewareClient() — Middleware     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Database (PostgreSQL)                        │ │
│  │  ├── Tables (27+ core tables)                 │ │
│  │  ├── Views (materialized views for reports)   │ │
│  │  ├── Functions (stored procs for complex ops) │ │
│  │  ├── Triggers (auto-audit, auto-GL posting)   │ │
│  │  ├── RLS Policies (data isolation)            │ │
│  │  └── Indexes (performance optimization)       │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 3. Authentication & Authorization Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   User       │────▶│  Next.js     │────▶│  Supabase Auth  │
│   (Browser)  │     │  Middleware   │     │  (JWT + Session)│
└─────────────┘     └──────┬───────┘     └────────┬────────┘
                           │                       │
                    ┌──────▼───────┐         ┌─────▼──────┐
                    │  Role Check  │         │  MFA Check │
                    │  (RBAC)      │         │  (TOTP)    │
                    └──────┬───────┘         └─────┬──────┘
                           │                       │
                    ┌──────▼───────────────────────▼─────┐
                    │  Route Access Decision               │
                    │  ├── /admin/* → Admin roles only     │
                    │  ├── /portal/* → Member role only    │
                    │  ├── Per-page permission checks      │
                    │  └── API route permission validation │
                    └─────────────────────────────────────┘
```

### Role-Based Access Control (RBAC)

```
┌───────────────────────────────────────────────────────────────┐
│                    RBAC Structure                                │
│                                                                  │
│  roles table                                                     │
│  ├── id, name, description                                      │
│  └── permissions (JSONB)                                        │
│      {                                                          │
│        "members": { "read": true, "create": true, ... },       │
│        "savings": { "read": true, "create": true, ... },       │
│        "loans":   { "read": true, "approve": true, ... },      │
│        "accounting": { "read": true, "post": false, ... },     │
│        ...                                                      │
│      }                                                          │
│                                                                  │
│  Permission granularity per module:                              │
│  • read — View data                                             │
│  • create — Create new records                                  │
│  • update — Modify existing records                             │
│  • delete — Remove records (soft delete)                        │
│  • approve — Checker approval                                   │
│  • export — Export data                                         │
│  • configure — System configuration                             │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Maker-Checker Workflow

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐
│  Maker   │───▶│  Create   │───▶│  Pending  │───▶│  Checker │
│  (User A)│    │  Record   │    │  Approval │    │  (User B)│
└─────────┘    └───────────┘    └─────┬─────┘    └────┬─────┘
                                      │               │
                               ┌──────┴──────┐  ┌─────▼──────┐
                               │             │  │  Review     │
                               │             │  │  Record     │
                               │             │  └─────┬──────┘
                               │             │        │
                               │     ┌───────┴────────┴────────┐
                               │     │                          │
                               ▼     ▼                          ▼
                         ┌──────────┐ ┌──────────┐ ┌───────────────┐
                         │ Approve  │ │ Reject   │ │ Return for    │
                         │          │ │ (reason) │ │ Correction    │
                         └────┬─────┘ └────┬─────┘ └───────┬───────┘
                              │            │                │
                              ▼            ▼                ▼
                        ┌──────────┐ ┌──────────┐  ┌──────────────┐
                        │ Post to  │ │ Logged   │  │ Back to      │
                        │ GL +     │ │ with     │  │ Maker for    │
                        │ Notify   │ │ reason   │  │ edits        │
                        └──────────┘ └──────────┘  └──────────────┘
```

**Rules:**
- Maker ≠ Checker (enforced at DB level)
- All actions timestamped and logged to `audit_trail`
- Applicable to: all financial transactions, loan disbursements, interest postings, manual journals, sensitive profile changes, product configuration changes, user role assignments

---

## 5. Double-Entry Accounting Engine

```
┌──────────────────────────────────────────────────────┐
│              Transaction Flow                          │
│                                                        │
│  Savings Deposit Example:                              │
│                                                        │
│  1. Maker creates savings_transaction                  │
│     (type: deposit, amount: 500,000)                   │
│                                                        │
│  2. Checker approves                                   │
│                                                        │
│  3. System auto-creates journal:                       │
│     ┌────────────────────────────────────────────┐    │
│     │ Journal #J-2026-0001                       │    │
│     │ Date: 2026-02-13                           │    │
│     │ Narration: Deposit - SV-0042 Regular Svgs  │    │
│     │                                            │    │
│     │ Debit:  1100 Cash/Bank       500,000       │    │
│     │ Credit: 2100 Member Savings  500,000       │    │
│     │                              ───────       │    │
│     │ Balance check: 0 ✅                        │    │
│     └────────────────────────────────────────────┘    │
│                                                        │
│  4. savings_account.balance updated                    │
│  5. Notification sent to member                        │
│  6. Audit trail logged                                 │
└──────────────────────────────────────────────────────┘
```

### Standard Journal Entry Mappings

| Transaction | Debit Account | Credit Account |
|-------------|---------------|----------------|
| Savings Deposit | 1100 Cash/Bank | 2100-2500 Member Savings (per product) |
| Savings Withdrawal | 2100-2500 Member Savings | 1100 Cash/Bank |
| Loan Disbursement | 1200 Loan Portfolio | 1100 Cash/Bank |
| Loan Repayment (Principal) | 1100 Cash/Bank | 1200 Loan Portfolio |
| Loan Repayment (Interest) | 1100 Cash/Bank | 4100 Interest Income |
| Interest Accrual (Savings) | 5100 Interest Expense | 2600 Interest Payable |
| Interest Application | 2600 Interest Payable | 2100-2500 Member Savings |
| Share Purchase | 1100 Cash/Bank | 3100 Share Capital |
| Loan Provision | 5400 Provision Expense | 2800 Provisions |
| Dividend Payment | 3300 Retained Earnings | 1100 Cash/Bank |

---

## 6. Data Flow — Key Scenarios

### 6.1 Member Registration

```
User fills form → API validates → Create member record
                                → Create savings_accounts (per selected products)
                                → Create share_capital_account
                                → Upload KYC docs to Supabase Storage
                                → Create Supabase Auth user (portal access)
                                → Send welcome email (Resend)
                                → Send welcome SMS (Africa's Talking)
                                → Log to audit_trail
                                → Create notification for KYC reviewer
```

### 6.2 Loan Application to Disbursement

```
Member applies → Eligibility engine checks
              → Loans Officer reviews
              → Approval committee/CEO approves
              → System:
                 → Deducts fees
                 → Generates amortization schedule
                 → Posts GL entries (Debit Loan Portfolio, Credit Cash)
                 → Places lien on guarantor savings
                 → Sends notification to member
                 → Sends notification to guarantors
                 → Logs audit trail
```

### 6.3 Interest Computation (Scheduled)

```
Edge Function (daily cron):
  → For each active savings account:
     → Compute daily interest based on product method
     → Update savings_account.accrued_interest
     → Log computation

Edge Function (annual/on-demand):
  → Generate interest preview report
  → Send for checker approval
  → On approval:
     → Batch post interest to all accounts
     → Create GL entries (Debit Interest Expense, Credit Savings)
     → Send notifications to members
```

---

## 7. Scheduled Jobs (Edge Functions)

| Job | Schedule | Description |
|-----|----------|-------------|
| `compute-daily-interest` | Daily 1:00 AM EAT | Compute and accrue daily interest |
| `check-dormancy` | Daily 2:00 AM EAT | Flag accounts approaching/reaching dormancy |
| `loan-repayment-reminders` | Daily 8:00 AM EAT | Send reminders 5 days before due date |
| `loan-overdue-alerts` | Daily 8:00 AM EAT | Send overdue alerts at 1, 7, 30, 60, 90 days |
| `savings-contribution-reminders` | Monthly | Remind members of upcoming contributions |
| `fixed-deposit-maturity-alerts` | Daily | Alert 30 and 7 days before maturity |
| `kyc-expiry-warnings` | Weekly | Alert 60 and 30 days before NID expiry |
| `monthly-statements` | 1st of month | Generate and email prior month statements |
| `daily-activity-summary` | Daily 11:00 PM EAT | Email daily activity summary to Super Admin |
| `par-computation` | Daily | Compute Portfolio at Risk aging buckets |

---

## 8. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Security Layers                                │
│                                                               │
│  Layer 1: Network                                             │
│  ├── TLS 1.3 in transit                                      │
│  ├── Vercel Edge Network (DDoS protection)                   │
│  └── Optional IP whitelisting for admin                      │
│                                                               │
│  Layer 2: Authentication                                      │
│  ├── Supabase Auth (JWT, bcrypt password hashing)            │
│  ├── TOTP MFA for all admin users                            │
│  ├── OTP via SMS for member phone login                      │
│  └── Session timeout: 15 min inactivity                      │
│                                                               │
│  Layer 3: Authorization                                       │
│  ├── Next.js Middleware (route-level guards)                 │
│  ├── API route role/permission checks                        │
│  ├── Supabase RLS (row-level data isolation)                 │
│  └── Maker-checker separation (DB-enforced)                  │
│                                                               │
│  Layer 4: Data                                                │
│  ├── AES-256 encryption at rest (Supabase)                   │
│  ├── Encrypted storage for KYC documents                     │
│  ├── Audit trail (append-only, no updates/deletes)           │
│  └── Immutable GL entries (corrections via reversals)        │
│                                                               │
│  Layer 5: Monitoring                                          │
│  ├── Sentry (error tracking, performance monitoring)         │
│  ├── Failed login attempt tracking                           │
│  ├── Unusual transaction amount alerts                       │
│  └── Daily activity reports to Super Admin                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Caching Strategy

| Data Type | Strategy | TTL |
|-----------|----------|-----|
| Savings products | TanStack Query cache | 5 minutes |
| Loan products | TanStack Query cache | 5 minutes |
| Member profile | TanStack Query cache + Supabase Realtime invalidation | 1 minute |
| Account balances | Supabase Realtime (live) | Real-time |
| Chart of Accounts | TanStack Query cache | 10 minutes |
| Dashboard KPIs | TanStack Query cache | 30 seconds |
| Static content (FAQ, guides) | Next.js ISR | 1 hour |
| Reports | On-demand generation, cached for session | Session |

---

## 10. Error Handling Strategy

```
┌─────────────────────────────────────────────────────┐
│  Error Handling Flow                                  │
│                                                       │
│  Client Error → Toast notification + retry option    │
│  Validation Error → Inline form errors (Zod)        │
│  API Error → Structured error response + Sentry log │
│  DB Error → Transaction rollback + error response   │
│  External Service Error (SMS/Email):                 │
│    → Retry with exponential backoff                  │
│    → Fallback channel if available                   │
│    → Log failed delivery for manual retry            │
│  Auth Error → Redirect to login + session cleanup    │
│  Rate Limit → 429 response + client-side backoff    │
└─────────────────────────────────────────────────────┘
```

### Error Response Format (API)

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Withdrawal would bring balance below minimum requirement",
    "details": {
      "current_balance": 4500000,
      "requested_amount": 1000000,
      "minimum_balance": 4000000,
      "available": 500000
    }
  }
}
```

### Success Response Format (API)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```
