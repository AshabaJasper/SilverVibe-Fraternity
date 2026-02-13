# Product Requirements Document (PRD)

> **SilverVibe Fraternity Cooperative Society Limited — SACCO Management System**

---

## Document Metadata

| Field | Value |
|-------|-------|
| Document Title | SilverVibe SACCO Management System PRD |
| Version | 1.0.0 |
| Created Date | 2026-02-13 |
| Author | Persmon Technologies |
| Client | SilverVibe Fraternity Cooperative Society Limited |
| Status | Draft |
| Confidentiality | Client Confidential |

---

## 1. Executive Summary

### 1.1 Overview

A comprehensive, modern SACCO management platform for SilverVibe Fraternity Cooperative Society Limited. The system consists of two primary interfaces:

- **Admin Dashboard** — for SACCO management operations (member registration, transaction processing, announcements, reporting)
- **Member Portal** — for cooperative members to manage their accounts, apply for loans, view statements, and interact with the cooperative

The platform is designed to comply with Uganda's cooperative regulations, IFRS reporting standards, and modern financial security best practices.

### 1.2 Business Objectives

1. Digitize all member management, savings, loans, share capital, and accounting operations
2. Provide members with a seamless self-service portal to manage their cooperative accounts
3. Enable real-time financial reporting and regulatory compliance (IFRS)
4. Automate routine operations: interest computation, reminders, dormancy alerts, dividend apportionment
5. Ensure full audit trail, maker-checker workflows, and role-based access controls
6. Support multiple communication channels: email, SMS, and in-app notifications
7. Build a scalable system that can grow with SilverVibe's membership and product offerings

### 1.3 Target Users

#### Admin Users
| Role | Description |
|------|-------------|
| CEO / General Manager | Executive oversight, high-value approvals |
| Accountant / Finance Officer | GL management, financial reporting |
| Loans Officer | Loan processing and arrears management |
| Savings Officer | Savings transactions and member onboarding |
| Board Secretary | Share certificates, governance |
| IT Administrator | System configuration and user management |
| Board Members | Read-only dashboards and reports |

#### Member Users
| Type | Description |
|------|-------------|
| Active cooperative members | Full portal access |
| Young Savers account holders | Limited access via parent/guardian |
| Prospective members | Application portal access |

---

## 2. System Modules

| Module ID | Module Name | Description |
|-----------|-------------|-------------|
| MOD-001 | Authentication & Authorization | Login, sessions, RBAC, MFA |
| MOD-002 | Member Management & KYC | Member lifecycle, registration, KYC verification |
| MOD-003 | Savings Management | Savings products, deposits, withdrawals, interest, dormancy |
| MOD-004 | Loans Management | Loan lifecycle, disbursement, repayment, restructuring, defaults |
| MOD-005 | Share Capital & Dividends | Share accounts, certificates, dividend computation |
| MOD-006 | Investment Units | Long-term investment units, transfers, returns |
| MOD-007 | General Ledger & Accounting | Double-entry accounting, CoA, journals, IFRS statements |
| MOD-008 | Notifications & Communications | Multi-channel notifications, reminders, announcements |
| MOD-009 | Reporting & Analytics | Management reports, regulatory reports, member statements |
| MOD-010 | Governance & Audit | Audit trails, activity logs, maker-checker, compliance |

> Detailed specifications for each module are in [MODULES.md](MODULES.md).

---

## 3. Admin Dashboard

### 3.1 Dashboard Home (`/admin`)

Executive overview with real-time KPIs and quick actions.

#### KPI Cards
- Total Members (active / inactive / dormant)
- Total Savings Balance (across all products)
- Total Loan Book (outstanding principal)
- Portfolio at Risk (PAR > 30 days)
- Total Share Capital
- Monthly Collections vs Target
- Pending Approvals Count

#### Charts
- Savings Growth Trend — line chart, 12 months
- Loan Disbursement vs Recovery — bar chart, monthly
- Member Growth — area chart
- Savings Product Distribution — donut chart
- Loan Portfolio Quality — stacked bar (current, watch, substandard, doubtful, loss)

#### Quick Actions
- Register New Member
- Record Deposit
- Process Loan Application
- Send Announcement
- Generate Report

#### Recent Activity Feed
- Latest transactions (deposits, withdrawals, loan disbursements)
- Pending maker-checker approvals
- Recent member registrations
- System alerts (dormant accounts, overdue loans, failed SMS)

#### Upcoming Events & Reminders
- Savings contribution due dates
- Loan repayment due dates
- Fixed deposit maturities
- Board meeting dates
- Interest application schedules

### 3.2 Member Management

#### Routes
| Route | Purpose |
|-------|---------|
| `/admin/members` | Member list |
| `/admin/members/register` | New member registration |
| `/admin/members/:id` | Member profile |
| `/admin/members/:id/kyc` | KYC review |

#### Member List
Searchable, filterable, sortable table with columns:
- SV Number, Full Name, Phone, Email
- Status (Active / Inactive / Suspended / Dormant)
- KYC Status (Pending / Verified / Expired)
- Total Savings, Outstanding Loans, Share Capital
- Date Joined, Actions

**Filters:** Status, KYC Status, Gender, Date Joined Range, Savings Product, Has Active Loan

**Export:** CSV, Excel, PDF

**Bulk Actions:** Send bulk SMS, Send bulk email, Export selected, Generate bulk statements

#### Member Registration (Multi-Step Form)

**Step 1 — Personal Information**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sv_number` | Auto-generated | — | Format: `SV-XXXX` |
| `full_name` | Text | ✅ | As per National ID |
| `gender` | Select (Male/Female) | ✅ | |
| `date_of_birth` | Date | ✅ | Must be 18+ for regular membership |
| `national_id_number` | Text | ✅ | Uganda NIN: CM/CF + 8 digits + 5 chars |
| `nid_expiry_date` | Date | ✅ | |
| `passport_number` | Text | ❌ | Alternative to NID |

**Step 2 — Contact Information**
| Field | Type | Required | Format |
|-------|------|----------|--------|
| `physical_address` | Textarea | ✅ | |
| `postal_address` | Text | ❌ | |
| `telephone_1` | Phone | ✅ | `+256XXXXXXXXX` |
| `telephone_2` | Phone | ❌ | |
| `email` | Email | ✅ | |

**Step 3 — Next of Kin & Beneficiaries**
- Next of Kin: 1–2 entries (full_name, relationship, phone, address)
- Beneficiaries: 1–4 entries (full_name, relationship, phone, address, percentage_share)
- **Validation:** Beneficiary percentage shares must total 100%

**Step 4 — KYC Documents**
| Document | Type | Max Size | Required |
|----------|------|----------|----------|
| National ID (front) | Image | 5MB | ✅ |
| National ID (back) | Image | 5MB | ✅ |
| Passport photo | Image | 5MB | ✅ |
| Member signature | Image/Canvas | — | ✅ |

Storage: Supabase Storage with RLS, encrypted at rest.

**Step 5 — Account Setup**
| Field | Type | Required |
|-------|------|----------|
| `initial_savings_product` | Select (dynamic) | ✅ |
| `share_capital_amount` | Currency | ❌ |
| `payment_method` | Select (Cash/Bank Transfer/Mobile Money) | ✅ |

**On Submit:**
1. Create member record with SV number
2. Create default savings accounts
3. Create share capital account
4. Send welcome email with portal login credentials
5. Send welcome SMS
6. Log registration in audit trail
7. Notify admin for KYC verification

#### Member Profile

**Tabs:** Overview, Savings, Loans, Share Capital, Investment Units, Documents, Audit Trail

**Actions:** Edit Profile (maker-checker for sensitive fields), Suspend, Reactivate, Flag for Review, Generate Statement, Send Communication

### 3.3 Savings Management

> Full specification in [MODULES.md](MODULES.md) § Savings Management

#### Preconfigured Savings Products

| Product | Code | Monthly Min | Key Feature |
|---------|------|-------------|-------------|
| Regular Savings | SV-REG | UGX 200,000 | Min balance UGX 4,000,000, determines loan eligibility |
| Flexi/Wallet Savings | SV-FLEX | None | Withdraw anytime, minimal fee |
| Fixed Savings | SV-FIX | — | Tenors: 6/9/12 months, min UGX 5,000,000 |
| Young Savers | SV-YNG | None | For non-adults, linked to parent/guardian member |
| Investment Units | SV-IU | — | Min UGX 100,000, not withdrawable, transferable |
| Loan Guarantee Savings | SV-LGS | — | Collateral for loans |

### 3.4 Loans Management

> Full specification in [MODULES.md](MODULES.md) § Loans Management

#### Loan Application Workflow
1. **Application** — Member submits (online or through officer)
2. **Preliminary Eligibility Check** — Automated system validation
3. **Loans Officer Review** — Manual review
4. **Approval** — Committee/CEO based on thresholds
5. **Disbursement** — Fees deducted, schedule generated, GL posted

#### Approval Matrix (Configurable)
| Amount | Approver |
|--------|----------|
| Up to UGX 5,000,000 | Loans Officer + CEO |
| Up to UGX 20,000,000 | Loans Committee |
| Above UGX 20,000,000 | Board |

### 3.5 Share Capital Management

> Full specification in [MODULES.md](MODULES.md) § Share Capital

### 3.6 General Ledger & Accounting

> Full specification in [MODULES.md](MODULES.md) § General Ledger

#### Chart of Accounts Structure
| Code | Category | Subcategories |
|------|----------|---------------|
| 1000 | Assets | Cash & Bank, Loan Portfolio, Fixed Deposits, Investments, PPE, Other Assets, Prepayments |
| 2000 | Liabilities | Member Savings (by product), Interest Payable, Provisions, Other Liabilities |
| 3000 | Equity | Share Capital, Share Premium, Retained Earnings, Statutory Reserves, IU Fund |
| 4000 | Income | Loan Interest, Fees & Charges, Investment Income, Penalties, Other |
| 5000 | Expenses | Interest Expense, Staff Costs, Admin, Provisions, Depreciation, Technology, Other |

### 3.7 Communications

> Full specification in [MODULES.md](MODULES.md) § Communications

### 3.8 Reporting

> Full specification in [MODULES.md](MODULES.md) § Reporting

### 3.9 Governance & Security

> Full specification in [MODULES.md](MODULES.md) § Governance

---

## 4. Member Portal

### 4.1 Design Philosophy

#### Visual Identity
| Property | Value |
|----------|-------|
| Primary Color | `#1A1A1A` (SilverVibe Black) |
| Secondary Color | `#C0C0C0` (Silver) |
| Accent Color | `#4A90D9` (Trust Blue) |
| Light Background | `#F8F9FA` |
| Dark Background | `#0D1117` |
| UI Typography | Inter |
| Heading Typography | Plus Jakarta Sans |
| Card Style | Frosted glass effect with subtle silver gradients |
| Animations | Smooth transitions, counting animations, progress indicators |

#### UX Principles
- Mobile-first responsive design (majority of Ugandan users are mobile)
- Fast loading on 3G/4G connections (< 3 second initial load)
- Offline-capable for viewing cached account data
- Clear financial information hierarchy (balances first, then details)
- Gamification elements (savings streaks, financial health score)
- Dark mode support

### 4.2 Portal Pages

#### Login (`/portal/login`)
- SV Number + Password login
- Phone number + OTP login option
- Biometric login (future mobile app)
- Forgot password flow
- First-time login password setup

#### Dashboard (`/portal`)
Components:
- **Welcome Banner** — Personalized greeting, dynamic time-of-day, motivational quote
- **Total Net Worth Card** — Animated total (savings + shares + IU), silver gradient, SV logo watermark
- **Account Cards Carousel** — Horizontal scroll (mobile) / grid (desktop) for all account types
- **Financial Health Score** — Circular gauge (green/yellow/red) based on consistency, repayment, growth
- **Monthly Savings Progress** — Animated progress bar with streak tracking
- **Quick Actions** — Apply for Loan, View Statement, Contact Support, Update Profile
- **Recent Transactions** — Last 5, color-coded (green = credit, red = debit)
- **Announcements Feed** — Latest management announcements
- **Upcoming Obligations** — Timeline with countdown for due dates

#### Savings (`/portal/savings`)
- Overview with donut chart (distribution) and line chart (growth)
- Account detail: balance, available balance, accrued interest, transaction history
- Statement generation (PDF, branded)
- Savings calculator with projected growth chart

#### Loans (`/portal/loans`)
- Overview: active loans, eligibility indicator, guarantor obligations
- Online application wizard with eligibility pre-check
- Application status tracking (Submitted → Under Review → Approved/Rejected → Disbursed)
- Active loan detail: amortization schedule, repayment history, countdown to next payment
- Loan calculator with amortization table
- Loan statement (PDF)

#### Shares & Investments (`/portal/shares`)
- Share capital dashboard with dividend history bar chart
- Share certificate viewer/downloader
- Investment units balance, returns, fund performance chart

#### Profile (`/portal/profile`)
- Personal info (editable fields: phone, email, address; admin-approval: name, NID, DOB)
- Next of kin & beneficiaries
- KYC documents (view, upload, expiry alerts)
- Security settings (password, MFA, sessions, login history)
- Notification preferences by category and channel

#### Notifications (`/portal/notifications`)
- In-app notification center (read/unread)
- Categories: Transactions, Loans, Announcements, Reminders, System
- Notification preferences

#### Support (`/portal/support`)
- FAQ section
- Contact form
- Phone and email links
- Feedback submission
- How-to guides and tutorials

---

## 5. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Page load | < 3 seconds on 4G |
| API response | < 500ms standard, < 2s complex reports |
| Concurrent users | 200+ |
| Database | Indexed on sv_number, member_id, account_number, date ranges |

### Scalability
| Dimension | Target |
|-----------|--------|
| Members | 10,000 initial, scalable to 50,000+ |
| Daily transactions | 1,000+ |
| Storage | Scalable for KYC and certificates |

### Availability
| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Maintenance windows | 2 AM – 5 AM EAT |
| Degradation | Core viewing available during partial outages |

### Security
- Aligned with Uganda's Data Protection and Privacy Act, 2019
- Annual penetration testing
- Automated dependency scanning (GitHub Actions)
- Data residency compliance

### Accessibility
- WCAG 2.1 Level AA
- English primary, localization-ready
- Full functionality on mobile, tablet, desktop

---

## 6. Implementation Phases

| Phase | Weeks | Deliverables |
|-------|-------|-------------|
| **1 — Foundation & Core** | 1–6 | Project setup, DB schema, RLS, auth, member registration, KYC, admin/portal layouts, RBAC |
| **2 — Savings Module** | 7–10 | Product config, transaction processing, maker-checker, interest engine, dormancy, portal savings, statements |
| **3 — Loans Module** | 11–15 | Product config, application workflow, eligibility engine, disbursement, repayment, guarantors, arrears, portal loans |
| **4 — Shares & Accounting** | 16–20 | Share capital, certificates, dividends, investment units, CoA, GL engine, auto-posting, journals, trial balance, financial statements |
| **5 — Comms & Reporting** | 21–24 | SMS (Africa's Talking), email (Resend), automated notifications, announcements, reports, export, audit, KPI charts, portal health features |
| **6 — UAT & Launch** | 25–28 | UAT, bug fixes, data migration, training, production deployment, support setup, documentation |

---

## 7. Training & Support

### Training

| Audience | Duration | Topics |
|----------|----------|--------|
| Admin staff | 3 days | Full system operations, maker-checker, reporting |
| Members | Self-service | Onboarding tutorial, FAQ, how-to videos |
| Board/Committee | 1 day | Dashboards, approvals, reports |

### Post-Launch Support

| Severity | Response Time |
|----------|--------------|
| Critical (system down) | 4 hours |
| High (major feature broken) | 8 hours |
| Medium (minor issues) | 24 hours |
| Low (cosmetic) | 48 hours |

Warranty period: 3 months post-launch.

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Poor internet connectivity in Uganda | High | PWA, offline caching, optimized bundles, SSR |
| Member adoption resistance | Medium | Mobile-first design, onboarding flow, SMS channel, in-person training |
| Data loss / security breach | Critical | Daily backups, RLS, encryption, MFA, security audits |
| Regulatory changes | Medium | Configurable products, flexible CoA, modular architecture |
| SMS delivery failures | Medium | Multi-channel, delivery tracking, retry logic, fallback provider |
| Scope creep | High | Phased delivery, sprint demos, change request process |

---

## 9. Acceptance Criteria

- [ ] All member registration and KYC workflows functional with maker-checker
- [ ] All 6 savings products configurable and operational
- [ ] Loan application through disbursement workflow complete
- [ ] Repayment schedule auto-generation and recomputation working
- [ ] Share capital management with certificate generation functional
- [ ] Double-entry GL posting for all transaction types verified
- [ ] Trial balance generation and validation passing
- [ ] IFRS financial statements generating correctly
- [ ] SMS and email notifications delivering successfully
- [ ] Member portal fully functional with all account views
- [ ] Role-based access properly restricting unauthorized actions
- [ ] Audit trail capturing all required events
- [ ] All standard reports generating and exportable
- [ ] System passing performance benchmarks (< 3s page load on 4G)
- [ ] Security audit passing with no critical vulnerabilities
