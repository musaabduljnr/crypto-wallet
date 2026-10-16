# Transaction History & Statements Specification

## 1. Overview
ApexWallet's transaction history is a direct, immutable projection of the underlying double-entry ledger (`ledger_transactions` and `ledger_entries`). Unlike traditional fintech applications that record arbitrary status strings in isolated tables, every event in ApexWallet's history is backed by cryptographic timestamps, verified journal headers, and balancing credit/debit entries.

---

## 2. Core Capabilities
- **Filtering by Transaction Type:**
  - `FIAT_FUNDING`: Virtual account NGN bank deposits
  - `CRYPTO_DEPOSIT`: Inbound on-chain custodial deposits
  - `INTERNAL_TRANSFER`: Off-chain peer-to-peer user transfers
  - `EXTERNAL_WITHDRAWAL`: Outbound blockchain withdrawals
  - `SWAP_CONVERSION`: Multi-asset RFQ conversions
- **Filtering by Asset:** Filter across NGN, USDT, USDC, BTC, ETH, and SOL.
- **Full-Text Reference & Hash Search:** Search instantly by internal reference IDs (e.g. `TRF-`, `WDL-`, `DEP-`, `SWP-`) or on-chain transaction hashes.
- **Deep Detail Modal:** Inspects journal entry directions (DEBIT/CREDIT), posted timestamps, and metadata.
- **Verified Block Explorer Links:** For all on-chain transactions with verified hashes, deep links are provided to authentic network explorers:
  - Polygon: `polygonscan.com`
  - Arbitrum: `arbiscan.io`
  - Base: `basescan.org`
  - Ethereum: `etherscan.io`
  - Tron: `tronscan.org`
  - Solana: `solscan.io`

---

## 3. Security & Tenant Isolation
1. **Row Level Security (RLS):** Client queries cannot read transactions or ledger entries belonging to other users. Every entry is restricted by `auth.uid() = account.user_id`.
2. **Immutable Entries:** The database enforces append-only semantics. Client mutation policies (`INSERT`, `UPDATE`, `DELETE`) are denied unconditionally.
