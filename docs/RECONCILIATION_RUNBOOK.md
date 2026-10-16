# Financial Reconciliation & Audit Runbook

**Document Version:** 2.0.0  
**Status:** Approved / Operational  
**Milestone:** 4 (Production Hardening & Launch Readiness)  
**Date:** October 2026  

---

## 1. Overview & Purpose

The financial reconciliation system safeguards platform solvency and accounting integrity. Its primary function is to continuously verify that:
1. Every posted double-entry journal transaction is balanced ($\sum \text{Debits} - \sum \text{Credits} = 0$ per asset).
2. The materialized balance cache (`public.wallet_balances`) exactly matches the cumulative sum of immutable `public.ledger_entries`.
3. Multi-asset swap transactions balance independently across currencies through `SWAP_CLEARING` accounts.
4. Total reserved funds (`USER_RESERVED`) exactly equal outstanding in-flight `withdrawal_requests`.
5. No duplicate provider references or transaction hashes exist across posted transactions.
6. Total on-chain omnibus vault balances exceed or equal aggregate user liabilities.

---

## 2. Automated Daily Invariant Checks

The platform executes `reconciliationService.runIntegrityAudit()` automatically at 00:00 UTC daily:

### 2.1 Invariant 1: Single-Asset Transaction Balance Equilibrium
```sql
SELECT 
    e.transaction_id,
    e.asset_ticker,
    SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE 0 END) AS total_debits,
    SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE 0 END) AS total_credits,
    SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE -e.amount END) AS discrepancy
FROM public.ledger_entries e
JOIN public.ledger_transactions t ON t.id = e.transaction_id
WHERE t.status = 'POSTED'
GROUP BY e.transaction_id, e.asset_ticker
HAVING SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE -e.amount END) != 0;
```
**Expected Result:** Zero rows returned. If any row is returned, status transitions to `RECONCILIATION_REQUIRED`.

### 2.2 Invariant 2: Materialized Cache Consistency
```sql
SELECT 
    b.account_id,
    b.user_id,
    b.asset_ticker,
    b.available_balance AS cached_balance,
    COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) AS calculated_balance,
    b.available_balance - COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) AS drift
FROM public.wallet_balances b
JOIN public.ledger_accounts a ON a.id = b.account_id
LEFT JOIN public.ledger_entries e ON e.account_id = a.id
WHERE a.account_type = 'USER_AVAILABLE'
GROUP BY b.account_id, b.user_id, b.asset_ticker, b.available_balance
HAVING b.available_balance != COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0);
```
**Expected Result:** Zero rows returned.

### 2.3 Invariant 3: Multi-Asset Swap Clearing Parity
```sql
SELECT 
    t.id AS swap_transaction_id,
    t.reference_id,
    COUNT(DISTINCT e.asset_ticker) AS distinct_assets,
    SUM(CASE WHEN a.account_type = 'SWAP_CLEARING' AND e.direction = 'CREDIT' THEN e.amount ELSE 0 END) AS clearing_received,
    SUM(CASE WHEN a.account_type = 'SWAP_CLEARING' AND e.direction = 'DEBIT' THEN e.amount ELSE 0 END) AS clearing_disbursed
FROM public.ledger_transactions t
JOIN public.ledger_entries e ON e.transaction_id = t.id
JOIN public.ledger_accounts a ON a.id = e.account_id
WHERE t.transaction_type = 'SWAP_CONVERSION' AND t.status = 'POSTED'
GROUP BY t.id, t.reference_id;
```
**Expected Result:** Every swap transaction has exactly 2 distinct currency legs, with each currency leg balancing to 0.00 delta.

### 2.4 Invariant 4: Two-Phase Reservation Integrity
```sql
SELECT 
    b.user_id,
    b.asset_ticker,
    b.reserved_balance AS ledger_reserved,
    COALESCE(w.pending_withdrawal_total, 0) AS request_reserved,
    b.reserved_balance - COALESCE(w.pending_withdrawal_total, 0) AS reservation_drift
FROM public.wallet_balances b
JOIN public.ledger_accounts a ON a.id = b.account_id AND a.account_type = 'USER_RESERVED'
LEFT JOIN (
    SELECT user_id, asset_ticker, SUM(total_debit) AS pending_withdrawal_total
    FROM public.withdrawal_requests
    WHERE status IN ('INITIATED', 'RESERVED', 'BROADCASTED')
    GROUP BY user_id, asset_ticker
) w ON w.user_id = b.user_id AND w.asset_ticker = b.asset_ticker
WHERE b.reserved_balance != COALESCE(w.pending_withdrawal_total, 0);
```
**Expected Result:** Zero rows returned. `reserved_balance` must exactly equal the sum of unfinalized withdrawal requests.

---

## 3. Incident Response & Reconciliation Protocol

If an invariant check fails or a discrepancy is detected:
1. **Automated Alerting:** High-priority incident notification dispatched to Security & Payments Engineering.
2. **Circuit Breaker:** Automatic temporary freeze on external crypto withdrawals and outbound payouts to preserve platform solvency.
3. **Forensic Audit:** Trace specific `transaction_id` and raw `ledger_entries` against upstream provider event logs.
4. **Correction via Compensating Entry:** Post a new corrective `SYSTEM_RECONCILIATION` transaction balancing the ledger. Under no circumstances should past entries be edited or deleted.
5. **Resume Operations:** After manual sign-off by Finance & Security leads, release withdrawal freeze.
