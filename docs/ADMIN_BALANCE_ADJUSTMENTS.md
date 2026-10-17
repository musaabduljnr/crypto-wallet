# Apex Crypto Wallet — Balance Adjustments & Maker-Checker Governance

## 1. Accounting Philosophy: Zero Direct Overwrites

Under no circumstances does the Apex Crypto Wallet platform permit direct updates to a customer balance column. All financial balance changes must adhere to the double-entry accounting principle:
$$\sum \text{Debits} = \sum \text{Credits}$$

Arbitrary insertions or floating-point overwrites violate financial audit standards. When an administrative balance adjustment is necessary (e.g. accounting correction, verified provider reconciliation discrepancy, or authorized fee compensation), it must flow through the Maker-Checker workflow.

---

## 2. Maker-Checker Dual-Control Workflow

```
[Staff Member 1: "Maker"]
       │
       │ Submits Adjustment Request
       ▼
[balance_adjustments Table] ──► Status: PENDING
       │
       │ Evaluated by Independent Staff
       ▼
[Staff Member 2: "Checker"] (Must NOT be Staff Member 1)
       │
       ├─► REJECT: Sets status = REJECTED with mandatory reason.
       │
       └─► APPROVE: Calls settle_approved_balance_adjustment(id, reviewer)
               │
               ▼
       [Atomic Double-Entry Posting via Ledger Service]
               │
               ├─► CREDIT User:
               │     DEBIT:  SYSTEM_RECONCILIATION Account
               │     CREDIT: USER_AVAILABLE Account
               │
               └─► DEBIT User:
                     DEBIT:  USER_AVAILABLE Account
                     CREDIT: SYSTEM_RECONCILIATION Account
```

---

## 3. Database Invariant Controls

In `supabase/migrations/00004_admin_dashboard.sql`:

```sql
-- 1. Table constraint prohibiting self-approval
CONSTRAINT chk_maker_checker_disjoint CHECK (
    status <> 'APPROVED' OR (requested_by <> reviewed_by)
)

-- 2. Stored procedure validation
IF v_adj.requested_by = p_reviewer_id THEN
    RAISE EXCEPTION 'ERR_MAKER_CHECKER_SELF_APPROVAL_PROHIBITED';
END IF;
```

---

## 4. Operational Form Inputs & Validation

1. **User Target:** Target UUID must exist in `user_profiles`.
2. **Supported Asset:** Must be one of `USDT`, `USDC`, `BTC`, `ETH`, `SOL`, `NGN`.
3. **Direction:** `CREDIT` (compensates/restores customer funds) or `DEBIT` (recovers unauthorized credit).
4. **Amount:** Must be positive string with exact asset decimal precision.
5. **Reason Category:** e.g. `ACCOUNTING_CORRECTION`, `PROVIDER_RECONCILIATION`, `COMPENSATION`.
6. **Justification:** Detailed explanation of the financial event and case reference.
