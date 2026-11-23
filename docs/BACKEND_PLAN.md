# Backend Implementation Plan

> Status: **planned**. The live demo is a frontend-only build: every record is seeded from `src/lib/mock-data.ts` (and page-level seeds) and saved in the visitor's browser through `usePersistedState` (`src/lib/storage.ts`). This document describes how to turn it into a real, multi-user SACCO system without rewriting the UI.

Related: [PRD.md](PRD.md) (what the product must do) · [ARCHITECTURE.md](ARCHITECTURE.md) (target architecture) · the in-app **Feature Checklist** (`/admin/checklist`) lists what is done in the demo and what is planned.

---

## 1. Goals

| Goal | Why it matters |
| --- | --- |
| One shared source of truth | Today an admin approving a loan on one device is invisible to a member on another. |
| Real identities and permissions | Demo sign-in is simulated in the browser and must never hold real member data. |
| Money movements that are auditable | Every balance change must come from a posted, double-entry transaction with an audit trail. |
| Real channels | SMS, email and Mobile Money instead of toasts. |
| Scheduled work | Interest accrual, penalties, standing orders and report delivery run without anyone clicking. |

## 2. Recommended stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Database | **Supabase Postgres** | Managed Postgres, Row Level Security (RLS), backups, point-in-time recovery. |
| Auth | **Supabase Auth** | Email + password and phone OTP for members; email + password + TOTP for staff. |
| Server logic | **Next.js server actions / route handlers** on Vercel | Keep the current App Router app; move mutations to the server. |
| Data fetching | **TanStack Query** | Replaces `usePersistedState` reads; cache + optimistic updates. |
| Validation | **Zod** | One schema per form, shared by client and server. |
| Files | **Supabase Storage** | KYC documents, profile photos, generated statements. |
| SMS | **Africa's Talking** | Bulk SMS, sender ID `SILVERVIBE`, delivery reports via webhook. |
| Email | **Resend** | Statements, report delivery, password resets. |
| Mobile Money | **MTN MoMo API** and **Airtel Money API** | Collections (deposits, repayments) and disbursements (withdrawals, loans). |
| Scheduled jobs | **Vercel Cron** → route handlers (or Supabase `pg_cron`) | See §7. |
| Monitoring | Vercel logs + Sentry | Errors and slow queries. |

## 3. Data model

Each table maps to the browser key the demo uses today, so pages can be migrated one at a time.

| Table | Replaces demo key(s) | Key columns |
| --- | --- | --- |
| `members` | `admin_members` (`KEYS.adminMembers`), `portal_profile` | `id`, `sv_number` (unique), `full_name`, `phone`, `email`, `national_id`, `status`, `kyc_status`, `joined_on`, `auth_user_id` |
| `next_of_kin`, `beneficiaries` | `portal_kin`, `portal_beneficiaries` | `member_id`, `name`, `relationship`, `phone`, `allocation_pct` |
| `kyc_documents` | `portal_kyc_docs` | `member_id`, `type`, `storage_path`, `status`, `expires_on`, `reviewed_by` |
| `savings_products` | `admin_savings_products` | `code`, `name`, `rate_pct`, `min_balance`, `status` |
| `savings_accounts` | `portal_accounts` | `member_id`, `product_code`, `account_number`, `lien_amount`, `status` |
| `transactions` | `admin_savings_txn`, `portal_transactions` | `id`, `account_id`, `type`, `amount`, `direction`, `channel`, `reference`, `status` (pending/posted/reversed/rejected), `maker_id`, `checker_id`, `posted_at`, `journal_entry_id` |
| `loan_products` | `admin_loan_products` | `code`, `name`, `rate_pct`, `max_amount`, `max_term_months`, `fee_pct`, `savings_multiple` |
| `loan_applications` | `admin_loan_apps` (`KEYS.adminLoanApps`), `portal_loan_apps` | `id` (`LA-YYYY-####`), `member_id`, `product_code`, `amount`, `term_months`, `purpose`, `score`, `status`, `decided_by`, `decided_at`, `approve_note`, `decline_reason` |
| `loan_guarantors` | (inside applications) | `application_id`, `guarantor_member_id`, `amount_guaranteed`, `status` |
| `loans` | `admin_active_loans` | `id` (`LN-YYYY-####`), `application_id`, `member_id`, `principal`, `rate_pct`, `method`, `disbursed_on`, `status` |
| `loan_schedule` | `portal_loan_schedule` | `loan_id`, `installment_no`, `due_on`, `principal`, `interest`, `paid_amount`, `paid_on`, `status` |
| `shareholdings`, `share_certificates` | `admin_shareholders`, `portal_shares` | `member_id`, `shares`, `certificate_no`, `issued_on` |
| `dividends`, `dividend_payouts` | `admin_share_dividends` | `fiscal_year` (`FY 2025/26`), `rate_pct`, `declared_on`, `payable_on`, `status` |
| `investment_units` | `admin_iu_holdings` | `member_id`, `units`, `cost`, `accrued_returns` |
| `gl_accounts` | ledger chart of accounts | `code`, `name`, `type`, `normal_side` |
| `journal_entries`, `journal_lines` | `admin_journal_entries` | `id` (`JE-YYYY-####`), `entry_date`, `description`, `status`, `created_by`, `posted_by`; lines: `account_code`, `debit`, `credit` |
| `fiscal_periods` | (ledger constants) | `fiscal_year` (July–June), `starts_on`, `ends_on`, `status` (open/closed) |
| `announcements`, `message_log`, `message_templates` | `admin_announcements`, `admin_message_log`, `admin_message_templates` | `channel`, `audience`, `scheduled_for`, `sent_at`, `provider_message_id`, `delivered`, `failed` |
| `notifications` | `admin_notifications`, `member_notifications` | `recipient_user_id`, `type`, `title`, `body`, `href`, `read_at` |
| `support_tickets`, `ticket_messages` | `portal_support_tickets` | `member_id`, `category`, `subject`, `status` |
| `staff_users`, `roles`, `role_permissions` | `admin_system_users`, `admin_roles` | `role_id`, `module`, `can_view/create/approve`, `two_factor` |
| `audit_log` | `admin_audit_log` | `actor_id`, `module`, `action`, `entity`, `entity_id`, `before`, `after`, `ip`, `created_at` |
| `settings` | `admin_system_settings` | key/value per organisation |
| `report_schedules`, `generated_reports` | `admin_scheduled_reports`, `admin_recent_reports` | `report_id`, `frequency`, `recipients`, `next_run_at`, `storage_path` |

Money is stored as `bigint` UGX (no decimals), dates as `date`, timestamps as `timestamptz` (displayed in `Africa/Kampala`).

## 4. Security

- **Row Level Security on every table.** Members can read only rows where `member_id` matches their own record; staff access is granted through `role_permissions` (module × view/create/approve), mirroring the demo's Roles matrix.
- **Maker-checker** enforced in the database: a transaction or journal entry's `checker_id` must differ from `maker_id`; withdrawals above a configurable threshold and all loan disbursements require approval.
- **No direct balance updates.** Balances are derived from posted transactions (views or materialised totals updated in the same database transaction), so the ledger, member register and product totals always reconcile.
- **Audit log written by triggers**, not by the client.
- **Secrets** (Supabase service key, Africa's Talking, Resend, MoMo/Airtel credentials) live in Vercel environment variables, never in the repository.
- Keep the current client-side open-redirect protection (`safeNext`) and add server-side session checks in Next.js middleware.

## 5. Authentication

| User | Sign-in | Notes |
| --- | --- | --- |
| Member | SV number or phone + password, or phone OTP | Supabase phone auth via Africa's Talking SMS; link `auth.users` ↔ `members.auth_user_id`. |
| Staff | Email + password + TOTP | Enforce 2FA for Accountant, Loans Officer and Super Admin roles. |

The demo's `useAuthStore` and `AuthGuard` become thin wrappers over the Supabase session; route protection moves to middleware.

## 6. Migrating the UI off browser storage

The UI already reads and writes through a small number of seams, so migration is incremental:

1. Introduce a data-access layer per module (`src/server/members.ts`, `…/loans.ts`) with Zod-validated server actions.
2. Replace each `usePersistedState(key, seed)` with a TanStack Query hook of the same shape (`useMembers()`, `useLoanApplications()`), page by page. Keep the seed data as database seed scripts for staging.
3. Replace the demo-only catch-up logic (standing orders, scheduled sends in `usePortalData.ts` and the communications page) with the scheduled jobs in §7.
4. Remove `src/lib/demo-clock.ts` from production paths (keep it for the showcase build behind a `NEXT_PUBLIC_DEMO_MODE` flag).

## 7. Scheduled jobs

| Job | Schedule | What it does |
| --- | --- | --- |
| Standing orders | Daily 06:00 | Collect loan installments and savings standing orders (MoMo/Airtel/bank), post transactions. |
| Interest accrual | Daily 23:00, posted month-end | Savings interest per product rate; journal to interest expense. |
| Loan penalties & ageing | Daily 01:00 | Mark overdue installments, compute PAR buckets, apply penalty interest. |
| Scheduled messages | Every 5 min | Send announcements whose `scheduled_for` has passed; record delivery reports. |
| Report delivery | Per `report_schedules` | Generate PDF/CSV, store, email recipients. |
| Backups check | Daily | Verify Supabase backup status; alert on failure. |
| Fiscal year close | 30 June (manual trigger) | Close income/expense into reserves, open the next FY (July–June). |

## 8. Payment and messaging integrations

- **Mobile Money collections:** request-to-pay from the member's phone; webhook confirms → post deposit/repayment. Idempotency key = provider transaction id.
- **Mobile Money disbursements:** loan disbursements and approved withdrawals; only after checker approval.
- **SMS (Africa's Talking):** OTP, transaction alerts, reminders, bulk campaigns; delivery-report webhook updates `message_log`.
- **Email (Resend):** statements, report delivery, password resets.
- All webhooks verify signatures and are logged.

## 9. Environments

| Environment | Database | Deployed from |
| --- | --- | --- |
| Demo (today) | none (browser storage) | `main` → https://silvervibe-sacco-app.vercel.app |
| Staging | Supabase project `silvervibe-staging` with seed data | `staging` branch → Vercel preview |
| Production | Supabase project `silvervibe-prod` | `release` branch → Vercel production |

Provider sandboxes (MoMo, Airtel, Africa's Talking) are used in staging.

## 10. Phased delivery

| Phase | Scope | Indicative effort |
| --- | --- | --- |
| 1. Foundation | Supabase projects, schema + RLS, staff and member auth, members & KYC on the server, audit triggers | 2–3 weeks |
| 2. Savings & ledger | Accounts, transactions with maker-checker, journal engine, trial balance and statements from the database | 3–4 weeks |
| 3. Loans | Applications, guarantors, approvals, disbursement, schedules, repayments, PAR | 3–4 weeks |
| 4. Shares & dividends | Shareholdings, certificates, dividend declaration and payout | 1–2 weeks |
| 5. Channels | Africa's Talking SMS/OTP, Resend email, MTN MoMo + Airtel Money sandboxes then live | 3–4 weeks (provider onboarding can take longer) |
| 6. Automation & reporting | Scheduled jobs, report delivery, regulatory reports | 2–3 weeks |
| 7. Hardening | Load and security testing, backups/restore drill, staff training, data migration | 2 weeks |

Effort assumes one full-stack developer with part-time review; provider approvals (sender ID, MoMo production access) run in parallel and often set the critical path.

## 11. What you'll need to provide

- A Supabase account (two projects: staging and production).
- Africa's Talking account with an approved sender ID.
- Resend account and a verified sending domain.
- MTN MoMo and Airtel Money developer accounts (sandbox first, then production onboarding).
- The SACCO's chart of accounts, product rules (rates, limits, penalties) and approval thresholds to replace the demo values.
