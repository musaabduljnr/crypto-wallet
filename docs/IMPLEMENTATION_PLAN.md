# Master Implementation Plan (16 Phases)
## End-to-End Execution Roadmap for Nigeria-First Managed Crypto Wallet

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## Roadmap Overview & Progression Protocol

This implementation plan establishes a strict, phased engineering progression. To ensure financial safety, regulatory readiness, and code quality:
1. **Linear Gate Enforcement:** No phase may begin until the preceding phase has satisfied all explicit acceptance criteria and received formal user sign-off.
2. **Audit Requirement:** Every phase concludes with a structured Phase Audit Report documenting verified functionality, test results, code artifacts, and known limitations.
3. **No Simulated Financials in Production Paths:** All core financial paths must be built to production specifications with strict typing, double-entry ledger enforcement, and robust error handling from day one.

```
[Phase 01: Foundation & Specs] -> [Phase 02: Design Tokens & UI Specs] -> [Phase 03: Next.js Setup]
       |
[Phase 04: Public Marketing]  -> [Phase 05: Auth & Profiles]           -> [Phase 06: DB & Ledger Engine]
       |
[Phase 07: Adapter Framework] -> [Phase 08: Wallet Dashboard]          -> [Phase 09: NGN Add Money]
       |
[Phase 10: EVM Receive]       -> [Phase 11: Transfers & Withdrawals]   -> [Phase 12: Crypto Swap]
       |
[Phase 13: History & Profile] -> [Phase 14: E2E QA & Chaos Testing]   -> [Phase 15: Security Audit]
       |
[Phase 16: Deployment & Launch]
```

### Phase & Milestone Execution Status Tracker

| Phase | Milestone | Scope / Title | Status | Verification & Deliverables |
|:---|:---|:---|:---|:---|
| **Phase 01** | Phase 1 | Requirements, Architecture & Specs | **COMPLETED** | `docs/PRD.md`, `ARCHITECTURE.md`, `LEDGER_DESIGN.md` |
| **Phase 02** | Phase 2 | Design System & UI/UX Foundation | **COMPLETED** | `docs/DESIGN_SYSTEM.md`, `SCREEN_INVENTORY.md`, `docs/PHASE_2_REPORT.md` |
| **Phase 03** | **Milestone 1** | Project Setup & Frontend Infrastructure | **COMPLETED** | `src/lib/config/env.ts`, `src/lib/logger.ts`, `src/lib/errors.ts` |
| **Phase 04** | **Milestone 1** | Public Marketing Experience & Landing Page | **COMPLETED** | `src/app/page.tsx`, `Navbar.tsx`, `Footer.tsx` |
| **Phase 05** | **Milestone 1** | Authentication, Session Management & Profiles | **COMPLETED** | `src/app/(auth)/*`, `(dashboard)/*`, `docs/PHASE_3_5_REPORT.md` |
| **Phase 06** | Milestone 2 | PostgreSQL Schema & Double-Entry Ledger Engine | PENDING | Awaiting user approval to proceed |
| **Phase 07** | Milestone 2 | Service Layer & Provider Adapters | PENDING | Awaiting user approval to proceed |
| **Phase 08** | Milestone 2 | Wallet Dashboard & Portfolio Integration | PENDING | Awaiting user approval to proceed |
| **Phase 09** | Milestone 2 | NGN Add Money (Korapay Virtual Accounts) | PENDING | Awaiting user approval to proceed |
| **Phase 10** | Milestone 2 | Crypto Receive (Deposit Tracking & Webhooks) | PENDING | Awaiting user approval to proceed |
| **Phase 11** | Milestone 3 | Internal Transfers & External Withdrawals | PENDING | Awaiting Milestone 2 completion |
| **Phase 12** | Milestone 3 | Crypto Swap (RFQ Engine & Atomic Settlement) | PENDING | Awaiting Milestone 2 completion |
| **Phase 13** | Milestone 3 | Transaction History, Receipts & Notifications | PENDING | Awaiting Milestone 2 completion |
| **Phase 14** | Milestone 3 | E2E QA, Concurrency & Chaos Testing | PENDING | Awaiting Milestone 2 completion |
| **Phase 15** | Milestone 3 | Security Audit & Compliance Hardening | PENDING | Awaiting Milestone 2 completion |
| **Phase 16** | Milestone 3 | Production Deployment & Launch Runbooks | PENDING | Awaiting Milestone 2 completion |

---

## Detailed Phase Breakdown

### Phase 01: Product Requirements, Architecture & Technical Specification
- **Objective:** Establish the comprehensive technical and operational foundation for the application.
- **Prerequisites:** Workspace access.
- **Scope:** Define PRD, System Architecture, Ledger Design, Provider Strategy, Security Blueprint, UI/UX Specs, Environment Specs, Acceptance Criteria, and the 16-phase roadmap.
- **Deliverables:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/LEDGER_DESIGN.md`, `docs/PROVIDER_STRATEGY.md`, `docs/SECURITY.md`, `docs/UI_UX_SPEC.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/ENVIRONMENT_AND_DEPLOYMENT.md`, `docs/ACCEPTANCE_CRITERIA.md`.
- **Dependencies:** None.
- **Testing Requirements:** Architectural consistency review across all documentation artifacts.
- **Security Considerations:** Explicit threat modeling, zero-trust design, secret management strategy.
- **Acceptance Criteria:** All 9 core documentation files created and consistent; no implementation code created prematurely.
- **Blocking Conditions:** Inconsistent architecture or unapproved custody assumptions.
- **Definition of Done:** Documentation complete, verified, and Phase 1 completion report accepted by user.

---

### Phase 02: UI Design System & Screen Specifications
- **Objective:** Formalize the component hierarchy, Tailwind configuration, color tokens, typography, and interactive screen states.
- **Prerequisites:** Phase 01 approved.
- **Scope:** Define complete component library token schema, design tokens, button/form states, modal designs, and micro-interactions.
- **Deliverables:** `docs/DESIGN_SYSTEM.md`, Figma/CSS token schemas, component contracts.
- **Dependencies:** Tailwind CSS, Lucide React icon definitions.
- **Testing Requirements:** Visual accessibility review (WCAG AA contrast checks).
- **Security Considerations:** No sensitive data exposed in mockups or static templates.
- **Acceptance Criteria:** Every screen in the user journey has explicit desktop and mobile layout specifications with loading, error, empty, and success states defined.
- **Blocking Conditions:** Ambiguous form interactions or unresolved brand palette tokens.
- **Definition of Done:** Full design system documented and approved.

---

### Phase 03: Next.js Project Setup & Frontend Foundation
- **Objective:** Initialize the Next.js App Router project with TypeScript, Tailwind CSS, shadcn/ui primitives, and linting/formatting standards.
- **Prerequisites:** Phase 02 approved.
- **Scope:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `globals.css`, base UI primitives (`button`, `input`, `card`, `dialog`, `dropdown-menu`, `toast`), and testing scaffolding (Vitest, Playwright).
- **Deliverables:** Clean, compileable Next.js project structure with working root layout and test runner.
- **Dependencies:** Next.js 15+, React 19, Tailwind CSS, shadcn/ui, Vitest, Playwright.
- **Testing Requirements:** Run `npm run build` and `npm run test:unit` to verify clean build and baseline test pass.
- **Security Considerations:** Setup strict Next.js security headers (CSP, HSTS, X-Frame-Options) in configuration.
- **Acceptance Criteria:** Zero TypeScript errors, zero lint warnings, dev server boots cleanly, test suite executes.
- **Blocking Conditions:** Build failures or package dependency conflicts.
- **Definition of Done:** Next.js application skeleton runs locally with passing health checks.

---

### Phase 04: Public Marketing Homepage
- **Objective:** Build a responsive, high-converting public landing page showcasing the product.
- **Prerequisites:** Phase 03 approved.
- **Scope:** Navbar with theme toggle, hero section with live ticker component, feature value-prop grid, security proof section, FAQ accordion, and footer.
- **Deliverables:** `src/app/(public)/page.tsx`, `src/components/marketing/*`.
- **Dependencies:** Lucide icons, Tailwind typography.
- **Testing Requirements:** Mobile responsiveness tests (360px to 1440px), lighthouse performance and accessibility check.
- **Security Considerations:** All external links use `rel="noopener noreferrer"`; no confidential platform endpoints exposed.
- **Acceptance Criteria:** 100% responsive, zero layout shifts, navigation links route correctly to auth pages.
- **Blocking Conditions:** Visual clipping on mobile screens or lighthouse score < 90.
- **Definition of Done:** Public homepage renders cleanly on mobile and desktop.

---

### Phase 05: Authentication, Session Management & Profiles
- **Objective:** Implement secure user registration, email verification, login, password reset, and user profile management using Supabase Auth.
- **Prerequisites:** Phase 04 approved, Supabase project configured.
- **Scope:** `src/app/(auth)/*`, `src/middleware.ts` (edge session protection), `src/services/auth.service.ts`, `user_profiles` schema.
- **Deliverables:** Functional auth flows, cookie session handling, profile creation triggers, and session revocation.
- **Dependencies:** `@supabase/ssr`, `@supabase/supabase-js`, Zod.
- **Testing Requirements:** Unit tests for auth schemas; integration tests for login/logout and session cookie issuance.
- **Security Considerations:** HTTP-only cookies, brute-force rate limiting, password strength enforcement.
- **Acceptance Criteria:** Users can sign up, verify email, log in, access `/dashboard`, and unauthenticated visitors are redirected to `/auth/login`.
- **Blocking Conditions:** Insecure cookie attributes or bypassable middleware.
- **Definition of Done:** Full auth lifecycle verified with automated tests.

---

### Phase 06: Database Schema & Financial Ledger Engine
- **Objective:** Deploy the PostgreSQL schema, Row Level Security policies, and double-entry ledger stored procedures.
- **Prerequisites:** Phase 05 approved.
- **Scope:** `supabase/migrations/` covering `ledger_accounts`, `ledger_transactions`, `ledger_entries`, `wallet_balances`, and atomic RPC functions (`execute_internal_transfer`, `credit_user_deposit`, `reserve_withdrawal`).
- **Deliverables:** Migration scripts, TypeScript database types, `LedgerService`.
- **Dependencies:** Supabase CLI / PostgreSQL.
- **Testing Requirements:** 100+ automated Vitest tests validating ledger invariants ($\sum \text{Debits} = \sum \text{Credits}$), non-negative balance checks, and concurrency locks.
- **Security Considerations:** Strict RLS: standard roles cannot directly insert or modify ledger tables; all mutations occur via security-definer RPCs.
- **Acceptance Criteria:** Ledger balances perfectly across all operations; concurrent debit attempts for the same balance are safely serialized.
- **Blocking Conditions:** Any test producing unbalanced entries or allowing balance overdraft.
- **Definition of Done:** Ledger migrations applied, and all invariant unit/integration tests passing.

---

### Phase 07: Provider Adapter Framework & Mock Implementations
- **Objective:** Create strongly typed adapter contracts and high-fidelity test mock adapters for fiat funding, custody wallets, and swaps.
- **Prerequisites:** Phase 06 approved.
- **Scope:** `src/contracts/*`, `src/providers/fiat/*`, `src/providers/custody/*`, `src/providers/swap/*`.
- **Deliverables:** Adapter interfaces, mock adapters simulating real-world network latency, errors, and webhooks.
- **Dependencies:** TypeScript, crypto libraries.
- **Testing Requirements:** Contract compliance tests verifying all adapters adhere to interface signatures.
- **Security Considerations:** Webhook signature verification algorithms implemented and verified against test vectors.
- **Acceptance Criteria:** Adapters can be hot-swapped via configuration without modifying business logic.
- **Blocking Conditions:** Leaky provider abstractions exposing vendor-specific types to business services.
- **Definition of Done:** Adapter contracts and test harnesses functional and documented.

---

### Phase 08: Wallet Dashboard & Portfolio Data
- **Objective:** Implement the core authenticated dashboard displaying aggregate net worth, individual asset cards, and recent transactions.
- **Prerequisites:** Phase 07 approved.
- **Scope:** `src/app/(dashboard)/page.tsx`, `src/components/wallet/BalanceCard.tsx`, `AssetList.tsx`, `RecentTransactions.tsx`.
- **Deliverables:** Server-rendered dashboard reading from `wallet_balances` and `ledger_transactions`.
- **Dependencies:** Server actions, formatters (`currency.ts`).
- **Testing Requirements:** Verification of correct decimal formatting (NGN Kobo, USDT, ETH) and privacy masking toggle.
- **Security Considerations:** Zero client-side computation of balances; data fetched strictly within authenticated user context via RLS.
- **Acceptance Criteria:** Dashboard accurately reflects database balances with sub-second page load times.
- **Blocking Conditions:** Floating-point display errors or missing loading skeletons.
- **Definition of Done:** Dashboard fully responsive and rendering real user data.

---

### Phase 09: NGN Add Money (Fiat On-Ramp)
- **Objective:** Deliver the complete NGN funding user journey via virtual bank accounts and idempotent webhook processing.
- **Prerequisites:** Phase 08 approved.
- **Scope:** `src/app/(dashboard)/add-money/page.tsx`, `src/app/api/webhooks/fiat/route.ts`, `FundingService`.
- **Deliverables:** Virtual account generation screen, live payment detection, webhook signature validator, and ledger credit stored procedure.
- **Dependencies:** `IFiatFundingAdapter`, Zod.
- **Testing Requirements:** Synthetic webhook simulation firing identical events 10 times to verify idempotency.
- **Security Considerations:** Raw body signature verification, replay protection window (300s).
- **Acceptance Criteria:** Funding flow generates valid bank details; signed webhook credits user available NGN balance and logs balancing entry to `FIAT_CLEARING`.
- **Blocking Conditions:** Inability to prevent duplicate credits on duplicate webhook delivery.
- **Definition of Done:** End-to-end NGN deposit flow operational and verified.

---

### Phase 10: EVM Receive (Crypto Inbound)
- **Objective:** Implement EVM address generation, QR code display, network warning modals, and inbound deposit confirmation tracking.
- **Prerequisites:** Phase 09 approved.
- **Scope:** `src/app/(dashboard)/receive/page.tsx`, `src/app/api/webhooks/custody/route.ts`, `CustodyService`.
- **Deliverables:** Dynamic address assignment, QR code rendering component, block confirmation tracker.
- **Dependencies:** `ICustodyWalletAdapter`, QR code generator.
- **Testing Requirements:** Simulation of unconfirmed deposit -> block confirmation threshold -> finalized ledger posting.
- **Security Considerations:** Clear network mismatch warnings; rejection of unsupported contract token deposits.
- **Acceptance Criteria:** Dedicated deposit address displays with verified copy button; confirmed deposit webhook credits user crypto balance.
- **Blocking Conditions:** Missing network warning or premature crediting before required confirmation depth.
- **Definition of Done:** Receive flow tested with simulated on-chain deposit events.

---

### Phase 11: Internal Transfers & External Withdrawals
- **Objective:** Enable instant off-chain transfers between users and external EVM crypto withdrawals.
- **Prerequisites:** Phase 10 approved.
- **Scope:** `src/app/(dashboard)/transfer/page.tsx`, internal transfer modal, external withdrawal form, two-phase reservation logic.
- **Deliverables:** User tag lookup, password confirmation modal, withdrawal broadcast worker.
- **Dependencies:** `execute_internal_transfer` RPC, EIP-55 address validator.
- **Testing Requirements:** Parallel transfer tests testing balance overdraft; invalid address rejection tests.
- **Security Considerations:** Mandatory step-up authentication (password re-entry) for withdrawals; automatic balance reservation.
- **Acceptance Criteria:** Internal transfer moves funds instantly with zero fee; external withdrawal locks funds in `USER_RESERVED` until on-chain confirmation.
- **Blocking Conditions:** Any race condition permitting transfer of unconfirmed or negative funds.
- **Definition of Done:** Both transfer modalities tested and passing concurrency tests.

---

### Phase 12: Crypto Swap (Instant RFQ Conversion)
- **Objective:** Implement the Request-For-Quote conversion engine with firm 30-second rate lock and atomic multi-asset ledger settlement.
- **Prerequisites:** Phase 11 approved.
- **Scope:** `src/app/(dashboard)/swap/page.tsx`, `SwapService`, countdown timer widget, multi-asset atomic stored procedure.
- **Deliverables:** Dynamic quote card, rate invert toggle, quote countdown timer, execution confirmation.
- **Dependencies:** `ISwapQuoteAdapter`.
- **Testing Requirements:** Stale quote execution rejection tests; multi-asset ledger balance tests ($\sum \text{Debits} = \sum \text{Credits}$ per asset scope).
- **Security Considerations:** Server-enforced expiry check; prevention of slippage exploitation.
- **Acceptance Criteria:** Swaps execute atomically or fail cleanly; expired quotes are strictly rejected.
- **Blocking Conditions:** Imbalanced multi-asset journal entries or execution after quote timeout.
- **Definition of Done:** End-to-end swap execution validated across supported pairs.

---

### Phase 13: Transaction History, Profile & Notifications
- **Objective:** Deliver comprehensive transaction filtering, receipt downloads, and user security settings.
- **Prerequisites:** Phase 12 approved.
- **Scope:** `src/app/(dashboard)/history/page.tsx`, `src/app/(dashboard)/settings/page.tsx`, transaction detail drawer, CSV export.
- **Deliverables:** Filterable history table, transaction receipt generator, active sessions manager.
- **Dependencies:** Date formatters, file-saver / CSV generator.
- **Testing Requirements:** Pagination and filter accuracy; CSV export column integrity.
- **Security Considerations:** PII masking in exports; session revocation terminates target JWT immediately.
- **Acceptance Criteria:** Users can filter, inspect full details of any past transaction, and revoke unauthorized sessions.
- **Blocking Conditions:** Inaccurate transaction timestamps or broken receipt links.
- **Definition of Done:** History, details, and security settings fully functional.

---

### Phase 14: End-to-End QA, Concurrency & Chaos Testing
- **Objective:** Subject the entire application to automated integration, concurrency, and failure-injection tests.
- **Prerequisites:** Phases 01-13 fully implemented.
- **Scope:** Playwright E2E suites, high-concurrency race condition test suites, provider timeout chaos tests.
- **Deliverables:** `tests/e2e/*`, `tests/chaos/*`, automated test reports.
- **Dependencies:** Vitest, Playwright.
- **Testing Requirements:** 100% pass rate on all financial assertion tests; simulated upstream provider outages.
- **Security Considerations:** Validate that timeouts leave ledger in clean, uncorrupted state.
- **Acceptance Criteria:** Zero ledger discrepancies under simulated load; all user journeys pass headless browser testing.
- **Blocking Conditions:** Any unhandled exception resulting in stuck user balances.
- **Definition of Done:** QA suite passes with zero defects.

---

### Phase 15: Security Audit, Compliance & Production Hardening
- **Objective:** Conduct rigorous security reviews, static analysis, penetration testing simulations, and compliance checks.
- **Prerequisites:** Phase 14 approved.
- **Scope:** Dependency vulnerability scan (`npm audit`), secret scanning (`gitleaks`), RLS verification, CSP header validation, and compliance documentation.
- **Deliverables:** Security audit report, finalized environment variable verification matrix.
- **Dependencies:** Snyk / npm audit, OWASP ZAP or equivalent scanners.
- **Testing Requirements:** Zero high or critical vulnerabilities in dependency tree.
- **Security Considerations:** Final verification of all secret redaction in logs and error responses.
- **Acceptance Criteria:** Clean security scan, documented compliance SOPs for Nigerian regulatory filings.
- **Blocking Conditions:** Any open high/critical security vulnerability.
- **Definition of Done:** Security review signed off.

---

### Phase 16: Deployment, Controlled Launch & Production Monitoring
- **Objective:** Deploy production environment to Vercel and Supabase, run live smoke tests, and enable operational telemetry.
- **Prerequisites:** Phase 15 approved, production credentials configured.
- **Scope:** Production Vercel project, Supabase production instance, domain setup, uptime monitoring, error alerting (Sentry).
- **Deliverables:** Live application URL, verified production health checks, operational runbook.
- **Dependencies:** Vercel, Supabase, domain DNS.
- **Testing Requirements:** Production smoke test with minimal test transactions (micro-deposits and withdrawals).
- **Security Considerations:** Production database credentials restricted to Vercel deployment environment; public access disabled.
- **Acceptance Criteria:** Site resolves over HTTPS, health check returns 200 OK, daily automated reconciliation job configured.
- **Blocking Conditions:** DNS or SSL errors; failing health check.
- **Definition of Done:** Controlled production launch complete.
