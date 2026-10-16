# Verification Gates & Acceptance Criteria Specification
## Measurable Test Assertions, Quality Gates & Compliance Standards

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Quality Gates & Test Verification Protocol

In accordance with institutional financial systems engineering standards:
1. **Evidence-Based Passing:** No acceptance gate or test criterion may be marked as **PASSED** without verifiable execution output (e.g., automated test run logs, cryptographic receipt, or Playwright trace).
2. **Environment Tier Classification:** Every verification requirement explicitly designates whether it is validated against:
   - **`[UNIT/LOCAL]`**: Local execution / mock harnesses.
   - **`[SANDBOX]`**: Staging environment connected to upstream provider sandboxes and testnets.
   - **`[PRODUCTION-LIVE]`**: Controlled live pilot environment with audited capital limits.

---

## 2. Core Functional & Financial Acceptance Criteria

### Gate 1: Authentication & Cross-User Authorization
- [ ] **AC-AUTH-01 `[UNIT/LOCAL]` Password Complexity:** Registration rejects passwords under 8 characters or missing uppercase, lowercase, number, or special symbol.
- [ ] **AC-AUTH-02 `[UNIT/LOCAL]` Cookie Security:** Verified session cookies (`sb-access-token`, `sb-refresh-token`) carry `HttpOnly=true`, `Secure=true`, and `SameSite=Lax`.
- [ ] **AC-AUTH-03 `[SANDBOX]` Cross-Tenant IDOR Protection:** User A sending a request with User B's `account_id` to read balance or transfer funds receives an immediate HTTP 403 or empty result. Tested via automated Vitest suite asserting database RLS rules.
- [ ] **AC-AUTH-04 `[SANDBOX]` Session Revocation:** Clicking "Log out of all other sessions" in settings invalidates all active sessions except the current caller.

### Gate 2: Ledger Balance Invariants & Precision Math
- [ ] **AC-LEDG-01 `[UNIT/LOCAL]` Zero Single-Asset Drift:** For every single-asset transaction in `ledger_transactions`, the sum of debits strictly equals the sum of credits ($\sum \text{Debits} - \sum \text{Credits} = 0$). Tested across 1,000 synthetic transactions.
- [ ] **AC-LEDG-02 `[UNIT/LOCAL]` Multi-Asset Swap Equivalence:** Multi-asset conversions balance independently within their respective asset scopes via the `SWAP_CLEARING` bridge account.
- [ ] **AC-LEDG-03 `[UNIT/LOCAL]` Zero Floating-Point Precision Loss:** Calculations involving 18-decimal tokens (ETH) and 6-decimal stablecoins (USDT) maintain exact integer precision without floating-point IEEE-754 rounding artifacts.
- [ ] **AC-LEDG-04 `[UNIT/LOCAL]` Overdraft Prevention:** Database constraint `CHECK (available_balance >= 0)` rejects any balance mutation attempting to drive a user balance below zero.

### Gate 3: Atomic Transfers & Concurrency Control
- [ ] **AC-CONC-01 `[UNIT/LOCAL]` Race Condition / Double-Spend Protection:** User has exactly ₦50,000 available. Two concurrent transfer requests of ₦50,000 are dispatched simultaneously at $T_0$. Exactly one request succeeds; the second request throws `ERR_INSUFFICIENT_FUNDS`.
- [ ] **AC-CONC-02 `[UNIT/LOCAL]` Self-Transfer Prevention:** Stored procedure immediately aborts if sender `user_id` matches recipient `user_id`.
- [ ] **AC-CONC-03 `[SANDBOX]` Atomic Rollback:** In an internal transfer, if the credit leg fails, the debit leg is automatically rolled back by PostgreSQL transaction isolation. Zero funds vanish.

### Gate 4: Webhook Security & Idempotency
- [ ] **AC-HOOK-01 `[UNIT/LOCAL]` Cryptographic Signature Verification:** Webhook endpoints reject payloads with invalid or missing HMAC signatures with HTTP 401.
- [ ] **AC-HOOK-02 `[UNIT/LOCAL]` Replay Window Check:** Webhooks with a timestamp header older than 300 seconds are rejected with HTTP 400.
- [ ] **AC-HOOK-03 `[SANDBOX]` Duplicate Webhook Deduplication:** Sending the exact same verified funding webhook 10 consecutive times results in:
  - First request: Returns HTTP 200, executes credit to user available balance.
  - Requests 2 through 10: Return HTTP 200 (acknowledged), zero additional credits posted to ledger.

### Gate 5: EVM Crypto Receive & Confirmation Depth
- [ ] **AC-REC-01 `[SANDBOX]` Address Assignment:** User requests deposit address; provider returns a valid EIP-55 checksummed EVM address matching user's account.
- [ ] **AC-REC-02 `[SANDBOX]` Confirmation Staging:** Inbound deposit with 1 confirmation shows status as `Confirming (1/64)`. Available balance remains unchanged.
- [ ] **AC-REC-03 `[SANDBOX]` Confirmation Finalization:** Upon reaching the required confirmation depth (e.g. 64 blocks), status flips to `Confirmed`, and available balance is credited.

### Gate 6: External Withdrawals & Balance Reservation
- [ ] **AC-WTH-01 `[SANDBOX]` Two-Phase Reservation:** Requesting a 100 USDT withdrawal immediately moves 100 USDT from `available_balance` to `reserved_balance`. Spendable balance is immediately 0.
- [ ] **AC-WTH-02 `[SANDBOX]` Settlement On-Chain:** Upon receiving broadcast confirmation with valid transaction hash, 100 USDT is deducted from `reserved_balance` and credited to the custody clearing account.
- [ ] **AC-WTH-03 `[SANDBOX]` Failure Rollback:** If the custody provider fails to broadcast the withdrawal, 100 USDT is safely returned from `reserved_balance` back to `available_balance`.

### Gate 7: Crypto Swaps & RFQ Expiration
- [ ] **AC-SWP-01 `[UNIT/LOCAL]` Quote Validity Window:** Quote is valid for exactly 30 seconds. Request submitted at $T+29\text{s}$ succeeds; request submitted at $T+31\text{s}$ fails with `ERR_QUOTE_EXPIRED`.
- [ ] **AC-SWP-02 `[UNIT/LOCAL]` Guaranteed Net Output:** User receives precisely the quoted net amount. Zero unannounced slippage.
- [ ] **AC-SWP-03 `[SANDBOX]` Insufficient Source Balance:** Requesting a swap exceeding available balance is rejected before quote execution.

### Gate 8: Responsive UI, Accessibility & Performance
- [ ] **AC-UI-01 `[UNIT/LOCAL]` Viewport Responsiveness:** Core layouts render cleanly without horizontal scrollbars across 360px (mobile), 768px (tablet), and 1280px+ (desktop) screens.
- [ ] **AC-UI-02 `[UNIT/LOCAL]` Contrast & Accessibility:** All text and actionable icons satisfy WCAG 2.1 AA minimum contrast ratio (4.5:1 for normal text, 3:1 for large text).
- [ ] **AC-UI-03 `[SANDBOX]` Page Load Speed:** Authenticated dashboard initial page load achieves Largest Contentful Paint (LCP) < 2.0s on standard network throttling.

### Gate 9: Operational Telemetry & Disaster Recovery
- [ ] **AC-OPS-01 `[PRODUCTION-LIVE]` Health Probe:** `/api/health` reports status `UP` with latency metrics for database and provider pings.
- [ ] **AC-OPS-02 `[SANDBOX]` Daily Invariant Audit Cron:** Automated cron job compares total user liabilities against custody omnibus balances and verifies 100% balance equilibrium.
