# Comprehensive Application Security Review

**Document Version:** 1.0.0  
**Application:** ApexWallet  
**Review Lead:** Principal Fintech Security Engineer  
**Date:** October 2026  
**Security Posture:** **HARDENED (Zero High/Critical Findings in Application Code)**  

---

## 1. Security Architecture & Threat Model

ApexWallet operates a custodial fintech architecture holding customer liabilities. The security perimeter enforces defense-in-depth across the following layers:
- **Client/Server Boundary:** Next.js Server Components and Server Actions encapsulate all database interactions and secret access. Client components never receive provider secrets or database credentials.
- **Tenant Isolation:** PostgreSQL Row Level Security (RLS) policies enforce multi-tenant isolation at the database level.
- **Financial Invariants:** Server-side stored procedures execute double-entry balancing and row-level locking (`FOR UPDATE`) to defeat concurrency race conditions.

---

## 2. Review Findings & Verification by Area

### 2.1 Authentication & Session Management
- **Token Storage:** Authentication tokens are stored exclusively in HTTP-only, `SameSite=Lax`, `Secure` cookies via `@supabase/ssr`. Tokens are inaccessible to client-side JavaScript, defeating token theft via Cross-Site Scripting (XSS).
- **Session Revocation:** Users can terminate all sessions across all devices via `signOutAllSessionsAction` (`supabase.auth.signOut({ scope: "global" })`).
- **Password Hygiene:** Password updates enforce minimum 8 characters and automatically emit a high-priority `SECURITY_ALERT` notification to the user.

### 2.2 Database Authorization & Row Level Security (RLS)
- **RLS Enabled:** Active on all 8 application tables (`user_profiles`, `ledger_accounts`, `wallet_balances`, `ledger_transactions`, `ledger_entries`, `withdrawal_requests`, `swap_quotes`, `notifications`, `user_notification_preferences`).
- **Cross-Tenant Access Prevention:** Users are restricted to querying rows where `auth.uid() = user_id`.
- **Client Mutation Denial:** Financial tables (`ledger_transactions`, `ledger_entries`, `withdrawal_requests`, `swap_quotes`) enforce unconditional `INSERT/UPDATE/DELETE WITH CHECK (false)` policies for client roles. All financial ledger mutations occur strictly via `SECURITY DEFINER` stored procedures.

### 2.3 Webhook Integrity & Replay Protection
- **Korapay Webhooks:** Verified using HMAC-SHA256 (`x-korapay-signature` compared with `crypto.timingSafeEqual` against `KORAPAY_SECRET_KEY`).
- **Fireblocks Webhooks:** Verified using HMAC-SHA512 with timing-safe comparison against `FIREBLOCKS_WEBHOOK_SECRET`.
- **Replay Protection:** Webhook processing checks unique `idempotency_key` (derived from provider reference or transaction hash) before invoking stored procedures. Duplicate deliveries return HTTP 200 with `{ status: "IDEMPOTENT_REPLAY" }` without re-crediting.

### 2.4 Injection & Input Validation
- **SQL Injection:** Zero raw SQL string concatenation. All database operations utilize Supabase parameterization or strongly typed PL/pgSQL stored procedures.
- **Address Validation:** Destination crypto addresses are validated prior to execution using strict regexes and Base58 checksum algorithms.
- **Decimal Math Distortion:** `LedgerService` utilizes exact string arithmetic with `BigInt` scaling up to 36 decimal places, eliminating standard JavaScript IEEE-754 floating-point rounding bugs (`0.1 + 0.2 = 0.30000000000000004`).

### 2.5 Open Redirects & URL Handling
- **Route Whitelisting:** External redirect queries are stripped in auth routes. Redirects are bounded to relative application paths (`/dashboard`). Verified by `tests/unit/redirects.test.ts`.

### 2.6 Logging & Sensitive Data Redaction
- **Automated Masking:** `Logger` intercepts structured logs and redacts passwords, private keys, bearer tokens, webhook secrets, and full 16-digit card/account numbers. Verified by `tests/unit/logger-safety.test.ts`.

---

## 3. Dependency Vulnerability Assessment (`npm audit`)

An automated scan of the project's dependency graph was executed via `npm audit`:
- **Production Dependencies:** 0 high or critical vulnerabilities detected in runtime production packages (`@supabase/supabase-js`, `zod`, `clsx`, `lucide-react`).
- **DevDependencies / Build-Time Findings:**
  - `tinypool` (via `vitest`): Low/moderate risk confined to local developer test execution; not present in the Next.js production bundle.
  - `postcss` / `braces` (via `tailwindcss` / `eslint-config-next`): Minor build-time warnings. Updating requires major version upgrades to Tailwind v4 and Next 16, which would introduce breaking design system regressions.
- **Risk Assessment:** Low. Zero impact on production runtime environment.

---

## 4. Formal Audit & Compliance Disclaimer
> **IMPORTANT:** This review represents an internal security assessment and automated static/dynamic code analysis conducted by the engineering team. It **does not constitute a formal third-party penetration test, SOC 2 certification, or regulatory security sign-off**. A formal engagement with an accredited external cybersecurity firm must be completed prior to unrestricted public launch.
