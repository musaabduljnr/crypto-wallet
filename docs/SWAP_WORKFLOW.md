# Crypto Swap & Request-For-Quote (RFQ) Workflow Specification

## 1. Overview
ApexWallet's swap architecture allows users to convert between fiat (NGN) and crypto assets (USDT, USDC, BTC, ETH, SOL) with zero slippage, transparent pricing, and guaranteed 30-second rate locks.

---

## 2. RFQ Rate Lock Architecture

```
[ User Selects Assets & Amount ]
             │
             ▼
[ Server Requests Live Quotes via PriceFeedAdapter ]
             │
             ▼
[ Compute Rate & Platform Fee (0.50% / 50 bps) ]
             │
             ▼
[ Persist Swap Quote in swap_quotes (status: ACTIVE, expires_at: now + 30s) ]
             │
             ▼
[ Client Displays 30s Circular Countdown Timer ]
             ├── User Confirms within 30s ────► [ Atomic execute_swap_settlement ]
             └── Timer Hits 0s (Expired) ────► [ Quote status EXPIRED, Force Refresh ]
```

---

## 3. Double-Entry Multi-Asset Bridge Invariant

Because crypto swaps involve exchanging one currency for another (e.g. USDT for NGN), a standard single-asset double-entry transfer cannot balance. ApexWallet solves this using **System Clearing Accounts (`SWAP_CLEARING`)**.

Each leg of the transaction balances independently within its own currency scope:

### Example: User swaps 100.00 USDT for NGN (Rate: 1550 NGN/USDT, Fee: 0.50%)
- **Gross Output:** 155,000.00 NGN
- **Platform Fee (0.50%):** 775.00 NGN
- **Net Output Received:** 154,225.00 NGN

```
Journal Transaction: SWAP_CONVERSION (Ref: SWP-4C82E19D)
├── LEG 1: Source Asset (USDT)
│   ├── DEBIT  User Account [USER_AVAILABLE]       100.00 USDT (User spends USDT)
│   └── CREDIT System Account [SWAP_CLEARING]       100.00 USDT (System receives USDT)
│       Delta Leg 1 = 100.00 - 100.00 = 0.00 USDT (BALANCED)
│
└── LEG 2: Destination Asset (NGN)
    ├── DEBIT  System Account [SWAP_CLEARING]   155,000.00 NGN (System pays NGN)
    ├── CREDIT User Account [USER_AVAILABLE]    154,225.00 NGN (User receives net NGN)
    └── CREDIT System Account [FEE_REVENUE]         775.00 NGN (Platform fee revenue)
        Delta Leg 2 = 155,000.00 - (154,225.00 + 775.00) = 0.00 NGN (BALANCED)
```

---

## 4. Quote Expiry & Concurrency Protection
1. **Strict 30s TTL Enforcement:** The stored procedure and `SwapService.executeSwap` verify `now() <= expires_at`. If the system clock exceeds expiration, the quote status updates to `EXPIRED` and the transaction aborts with `ERR_QUOTE_EXPIRED`.
2. **Atomic Execution:** Leg 1 debit and Leg 2 credit occur in a single PostgreSQL database transaction. If either balance verification fails, both legs roll back cleanly.
3. **Idempotency:** Re-executing with the same `idempotency_key` returns the existing completed swap receipt without double-charging or re-crediting.
