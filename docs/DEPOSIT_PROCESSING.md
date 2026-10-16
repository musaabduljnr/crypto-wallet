# Crypto Deposit Processing Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 2 (Wallet Engine, Ledger, Funding & Crypto Receiving)  
**Date:** October 2026

---

## 1. Overview & Architecture

Crypto deposits represent inbound transfers from external blockchains (Polygon, Arbitrum, Base, Tron, Ethereum, Solana) into the platform's institutional omnibus custody infrastructure.

To ensure solvency and accounting integrity:
1. **Persistent Address Assignment:** Each registered user receives a unique, persistent deposit address per asset and network (`public.crypto_deposit_addresses`).
2. **Re-org Protection:** Funds are never credited immediately upon block detection. A strict block confirmation depth policy must be satisfied before funds move into the user's spendable available balance.
3. **Double-Entry Settlement:** All confirmed deposits credit the user's liability account while debiting the platform's omnibus custody asset account.

---

## 2. Confirmation Depth Policies

To prevent double-spending from shallow blockchain reorganizations (re-orgs):

| Network | Native Chain ID | Confirmation Depth | Approximate Finality Time |
|:---|:---|:---|:---|
| **Polygon PoS** | 137 | **64 Blocks** | ~2.5 Minutes |
| **Arbitrum One** | 42161 | **32 Blocks** | ~1 Minute (L2 Sequencer finality) |
| **Base** | 8453 | **30 Blocks** | ~1 Minute |
| **Tron (TRC-20)**| N/A | **20 Blocks** | ~1 Minute |
| **Ethereum** | 1 | **12 Blocks** | ~2.5 Minutes (PoS Epoch Finality) |
| **Solana** | N/A | **32 Slots** | ~15 Seconds |

---

## 3. Inbound Lifecycle States

```
External Blockchain Transaction Broadcast
                     │
                     ▼
        Detected by Custody Engine
                     │
                     ▼
          [DETECTED State]
  - Saved in public.crypto_deposits
  - Displayed in UI as "Confirming (n / required)"
  - Available balance NOT modified
                     │
        Block confirmations accumulate
                     │
                     ▼ (Confirmations >= Depth)
          [CONFIRMED State]
  - Executed via public.credit_crypto_deposit(...)
  - Double Entry:
      DEBIT  CUSTODY_CLEARING (Platform Asset)
      CREDIT USER_AVAILABLE (User Liability)
  - Displayed in UI as "Confirmed & Posted"
```

---

## 4. Address Checksumming & Format Validation

All generated and user-submitted addresses pass strict algorithmic format checks prior to persistence:
- **EVM (0x + 40 Hex Characters):**
  - Regex: `^0x[a-fA-F0-9]{40}$`
- **Tron TRC-20:**
  - Starts with character `T`, length 34, Base58 alphabet: `^T[1-9A-HJ-NP-za-km-z]{33}$`
- **Solana:**
  - Length 32-44, Base58 alphabet: `^[1-9A-HJ-NP-za-km-z]{32,44}$`
