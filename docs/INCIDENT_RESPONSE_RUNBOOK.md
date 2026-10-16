# Operational Incident Response Runbook

**Document Version:** 1.0.0  
**Application:** ApexWallet  
**Scope:** On-call engineers, payments operations, infrastructure reliability  
**Date:** October 2026  

---

## 1. Severity Classifications & SLAs

| Severity Level | Definition | Response SLA | Target Resolution |
| :---: | :--- | :---: | :---: |
| **SEV-1 (Critical)** | Financial ledger imbalance, double-credit anomaly, provider downtime preventing all transactions, unauthorized access. | **< 15 minutes** | **< 2 hours** |
| **SEV-2 (High)** | Degradation of one payment channel (e.g. Korapay delayed), price feed stale, delayed webhooks. | **< 30 minutes** | **< 4 hours** |
| **SEV-3 (Medium)** | Non-blocking UI defect, individual failed withdrawal requiring manual reconciliation. | **< 2 hours** | **< 24 hours** |

---

## 2. Standard Incident Runbooks

### Runbook 1: Fiat Provider (Korapay) Downtime
- **Symptoms:** Virtual bank account generation fails with HTTP 503; users report delayed deposits.
- **Immediate Action:**
  1. Inspect Korapay API status page and internal error logs in `src/app/api/webhooks/korapay/route.ts`.
  2. If Korapay has an active outage, toggle `NEXT_PUBLIC_FIAT_FUNDING_ENABLED=false` to display a helpful notification on the `/add-money` screen ("NGN bank transfers temporarily undergoing maintenance; crypto deposits remain active").
  3. Once restored, run `ReconciliationService.reconcileFiatFunding()` to ingest all pending bank transfers that completed during the window.

### Runbook 2: Webhook Failure / Delivery Delay
- **Symptoms:** User completes transfer but ledger balance does not update within 5 minutes.
- **Immediate Action:**
  1. Query provider reference in Korapay/Fireblocks dashboard.
  2. Check `ledger_transactions` for `idempotency_key` matching the provider reference.
  3. If provider shows transaction as `SUCCESSFUL` but no ledger transaction exists, trigger manual replay via admin reconciliation CLI or API:
     ```bash
     npm run reconcile:tx -- --ref="KORA-REF-12345"
     ```
  4. Ensure duplicate protection prevents double-crediting if the original webhook delivers late.

### Runbook 3: Stuck Outbound Withdrawal (`RESERVED` Status)
- **Symptoms:** User balance shows funds in `reserved_balance`, but no on-chain `tx_hash` is visible after 30 minutes.
- **Immediate Action:**
  1. Inspect `withdrawal_requests` row where `status = 'RESERVED'`.
  2. Query Fireblocks API using `provider_operation_id`.
  3. If Fireblocks confirms the transaction was rejected:
     - Invoke stored procedure `rollback_withdrawal_funds(user_id, asset, total_debit, idempotency_key)` to return funds to `available_balance`.
     - Update withdrawal record to `FAILED`.
  4. If Fireblocks confirms the transaction is on-chain:
     - Invoke stored procedure `settle_withdrawal_funds(...)` and record the blockchain `tx_hash`.

### Runbook 4: Suspected Double Credit or Ledger Discrepancy
- **Symptoms:** Automated reconciliation cron flags non-zero delta in `ReconciliationService.verifyLedgerInvariants()`.
- **Immediate Action:**
  1. **Immediate Freeze:** Temporarily freeze outbound withdrawals for the affected account:
     ```sql
     UPDATE public.wallet_balances SET is_locked = true WHERE user_id = '<user-uuid>';
     ```
  2. Query audit ledger entries:
     ```sql
     SELECT * FROM public.ledger_entries WHERE transaction_id = '<tx-uuid>';
     ```
  3. Verify debit and credit sums. If duplicate credit occurred due to edge-case manual replay, post a compensating adjusting entry (`ADJUSTMENT_DEBIT`) to restore exact balance parity.
  4. Notify user and document incident root-cause analysis (RCA).
