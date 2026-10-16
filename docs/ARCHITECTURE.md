# System Architecture & Technical Specification
## Nigeria-First Managed Crypto Wallet Web Application

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. High-Level Architecture Overview

The application is structured as a modern, decoupled, multi-tier fintech system built with the Next.js App Router (React Server Components + Client Components), backed by Supabase (PostgreSQL with Row Level Security, Auth, and Storage), and integrated with external providers via dedicated, swappable server-side adapter interfaces.

```
+-------------------------------------------------------------------------------+
|                                CLIENT LAYER                                    |
|   Next.js App Router (React Server Components, Client Modals, Tailwind CSS)   |
+---------------------------------------+---------------------------------------+
                                        | HTTPS / Server Actions / Route Handlers
                                        v
+-------------------------------------------------------------------------------+
|                       APPLICATION & BUSINESS SERVICE LAYER                    |
|                        (Next.js Node.js Server Runtime)                       |
|                                                                               |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  | Auth & Session Svc |  |  Wallet Balance Svc  |  | Internal Transfer Svc |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  | Webhook Ingestion  |  |  Reconciliation Svc  |  |  Audit & Logging Svc  |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
+-------------------+--------------------+--------------------+-----------------+
                    |                    |                    |
                    v                    v                    v
+-----------------------+  +-----------------------+  +-------------------------+
| FIAT PAYMENT ADAPTER  |  | CUSTODY WALLET ADAPTER|  |   SWAP / LIQUIDITY      |
| (e.g., Paystack/Korapay)  (e.g., Fireblocks/Turnkey) (e.g., 0x / Uniswap / RFQ)|
+-----------------------+  +-----------------------+  +-------------------------+
                    |                    |                    |
                    +--------------------+--------------------+
                                         |
                                         v
+-------------------------------------------------------------------------------+
|                            DATA & LEDGER LAYER                                |
|           Supabase Managed PostgreSQL with Row-Level Security (RLS)           |
|                                                                               |
|  - Users & Profiles               - Supported Assets                          |
|  - Wallet Accounts                - Double-Entry Ledger Transactions          |
|  - Ledger Entries (Journal)       - Idempotency & Webhook Audit Logs          |
|  - PostgreSQL Atomic Stored Procedures / Functions                            |
+-------------------------------------------------------------------------------+
```

---

## 2. Component Boundaries & Responsibilities

### 2.1 Next.js App Router: Client vs. Server Components

To maximize security and performance, we strictly enforce the principle of least privilege between server and client execution contexts:

1. **Server Components (`app/(public)/...`, `app/(dashboard)/...`)**:
   - **Default Execution:** All pages and layouts default to React Server Components (RSC).
   - **Responsibilities:** Fetch initial data using authenticated Supabase client, enforce session checks before rendering, render static shell HTML, protect sensitive business logic.
   - **Constraint:** Never import client-side hooks (`useState`, `useEffect`, `useRouter`) or expose browser APIs.

2. **Client Components (`'use client'`)**:
   - **Responsibilities:** Interactive UI elements, form inputs, dynamic dropdowns, modal controls, clipboard copy actions, QR code rendering, real-time feedback tickers, and optimistic state updates.
   - **Constraint:** Zero access to database credentials, API secrets, or private keys. Client components invoke server operations strictly via Next.js Server Actions or dedicated REST `/api` Route Handlers.

3. **Route Handlers (`app/api/...`)**:
   - **Responsibilities:** Inbound webhooks from payment and custody providers, public health checks, streaming exports, and secure programmatic endpoints.
   - **Constraint:** Mandatory cryptographic signature verification, rate limiting, and structured logging on all incoming requests.

---

### 2.2 Server-Side Business Services

All core domain logic lives in pure, decoupled TypeScript services under `src/services/`. These services are completely agnostic of UI frameworks:

- **`AuthService`:** Manages user onboarding lifecycle, assigns default wallet accounts, and enforces multi-factor/step-up authentication for financial actions.
- **`LedgerService`:** The authoritative gatekeeper of the double-entry accounting engine. Responsible for posting balanced journal transactions, validating debit/credit parity, calculating available balances, and acquiring row-level database locks.
- **`FundingService`:** Orchestrates NGN on-ramp workflows, generates virtual accounts or checkout references, and processes inbound fiat funding webhooks idempotently.
- **`CustodyService`:** Coordinates with the managed custody provider to provision EVM deposit addresses, monitor on-chain confirmations, submit signed withdrawal payloads, and query transaction statuses.
- **`SwapService`:** Handles Request-For-Quote (RFQ) generation, quote expiration timers, slippage validation, and atomic multi-asset conversion execution.
- **`ReconciliationService`:** Periodic and event-driven background service comparing internal ledger balances against upstream provider balances and on-chain states.

---

### 2.3 Supabase Auth & Session Verification

- **Token Storage:** Supabase Auth tokens (`sb-access-token`, `sb-refresh-token`) are stored in HTTP-only, Secure, SameSite=Lax cookies, preventing access by client-side JavaScript and mitigating XSS token theft.
- **Middleware Guard (`src/middleware.ts`):**
  - Inspects every request to protected routes (`/dashboard/*`, `/settings/*`, `/transfer/*`, `/receive/*`, `/swap/*`).
  - Validates JWT signature and expiry using `@supabase/ssr`.
  - Redirects unauthenticated requests to `/auth/login` with preserved `returnUrl`.
  - Refreshes session tokens automatically in the background.
- **Server Context:** Server Actions and Route Handlers instantiate a scoped Supabase client tied to the caller's JWT, ensuring that PostgreSQL Row Level Security (RLS) is automatically enforced at the database level.

---

### 2.4 PostgreSQL Schema, Constraints & RLS Boundaries

The database architecture uses PostgreSQL 15+ hosted on Supabase:

- **Row Level Security (RLS):**
  - `user_profiles`, `wallet_accounts`: Users can only `SELECT` rows where `user_id = auth.uid()`. Mutating operations are forbidden via standard client queries; all mutations occur via security-definer RPC functions or server-side service role queries.
  - `ledger_transactions`, `ledger_entries`: Read-only `SELECT` allowed for entries matching the user's accounts. Direct `INSERT`, `UPDATE`, or `DELETE` is disallowed for standard roles.
- **Relational Integrity Constraints:**
  - Foreign key constraints with `ON DELETE RESTRICT` on all financial accounts to prevent accidental cascading deletion of transaction histories.
  - Check constraints ensuring non-negative balances on user accounts: `CHECK (available_balance >= 0)`.
  - Uniqueness constraints on idempotency keys: `UNIQUE (idempotency_key)`.
  - Uniqueness constraints on external transaction hashes: `UNIQUE (network, tx_hash)`.

---

## 3. Provider Integration & Abstraction Layer

To ensure vendor independence and prevent vendor lock-in, all external systems are accessed exclusively through TypeScript interfaces. Business services depend solely on the interface, never on provider-specific SDKs.

```
                   +------------------------+
                   |  Business Service      |
                   |  (e.g., CustodyService)|
                   +-----------+------------+
                               |
                               v
                   +------------------------+
                   |   Provider Interface   |
                   | (ICustodyWalletAdapter)|
                   +-----------+------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+-----------------------+             +-----------------------+
|  FireblocksAdapter    |             |    TurnkeyAdapter     |
| (Implements Interface)|             | (Implements Interface)|
+-----------------------+             +-----------------------+
```

### 3.1 Interface Contracts Overview
1. **`IFiatFundingAdapter` (`src/contracts/fiat-funding.adapter.ts`):**
   - `createFundingSession(params: CreateFundingParams): Promise<FundingSessionResult>`
   - `verifyWebhookSignature(rawBody: string, signature: string): boolean`
   - `parseWebhookEvent(payload: unknown): WebhookFundingEvent`
   - `queryPaymentStatus(reference: string): Promise<PaymentStatusResult>`

2. **`ICustodyWalletAdapter` (`src/contracts/custody-wallet.adapter.ts`):**
   - `generateDepositAddress(params: AddressGenParams): Promise<DepositAddressResult>`
   - `verifyAddressFormat(address: string, network: string): boolean`
   - `submitWithdrawal(params: WithdrawalParams): Promise<WithdrawalSubmissionResult>`
   - `getWithdrawalStatus(providerTxId: string): Promise<WithdrawalStatusResult>`
   - `getOmnibusBalance(asset: string): Promise<OmnibusBalanceResult>`

3. **`ISwapQuoteAdapter` (`src/contracts/swap-quote.adapter.ts`):**
   - `getExecutableQuote(params: QuoteParams): Promise<ExecutableQuoteResult>`
   - `executeQuote(quoteId: string, idempotencyKey: string): Promise<SwapExecutionResult>`

---

## 4. End-to-End Request Flows

### 4.1 Inbound NGN Funding (Add Money) Flow

```
User (Browser)         Next.js Server            Payment Provider            PostgreSQL Ledger
      |                      |                           |                           |
      |-- 1. Click Add Money->|                           |                           |
      |                      |-- 2. Create Session ----->|                           |
      |                      |<- 3. Return Virtual Acct -|                           |
      |<- 4. Display Acct ---|                           |                           |
      |                      |                           |                           |
      |====== User transfers NGN via commercial bank ====|                           |
      |                      |                           |                           |
      |                      |<- 5. POST /api/webhooks/fiat (Signed)                 |
      |                      |-- 6. Verify Signature ----|                           |
      |                      |-- 7. Acquire Idempotency Lock ----------------------->|
      |                      |-- 8. Atomic Stored Procedure: Credit User / Debit Clearing
      |                      |-- 9. 200 OK Response ----->|                           |
      |                      |-- 10. Broadcast Realtime / Update Balance ------------>|
      |<- 11. Balance Updated|                                                       |
```

### 4.2 Inbound Crypto Deposit (EVM) Flow

```
External Sender       EVM Blockchain       Custody Provider      Next.js Webhook     PostgreSQL
      |                     |                     |                     |                |
      |-- Broadcast Tx ---->|                     |                     |                |
      |                     |-- Detect Deposit -->|                     |                |
      |                     |                     |-- POST Webhook ---->|                |
      |                     |                     |   (Unconfirmed)     |-- Log Event -->|
      |                     |-- Block Depth Met ->|                     |                |
      |                     |                     |-- POST Webhook ---->|                |
      |                     |                     |   (Confirmed)       |-- Verify Sig ->|
      |                     |                     |                     |-- Atomic Post: |
      |                     |                     |                     |   User Wallet+ |
      |                     |                     |                     |   Custody Clr- |
```

### 4.3 Internal Transfer Flow (Instant Off-Chain)

```
Sender (Browser)           Next.js Server Action           PostgreSQL (Atomic RPC)
      |                              |                                |
      |-- 1. Submit Transfer ------->|                                |
      |   (Recipient, Amount, Token) |                                |
      |                              |-- 2. Verify Session & CSRF     |
      |                              |-- 3. Validate Inputs (Zod)     |
      |                              |-- 4. Call execute_internal_transfer()
      |                              |      - SELECT FOR UPDATE sender
      |                              |      - Check available_balance >= amount
      |                              |      - INSERT ledger_transaction
      |                              |      - INSERT entry: Sender DEBIT
      |                              |      - INSERT entry: Recipient CREDIT
      |                              |      - UPDATE sender balance
      |                              |      - UPDATE recipient balance
      |                              |<-- 5. Commit & Return TxID ----|
      |<- 6. Render Success Modal ---|
```

### 4.4 External Crypto Withdrawal Flow

```
User (Browser)          Next.js Server Action          PostgreSQL            Custody Provider
      |                           |                        |                         |
      |-- 1. Submit Withdrawal -->|                        |                         |
      |   (Addr, Amount, Token)   |-- 2. Validate EVM Addr |                         |
      |                           |-- 3. Reserve Balance ->|                         |
      |                           |   (Avail - Amount)     |                         |
      |                           |   (Reserved + Amount)  |                         |
      |                           |-- 4. Dispatch Async Request -------------------->|
      |                           |                        |                         |-- Broadcast on-chain
      |                           |<-- 5. Return Provider RefId ---------------------|
      |<- 6. Show "Processing" --|                        |                         |
      |                           |                        |                         |
      |                           |<- 7. Webhook: On-Chain Confirmed (tx_hash) ------|
      |                           |-- 8. Finalize Ledger ->|                         |
      |                           |   (Reserved - Amount)  |                         |
      |                           |   (CustodyClr + Amount)|                         |
```

---

## 5. Webhook Security & Idempotency Engine

In financial systems, webhooks must be treated as untrusted until verified, and duplicates are guaranteed to occur due to provider retries.

### 5.1 Verification Checklist
1. **Raw Body Preserved:** Webhook route handlers must parse the request body as raw `Buffer` or `string` before any JSON transformation to prevent signature mismatch due to whitespace changes.
2. **Signature Verification:** Compute HMAC-SHA256 of the raw body using the provider's webhook secret, and compare against the request header using timing-safe string comparison (`crypto.timingSafeEqual`).
3. **Replay Window Check:** Reject any webhook timestamp older than 300 seconds (5 minutes) to defeat replay attacks.
4. **Idempotency Locking:**
   - Store incoming provider event IDs in a dedicated table `webhook_events` with a unique constraint `UNIQUE (provider, external_event_id)`.
   - If an insert conflicts, the system immediately returns HTTP 200 (acknowledging receipt) without re-executing any ledger mutation.

---

## 6. Proposed Repository Directory Structure

```
bank-online/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, Typecheck, Vitest, Playwright
│       └── deploy.yml             # Vercel Deployment Trigger
├── docs/                          # Architectural & Technical Specifications
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── LEDGER_DESIGN.md
│   ├── PROVIDER_STRATEGY.md
│   ├── SECURITY.md
│   ├── UI_UX_SPEC.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── ENVIRONMENT_AND_DEPLOYMENT.md
│   └── ACCEPTANCE_CRITERIA.md
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Auth group (Login, Register, Recover)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   ├── layout.tsx         # Dashboard shell & navigation
│   │   │   ├── page.tsx           # Wallet overview & balances
│   │   │   ├── add-money/page.tsx # NGN Funding
│   │   │   ├── receive/page.tsx   # EVM Crypto Receive
│   │   │   ├── transfer/page.tsx  # Internal / External Transfer
│   │   │   ├── swap/page.tsx      # Crypto Swap
│   │   │   ├── history/page.tsx   # Transactions
│   │   │   └── settings/page.tsx  # User Profile & Security
│   │   ├── (public)/              # Public Marketing pages
│   │   │   └── page.tsx           # Landing page
│   │   ├── api/                   # Server Route Handlers
│   │   │   ├── health/route.ts
│   │   │   └── webhooks/
│   │   │       ├── fiat/route.ts
│   │   │       └── custody/route.ts
│   │   ├── layout.tsx             # Root HTML layout
│   │   └── globals.css            # Tailwind CSS & design tokens
│   ├── components/                # UI Components
│   │   ├── ui/                    # shadcn/ui primitives (button, dialog, etc.)
│   │   ├── layout/                # Navbar, Sidebar, Footer, MobileNav
│   │   ├── wallet/                # BalanceCard, AssetList, TxItem
│   │   └── forms/                 # TransferForm, SwapForm, AddMoneyForm
│   ├── contracts/                 # Abstract Provider Interfaces
│   │   ├── fiat-funding.adapter.ts
│   │   ├── custody-wallet.adapter.ts
│   │   └── swap-quote.adapter.ts
│   ├── providers/                 # Concrete Provider Implementations
│   │   ├── fiat/                  # e.g., MockFiatAdapter, PaystackAdapter
│   │   ├── custody/               # e.g., MockCustodyAdapter, TurnkeyAdapter
│   │   └── swap/                  # e.g., MockSwapAdapter, RFQAdapter
│   ├── services/                  # Business Logic Services
│   │   ├── auth.service.ts
│   │   ├── ledger.service.ts
│   │   ├── funding.service.ts
│   │   ├── custody.service.ts
│   │   ├── swap.service.ts
│   │   └── reconciliation.service.ts
│   ├── lib/                       # Utilities & Core Clients
│   │   ├── supabase/              # Supabase client (server, client, middleware)
│   │   ├── financial/             # BigInt / Decimal financial math helpers
│   │   ├── validation/            # Zod schemas for all forms & payloads
│   │   └── logger.ts              # Structured JSON logging
│   ├── types/                     # Shared TypeScript types
│   │   ├── database.types.ts      # Generated Supabase DB types
│   │   ├── ledger.types.ts
│   │   └── transaction.types.ts
│   └── middleware.ts              # Edge Session Auth Guard
├── supabase/
│   ├── config.toml
│   └── migrations/                # Version-controlled SQL migrations
│       ├── 00001_initial_schema.sql
│       ├── 00002_ledger_core.sql
│       ├── 00003_rls_policies.sql
│       └── 00004_stored_procedures.sql
├── tests/
│   ├── unit/                      # Vitest unit tests (Ledger, math, schemas)
│   ├── integration/               # Vitest integration tests (Supabase, adapters)
│   └── e2e/                       # Playwright browser tests
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

---

## 7. Logging, Monitoring & Observability

1. **Structured JSON Logs:** All server logs output as JSON structured payloads with standard fields: `timestamp`, `level`, `trace_id`, `user_id` (anonymized), `action`, `duration_ms`, and `context`.
2. **PII & Secret Scrubbing:** An automated log sanitizer scrubs passwords, bank account numbers, private keys, API secrets, and authorization headers before outputting to stdout.
3. **Error Reporting:** Unhandled exceptions in Route Handlers and Server Actions trigger structured error envelopes with distinct user-facing error codes (e.g., `ERR_INSUFFICIENT_FUNDS`, `ERR_RATE_EXPIRED`) rather than raw database or provider stack traces.
4. **Health Check Endpoint (`/api/health`):** Verifies database connectivity, environment variable presence, and upstream provider ping latency.
