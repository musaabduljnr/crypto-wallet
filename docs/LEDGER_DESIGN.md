# Financial Ledger & Double-Entry Accounting Engine Design
## Immutable, High-Integrity Multi-Asset Ledger Specification

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Core Accounting Philosophy & Principles

To prevent financial drift, phantom balances, race conditions, and catastrophic data loss, this application rejects single-column mutable balance updates (e.g., `UPDATE accounts SET balance = balance + x`). Instead, all financial activity is governed by an **immutable, append-only, multi-asset double-entry ledger**.

### Fundamental Ledger Invariants
1. **Debit / Credit Equilibrium (Single-Asset Balance):** For any standard transaction involving a single asset, the sum of debits must equal the sum of credits:
   $$\sum \text{Debits} = \sum \text{Credits}$$
2. **Multi-Asset Conversions (Swaps):** When exchanging Asset A for Asset B, transactions are balanced through dedicated system-clearing / conversion bridge accounts. Direct cross-asset balancing without explicit conversion journal entries is strictly prohibited.
3. **No Direct Browser Balance Mutations:** The frontend client can never mutate account balances. All state mutations occur via authenticated PostgreSQL stored procedures executed on the server.
4. **Zero Floating-Point Arithmetic:** All values are represented and stored as fixed-point integers or exact database `NUMERIC` types to eliminate binary rounding errors.
5. **No Deletion of Financial Records:** The ledger is append-only. Corrections, reversals, and refunds are posted exclusively as new compensating ledger entries.

---

## 2. Chart of Accounts & Hierarchy

The ledger maintains both **Customer Accounts** (owned by registered users) and **System Accounts** (owned by the platform) for every supported asset.

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

### 2.1 Account Types & Definitions

| Account Type | Category | Asset Scope | Description | Normal Balance |
| :--- | :--- | :--- | :--- | :--- |
| **`USER_AVAILABLE`** | Liability | NGN, USDT, ETH | User's spendable, unencumbered balance. | Credit (Platform owes user) |
| **`USER_RESERVED`** | Liability | NGN, USDT, ETH | Funds locked during pending withdrawals or active orders. | Credit (Encumbered) |
| **`FIAT_CLEARING`** | Asset (System) | NGN | Represents NGN held with the partner payment provider/bank. | Debit (Platform asset) |
| **`CUSTODY_CLEARING`** | Asset (System) | USDT, ETH | Represents aggregate crypto held in the provider omnibus wallet. | Debit (Platform asset) |
| **`SWAP_CLEARING`** | Equity/Contra (System) | All | Bridge account balancing cross-asset conversion legs. | Zero (Net balanced) |
| **`FEE_REVENUE`** | Revenue (System) | All | Platform fee earnings accrued from transfers, swaps, and withdrawals. | Credit (Earnings) |
| **`NETWORK_EXPENSE`** | Expense (System) | ETH, NGN | On-chain gas costs or upstream provider fees incurred by platform. | Debit (Costs) |

---

## 3. Data Model & Schema Specification

The ledger architecture is implemented via three primary relational tables in PostgreSQL:

### 3.1 `ledger_accounts`
Defines an account holding a specific asset balance.
```sql
CREATE TYPE account_type AS ENUM (
    'USER_AVAILABLE',
    'USER_RESERVED',
    'FIAT_CLEARING',
    'CUSTODY_CLEARING',
    'SWAP_CLEARING',
    'FEE_REVENUE',
    'NETWORK_EXPENSE'
);

CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT, -- NULL for system accounts
    account_type account_type NOT NULL,
    asset_ticker VARCHAR(10) NOT NULL, -- 'NGN', 'USDT', 'ETH'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint: A user can only have one account per type per asset
    CONSTRAINT uq_user_account_asset UNIQUE (user_id, account_type, asset_ticker)
);

CREATE INDEX idx_ledger_accounts_user ON ledger_accounts(user_id);
CREATE INDEX idx_ledger_accounts_type_asset ON ledger_accounts(account_type, asset_ticker);
```

### 3.2 `ledger_transactions`
The journal header representing a business event (Deposit, Transfer, Swap, Withdrawal).
```sql
CREATE TYPE transaction_status AS ENUM (
    'INITIATED',
    'PENDING',
    'POSTED',
    'FAILED',
    'REVERSED'
);

CREATE TYPE transaction_type AS ENUM (
    'FIAT_DEPOSIT',
    'CRYPTO_DEPOSIT',
    'INTERNAL_TRANSFER',
    'EXTERNAL_WITHDRAWAL',
    'SWAP_CONVERSION',
    'FEE_ASSESSMENT',
    'SYSTEM_RECONCILIATION'
);

CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'INITIATED',
    reference_id VARCHAR(64) NOT NULL UNIQUE, -- Human-readable reference (e.g. TX-20261016-ABCDEF)
    idempotency_key VARCHAR(128) NOT NULL UNIQUE, -- Prevents duplicate execution
    external_provider_ref VARCHAR(128), -- Provider reference / Tx Hash
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_at TIMESTAMPTZ
);

CREATE INDEX idx_ledger_tx_idempotency ON ledger_transactions(idempotency_key);
CREATE INDEX idx_ledger_tx_external_ref ON ledger_transactions(external_provider_ref);
CREATE INDEX idx_ledger_tx_status ON ledger_transactions(status);
```

### 3.3 `ledger_entries`
The atomic debit and credit lines comprising each journal transaction.
```sql
CREATE TYPE entry_direction AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    direction entry_direction NOT NULL,
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    asset_ticker VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id);
```

### 3.4 Materialized Balance Cache: `wallet_balances`
To avoid re-aggregating millions of rows on every UI query, an atomic balance cache table is maintained via database triggers or stored procedures:
```sql
CREATE TABLE wallet_balances (
    account_id UUID PRIMARY KEY REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    asset_ticker VARCHAR(10) NOT NULL,
    available_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    reserved_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
    last_entry_id UUID REFERENCES ledger_entries(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Double-Entry Journaling Scenarios

### 4.1 NGN Fiat Deposit (Add Money: ₦50,000)
User funds ₦50,000 via bank transfer. Upstream provider takes ₦50 fee; net ₦49,950 credited (or platform absorbs fee). Assuming platform credits full ₦50,000:

| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `FIAT_CLEARING` | Asset (System) | **DEBIT** | 50,000.00 | NGN |
| 2 | `USER_AVAILABLE` (User A) | Liability (User) | **CREDIT** | 50,000.00 | NGN |

*Verification:* Debits (50,000 NGN) = Credits (50,000 NGN). Platform asset increases, platform liability to user increases.

---

### 4.2 Crypto Deposit (On-Chain Inbound: 100 USDT)
User deposits 100 USDT from external EVM wallet. Confirmed after required block depth:

| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `CUSTODY_CLEARING` | Asset (System) | **DEBIT** | 100.000000 | USDT |
| 2 | `USER_AVAILABLE` (User A) | Liability (User) | **CREDIT** | 100.000000 | USDT |

*Verification:* Debits (100 USDT) = Credits (100 USDT).

---

### 4.3 Internal Transfer (User A sends ₦20,000 to User B)
Instant off-chain P2P transfer between registered users with zero fee:

| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `USER_AVAILABLE` (User A) | Liability (User A) | **DEBIT** | 20,000.00 | NGN |
| 2 | `USER_AVAILABLE` (User B) | Liability (User B) | **CREDIT** | 20,000.00 | NGN |

*Verification:* User A's liability decreases (debit); User B's liability increases (credit). Zero net liability change for the platform.

---

### 4.4 External Crypto Withdrawal (Two-Phase Execution)
User requests withdrawal of 100 USDT to external EVM address. Platform withdrawal fee: 1 USDT. Net sent on-chain: 99 USDT.

#### Phase 1: Reservation (Instant Atomic Lock)
Move 100 USDT from `USER_AVAILABLE` to `USER_RESERVED`:

| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `USER_AVAILABLE` (User A) | Liability | **DEBIT** | 100.000000 | USDT |
| 2 | `USER_RESERVED` (User A) | Liability | **CREDIT** | 100.000000 | USDT |

#### Phase 2a: Final Settlement (On-Chain Broadcast Confirmed)
When the managed custody provider confirms on-chain broadcast and settlement:

| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `USER_RESERVED` (User A) | Liability | **DEBIT** | 100.000000 | USDT |
| 2 | `CUSTODY_CLEARING` | Asset (System) | **CREDIT** | 99.000000 | USDT |
| 3 | `FEE_REVENUE` | Revenue (System) | **CREDIT** | 1.000000 | USDT |

*Verification:* Debits (100 USDT) = Credits (99 USDT + 1 USDT = 100 USDT).

#### Phase 2b: Rollback / Reversal (If On-Chain Broadcast Fails)
If custody provider rejects the request or transaction reverts on-chain:

| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `USER_RESERVED` (User A) | Liability | **DEBIT** | 100.000000 | USDT |
| 2 | `USER_AVAILABLE` (User A) | Liability | **CREDIT** | 100.000000 | USDT |

*Outcome:* Funds safely returned to user's spendable balance. No lost or dangling funds.

---

### 4.5 Multi-Asset Swap (User swaps ₦150,000 for 100 USDT)
Exchange rate: ₦1,500 / USDT. Platform fee: ₦1,500 (1 USDT equivalent). User pays ₦150,000, receives 99 USDT; platform collects 1 USDT fee:

**Leg 1: NGN Debit Leg (Total ₦150,000)**
| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `USER_AVAILABLE` (User A) | Liability | **DEBIT** | 150,000.00 | NGN |
| 2 | `SWAP_CLEARING` | Bridge (System) | **CREDIT** | 150,000.00 | NGN |

**Leg 2: USDT Credit Leg (Total 100 USDT)**
| Entry | Account Name | Account Type | Direction | Amount | Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | `SWAP_CLEARING` | Bridge (System) | **DEBIT** | 100.000000 | USDT |
| 4 | `USER_AVAILABLE` (User A) | Liability | **CREDIT** | 99.000000 | USDT |
| 5 | `FEE_REVENUE` | Revenue (System) | **CREDIT** | 1.000000 | USDT |

*Verification:*
- NGN Scope: Debit (150,000) = Credit (150,000). Balanced.
- USDT Scope: Debit (100) = Credit (99 + 1 = 100). Balanced.
- Both legs are committed within a single atomic PostgreSQL transaction.

---

## 5. Concurrency Control & Atomic Execution

To prevent **race conditions and double-spending attacks** (e.g., user rapidly submitting two concurrent withdrawal requests for their entire balance), all mutations utilize pessimistic row locking via PostgreSQL `SELECT ... FOR UPDATE`.

### Stored Procedure Blueprint: `execute_internal_transfer`
```sql
CREATE OR REPLACE FUNCTION execute_internal_transfer(
    p_sender_user_id UUID,
    p_recipient_user_id UUID,
    p_asset VARCHAR,
    p_amount NUMERIC,
    p_idempotency_key VARCHAR,
    p_reference_id VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_sender_account_id UUID;
    v_recipient_account_id UUID;
    v_current_available NUMERIC;
    v_tx_id UUID;
BEGIN
    -- 1. Check idempotency: If already executed, return existing transaction ID
    SELECT id INTO v_tx_id FROM ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    -- 2. Validate self-transfer prevention
    IF p_sender_user_id = p_recipient_user_id THEN
        RAISE EXCEPTION 'ERR_SELF_TRANSFER_PROHIBITED';
    END IF;

    -- 3. Lock sender balance row exclusively
    SELECT a.id, b.available_balance INTO v_sender_account_id, v_current_available
    FROM ledger_accounts a
    JOIN wallet_balances b ON b.account_id = a.id
    WHERE a.user_id = p_sender_user_id 
      AND a.account_type = 'USER_AVAILABLE' 
      AND a.asset_ticker = p_asset
    FOR UPDATE OF b;

    IF v_current_available IS NULL OR v_current_available < p_amount THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS';
    END IF;

    -- 4. Lock recipient account row
    SELECT a.id INTO v_recipient_account_id
    FROM ledger_accounts a
    WHERE a.user_id = p_recipient_user_id 
      AND a.account_type = 'USER_AVAILABLE' 
      AND a.asset_ticker = p_asset
    FOR UPDATE;

    IF v_recipient_account_id IS NULL THEN
        RAISE EXCEPTION 'ERR_RECIPIENT_ACCOUNT_NOT_FOUND';
    END IF;

    -- 5. Create journal transaction header
    INSERT INTO ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, posted_at
    ) VALUES (
        'INTERNAL_TRANSFER', 'POSTED', p_reference_id, p_idempotency_key, now()
    ) RETURNING id INTO v_tx_id;

    -- 6. Insert balanced double-entry lines
    INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_sender_account_id, 'DEBIT', p_amount, p_asset);

    INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_recipient_account_id, 'CREDIT', p_amount, p_asset);

    -- 7. Update materialized balances
    UPDATE wallet_balances 
    SET available_balance = available_balance - p_amount, updated_at = now()
    WHERE account_id = v_sender_account_id;

    UPDATE wallet_balances 
    SET available_balance = available_balance + p_amount, updated_at = now()
    WHERE account_id = v_recipient_account_id;

    RETURN v_tx_id;
END;
$$;
```

---

## 6. Daily Reconciliation Engine & Automated Integrity Audits

To guarantee ledger integrity against unexpected provider deviations or network forks, an automated reconciliation cron executes daily:

1. **Internal Invariant Check:**
   - Query all transactions: verify $\sum \text{Debits} - \sum \text{Credits} = 0$ per asset per transaction. Any non-zero result raises a high-priority alert.
   - Verify balance cache: for every account, $\sum \text{Entries} = \text{Materialized Balance}$.
2. **Omnibus Custody Reconciliation:**
   - Query the managed wallet provider's API for actual omnibus on-chain vault balance $B_{\text{onchain}}$.
   - Query total user liability: $L_{\text{users}} = \sum (\text{USER\_AVAILABLE} + \text{USER\_RESERVED})$.
   - Invariant: $B_{\text{onchain}} \ge L_{\text{users}}$. Any deficit represents an immediate solvency event triggering automatic withdrawal halts.
3. **Fiat Settlement Reconciliation:**
   - Query partner payment provider balance: compare against `FIAT_CLEARING` ledger account.
