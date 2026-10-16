# Master Release Checklist

**Document Version:** 1.0.0  
**Application:** ApexWallet  
**Milestone:** 4 (Production Hardening & Controlled Launch)  
**Release Target:** Controlled Sandbox Pilot / Staging  
**Date:** October 2026  

---

## 1. Pre-Deployment Quality & Security Gates

- [x] **Zero TypeScript Compilation Errors:** `tsc --noEmit` verified with 0 errors.
- [x] **Full Unit & Invariant Test Suite:** 79 / 79 tests passing across 15 suites in Vitest.
- [x] **Full Production Build:** `next build` compiled all 20 routes with exit code 0.
- [x] **Financial Equilibrium Invariant:** $\sum \text{Debits} - \sum \text{Credits} = 0$ on all transactions.
- [x] **Available Balance Non-Negative Constraint:** $Available \ge 0$ enforced in stored procedures.
- [x] **Concurrency & Race Condition Defenses:** Row-level locks (`FOR UPDATE`) protect concurrent debits.
- [x] **Idempotency & Replay Protection:** Unique keys prevent duplicate webhooks or duplicate user clicks.
- [x] **Two-Phase Outbound Withdrawals:** Atomic reservation with automatic compensating rollback.
- [x] **30-Second RFQ Swaps:** Guaranteed rates with strict expiration enforcement.
- [x] **Row Level Security (RLS):** Enabled on all 8 tables; client mutations denied.
- [x] **Logging Safety:** PII, passwords, and private keys redacted by structured logger.
- [x] **Dependency Scan:** `npm audit` reviewed; 0 runtime production vulnerabilities.

---

## 2. Infrastructure & Operations Gates

- [x] **Health Check Endpoint:** `GET /api/health` returns HTTP 200 with uptime and status.
- [x] **Operational Runbooks Published:**
  - Deployment Runbook: `docs/DEPLOYMENT_RUNBOOK.md`
  - Incident Response Runbook: `docs/INCIDENT_RESPONSE_RUNBOOK.md`
  - Financial Reconciliation Runbook: `docs/RECONCILIATION_RUNBOOK.md`
- [x] **Transparent Sandbox Disclosures:** Receipts and UI explicitly badge testnet simulations.
- [x] **Known Limitations Documented:** External blockers cataloged in `docs/KNOWN_LIMITATIONS.md`.

---

## 3. Commercial & Legal Launch Gates (Hold for Real-Money Launch)

- [ ] **Commercial Agreement with Korapay:** Required for live NGN collections.
- [ ] **Enterprise Workspace with Fireblocks:** Required for live MPC signing.
- [ ] **SEC ARIP Admission:** Required for authorized Nigerian public operation.
- [ ] **External Penetration Test:** Formal third-party security audit.
- [ ] **Transactional Email Provider (Resend):** Provision live API keys for outbound email.
