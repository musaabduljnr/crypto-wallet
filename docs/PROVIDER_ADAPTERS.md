# Provider Adapters Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 2 (Wallet Engine, Ledger, Funding & Crypto Receiving)  
**Date:** October 2026

---

## 1. Hexagonal Integration Architecture

All third-party services are integrated via hexagonal ports and adapters (`src/lib/providers/`):
- **Domain Services** depend solely on strongly-typed TypeScript interfaces (`contracts/`).
- **Vendor SDKs and HTTP APIs** live exclusively within concrete adapter classes (`adapters/`).
- **Central Registry (`registry.ts`)** provisions configured singleton instances with automatic sandbox fallback.

```
+-------------------------------------------------------+
|                 DOMAIN BUSINESS LAYER                 |
|       (FundingService, DepositService, LedgerService) |
+---------------------------+---------------------------+
                            | (Interface Calls)
                            v
+-------------------------------------------------------+
|                    PROVIDER PORTS                     |
| IFiatFundingAdapter | ICustodyWalletAdapter | IPriceFeedAdapter |
+---------------------------+---------------------------+
                            | (Concrete Implementations)
             +--------------+--------------+
             |                             |
             v                             v
+-------------------------+   +-------------------------+
|     Korapay Adapter     |   |    Custody Adapter      |
| (NGN DVA & Webhooks)    |   | (Fireblocks / Turnkey)  |
+-------------------------+   +-------------------------+
```

---

## 2. Implemented Adapters

### 2.1 Korapay Fiat Funding (`src/lib/providers/adapters/korapay.adapter.ts`)
- **Interface:** `IFiatFundingAdapter`
- **Capabilities:**
  - Dedicated virtual bank account creation (e.g. Wema Bank, Providus Bank).
  - Webhook cryptographic verification via HMAC-SHA256 (`x-korapay-signature`).
  - Timeout protection: 10-second `AbortSignal` with non-blocking error recovery.
  - Transparent sandbox mode: when `KORAPAY_SECRET_KEY` is not configured or in development, generates deterministic test virtual accounts with `isSandbox: true`.

### 2.2 Fireblocks Managed Custody (`src/lib/providers/adapters/custody.adapter.ts`)
- **Interface:** `ICustodyWalletAdapter`
- **Capabilities:**
  - Multi-chain address generation and persistence.
  - Address format verification:
    - EVM (Polygon, Arbitrum, Base, Ethereum): `^0x[a-fA-F0-9]{40}$`.
    - Tron (TRC-20): `^T[1-9A-HJ-NP-za-km-z]{33}$`.
    - Solana: Base58 string length 32-44.
  - Confirmation depth enforcement: Polygon (64), Arbitrum (32), Base (30), Ethereum (12), Tron (20).
  - Webhook cryptographic verification via HMAC-SHA512.
  - Sandbox mode: generates deterministic hash-based deposit addresses with `isSandbox: true`.

### 2.3 CoinGecko Market Price Feed (`src/lib/providers/adapters/price-feed.adapter.ts`)
- **Interface:** `IPriceFeedAdapter`
- **Capabilities:**
  - Live and baseline valuation for NGN, USDT, USDC, BTC, ETH, SOL.
  - In-memory cache with 60-second TTL to eliminate API rate limits.
  - Staleness detection: prices with timestamps exceeding 300 seconds (5 minutes) are flagged with `isStale: true` and surfaced in the UI.

---

## 3. Production Readiness & Prerequisites

To enable live mainnet financial settlement, the following credentials must be provisioned in `.env`:
1. **Korapay Production Credentials:**
   - `KORAPAY_SECRET_KEY`: Production secret key from verified Korapay Merchant Portal.
   - `KORAPAY_PUBLIC_KEY`: Production public key.
2. **Fireblocks MPC Credentials:**
   - `FIREBLOCKS_API_KEY`: API user identifier.
   - `FIREBLOCKS_SECRET_KEY`: RSA-4096 private key.
   - `FIREBLOCKS_WEBHOOK_SECRET`: Secret token for HMAC-SHA512 verification.
3. **Database Permissions:**
   - Execute migrations `00001_auth_profiles.sql` and `00002_ledger_engine.sql` in the Supabase instance.
