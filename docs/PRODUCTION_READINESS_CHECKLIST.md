# Production Readiness Checklist & Gate Assessment

**Document Version:** 1.0.0  
**Target Platform:** ApexWallet (Nigeria-First Custodial Crypto Wallet)  
**Evaluator:** Principal Fintech Engineer, Application Security Reviewer, Reliability Engineer  
**Date:** October 2026  
**Overall Status:** **READY WITH EXPLICITLY LIMITED SCOPE (SANDBOX / CONTROLLED PILOT ONLY)**  

---

## 1. Executive Gate Summary

ApexWallet's software application, double-entry financial engine, and security architecture are technically sound, auditable, and fully passing automated test suites (79 / 79 tests passing across 15 test suites). 

However, in accordance with the project's strict financial safety guidelines:
> **Real-money live production operations are BLOCKED** until commercial provider contracts, enterprise API credentials, and regulatory filings are finalized. The application is authorized exclusively for controlled testnet sandbox pilots.

---

## 2. Gate Verification Matrix

| Gate # | Area | Scope | Verification Evidence | Status |
| :---: | :--- | :--- | :--- | :---: |
| **G-01** | **Financial Invariants** | Double-entry journal balance conservation ($\sum D = \sum C$) | `financial-concurrency.test.ts`, `ledger-invariants.test.ts` | **PASS** |
| **G-02** | **Negative Balances** | Available balances strictly prohibited from dropping below zero | Stored procedures check constraints, `INSUFFICIENT_FUNDS` checks | **PASS** |
| **G-03** | **Concurrency & Overspending** | Race-condition protection under concurrent debit attempts | Row locks (`FOR UPDATE`), 10-thread test passed | **PASS** |
| **G-04** | **Replay Protection** | Webhooks and client requests deduplicated via idempotency keys | Unique DB index on `idempotency_key` | **PASS** |
| **G-05** | **Two-Phase Withdrawals** | Pre-submission reservation and failure rollback | `reserve_withdrawal_funds`, `rollback_withdrawal_funds` | **PASS** |
| **G-06** | **30s RFQ Rate Lock** | Slippage-free guaranteed swap quotes with 30s TTL expiry | `swap.service.ts`, `swaps.test.ts` | **PASS** |
| **G-07** | **Multi-Asset Equilibrium** | Cross-asset swap legs balance independently via system clearing | `SWAP_CLEARING` account accounting | **PASS** |
| **G-08** | **Tenant Isolation (RLS)** | Multi-tenant data segregation preventing cross-user access | PostgreSQL Row Level Security on all tables | **PASS** |
| **G-09** | **Webhook Signatures** | Cryptographic verification of inbound provider events | HMAC-SHA256 (Korapay) & HMAC-SHA512 (Fireblocks) | **PASS** |
| **G-10** | **Logging Safety** | PII and credentials redacted from all application logs | `logger.ts` pattern matchers & `logger-safety.test.ts` | **PASS** |
| **G-11** | **Type Safety & Build** | Full TypeScript type check and Next.js production build | 0 type errors, Next.js build code 0 (20/20 routes) | **PASS** |
| **G-12** | **Commercial Provider Credentials** | Live Korapay production merchant keys & Fireblocks MPC co-signers | Blocked: Awaiting corporate onboarding approval | **BLOCKED** |
| **G-13** | **Regulatory Filings** | Nigerian SEC ARIP sandbox approval & CBN circular compliance | Blocked: Requires formal legal counsel opinion | **BLOCKED** |
| **G-14** | **External Email Delivery** | Resend / SendGrid credentials configured for transactional emails | Blocked: Outbound SMTP credentials not yet provisioned | **DEFERRED** |

---

## 3. Explicit Feature Release Status

### Tier 1: Verified in Production Architecture (Sandbox Mode)
1. **User Authentication & Session Management:** Supabase Auth with HTTP-only SameSite cookies and global session termination.
2. **NGN Virtual Account Funding:** Korapay Dynamic Virtual Account simulation with automatic credit upon verified webhook.
3. **Crypto Receive:** Multi-network persistent deposit address generation (Polygon, Arbitrum, Base, Ethereum, Tron, Solana) with block confirmation tracking.
4. **Internal Peer-to-Peer Transfers:** Zero-fee, instant atomic settlement with recipient privacy masking and self-transfer prohibition.
5. **Two-Phase Crypto Withdrawals:** Outbound withdrawal reservation, network fee estimation, and transparent sandbox broadcast.
6. **Crypto Swaps:** Real-time pricing derived from CoinGecko price feeds with guaranteed 30-second RFQ locks and dual-leg clearing.
7. **Unified Transaction History:** Direct projection of immutable double-entry ledger with search, filtering, and verified block explorer links.
8. **In-App Notification Center:** Real-time header bell with unread counters, isolation, and user preference toggles.

### Tier 2: Blocked from Live Money Operations
1. **Live NGN Bank Debits / Settlements:** Blocked until Korapay live production merchant agreement is executed.
2. **Live On-Chain MPC Signing:** Blocked until Fireblocks enterprise workspace and co-signer API users are configured.
3. **Real-Money Transfers:** Disabled until SEC ARIP compliance documentation is submitted and approved by qualified legal counsel.
