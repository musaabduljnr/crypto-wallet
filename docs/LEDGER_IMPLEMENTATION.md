# Financial Ledger Implementation Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 2 (Wallet Engine, Ledger, Funding & Crypto Receiving)  
**Date:** October 2026

---

## 1. Accounting Philosophy & Core Invariants

The application rejects mutable single-column balance updates (`UPDATE accounts SET balance = balance + x`). Instead, all financial movements are governed by an **immutable, append-only, multi-asset double-entry ledger** defined in `supabase/migrations/00002_ledger_engine.sql` and `src/lib/services/ledger.service.ts`.

### 1.1 Invariants
1. **Debit / Credit Equilibrium:** For every financial transaction, total debits equal total credits for each asset:
   $$\sum \text{Debits} = \sum \text{Credits}$$
2. **Immutable Entries:** Posted ledger entries cannot be updated or deleted. Corrections must occur via compensating journal entries.
3. **Zero Floating-Point Distortion:** Balance calculations are performed using exact decimal string scaling backed by JavaScript `BigInt` in the application service layer and PostgreSQL `NUMERIC(36, 18)` in the database.
4. **Server-Authoritative Balances:** The frontend client has zero direct write access to ledger tables. All state mutations occur through authenticated PostgreSQL stored procedures executed on the server.
5. **Non-Negative User Balances:** Check constraints (`available_balance >= 0`, `reserved_balance >= 0`) prevent overdrafts at the database engine level.

---

## 2. Chart of Accounts

```
                              ROOT LEDGER
                                   |
         +-------------------------+-------------------------+
         |                                                   |
   LIABILITIES                                            ASSETS
(What platform owes users)                         (What platform holds)
         |                                                   |
 +-------+-------+                                   +-------+-------+
 |               |                                   |               |
USER AVAILABLE  USER RESERVED                   COMMERCIAL BANK   OMNIBUS CUSTODY
(Liquid balance)(In-flight withdrawal)           (Fiat Clearing)   (On-Chain Vault)
```

| Account Type | Category | Asset Scope | Description | Normal Balance |
|:---|:---|:---|:---|:---|
| `USER_AVAILABLE` | Liability | NGN, USDT, USDC, BTC, ETH, SOL | User's spendable, unencumbered balance. | Credit |
| `USER_RESERVED` | Liability | All | Funds locked during in-flight withdrawals or pending orders. | Credit |
| `FIAT_CLEARING` | Asset (System) | NGN | Represents aggregate NGN held with commercial banking partners. | Debit |
| `CUSTODY_CLEARING` | Asset (System) | Crypto | Represents aggregate crypto held in the provider omnibus MPC vault. | Debit |
| `SWAP_CLEARING` | Equity/Contra | All | Bridge account balancing multi-asset conversion legs. | Net Zero |
| `FEE_REVENUE` | Revenue (System) | All | Platform fee earnings accrued from transfers, swaps, and withdrawals. | Credit |
| `NETWORK_EXPENSE` | Expense (System) | All | On-chain gas costs or upstream provider fees incurred by platform. | Debit |

---

## 3. Schema Structure

### 3.1 Relational Tables
- **`public.ledger_accounts`**: Holds account headers tagged with `user_id` (NULL for platform system accounts), `account_type`, and `asset_ticker`. Enforces `UNIQUE(user_id, account_type, asset_ticker)`.
- **`public.ledger_transactions`**: Journal transaction header recording `transaction_type`, `status` (`POSTED`, `FAILED`, `PENDING`), human-readable `reference_id`, `idempotency_key`, and `external_provider_ref`.
- **`public.ledger_entries`**: Atomic entry lines linking to `transaction_id` and `account_id` with `direction` (`DEBIT` or `CREDIT`) and `amount NUMERIC(36, 18) CHECK (amount > 0)`.
- **`public.wallet_balances`**: Materialized balance cache per account updated atomically in the same database transaction.

### 3.2 Concurrency Safety & Stored Procedures
- `credit_fiat_deposit(p_user_id, p_amount_ngn, p_provider_ref, p_idempotency_key, p_metadata)`:
  - Idempotency guard: checks if `idempotency_key` exists; returns existing `tx_id` if present.
  - Automatically resolves or provisions `FIAT_CLEARING` and user `USER_AVAILABLE` accounts.
  - Posts balanced journal entry: **DEBIT `FIAT_CLEARING`**, **CREDIT `USER_AVAILABLE`**.
  - Updates materialized balance cache atomically.
- `credit_crypto_deposit(p_user_id, p_asset, p_amount, p_tx_hash, p_idempotency_key, p_metadata)`:
  - Posts balanced journal entry: **DEBIT `CUSTODY_CLEARING`**, **CREDIT `USER_AVAILABLE`**.
- `reconcile_ledger_invariants()`:
  - Scans all posted transactions and returns any rows where $\sum \text{Debits} - \sum \text{Credits} \neq 0$.

---

## 4. Row Level Security & Access Control

- All ledger tables enforce PostgreSQL Row Level Security (RLS).
- Read access is strictly restricted: `auth.uid() = user_id`. Users cannot inspect balances or transactions of other platform users.
- Direct mutations from the browser are blocked with `USING (false)` on `INSERT`, `UPDATE`, and `DELETE`.
