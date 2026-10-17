# Apex Crypto Wallet — Transaction Monitoring & Forensic Investigation

## 1. Overview

The Transaction Monitoring module (`/admin/transactions` and `/admin/transactions/[transactionId]`) gives operations and compliance personnel complete transparency into every financial transaction processed by the platform.

Supported Transaction Categories:
- **`FUNDING`**: Fiat NGN deposits via Korapay checkout links and virtual accounts.
- **`WITHDRAWAL`**: External blockchain transfers across BTC, Ethereum, Polygon, Tron, and Solana.
- **`INTERNAL_TRANSFER`**: Instant peer-to-peer transfers between Apex wallet accounts.
- **`SWAP`**: Real-time cross-asset conversions with slip protection.
- **`ADJUSTMENT`**: Approved double-entry maker-checker balance adjustments.

---

## 2. Invariant: No Arbitrary Status Mutation

As required by fintech security best practices:
> *Never provide a generic button that arbitrarily changes a transaction to completed, failed, or refunded.*

State transitions must only originate from authoritative transaction execution engines, verified webhook cryptographic signatures, or documented compensating entries. The dashboard does not provide unauthenticated override toggles that bypass the ledger state machine.

---

## 3. Forensic Investigation Tools (`/admin/transactions/[transactionId]`)

When inspecting a transaction, staff are presented with:
1. **Mathematical Invariant Verification:**
   Verifies that $\sum \text{Debits} = \sum \text{Credits}$ across all underlying journal entries for the specific transaction ID.
2. **Provider & Idempotency Metadata:**
   Displays the unique idempotency key, external provider reference (e.g. Korapay reference or Fireblocks transfer ID), and execution timestamps.
3. **Double-Entry Journal Postings Breakdown:**
   Detailed breakdown of each entry: Account ID, Account Type (`USER_AVAILABLE`, `SYSTEM_ESCROW`, `SYSTEM_FEE`, `SYSTEM_RECONCILIATION`), Direction (`DEBIT` or `CREDIT`), Exact Amount, and Asset Ticker.
4. **Investigation Notes:**
   Append-only internal notes enabling forensic analysts to document provider inquiries, compliance escalations, or chargeback disputes.
