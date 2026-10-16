# Product Requirements Document (PRD)
## Nigeria-First Managed Crypto Wallet Web Application (MVP)

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Product Vision & Positioning

### 1.1 Product Vision
To provide Nigerian individuals and emerging digital professionals with a secure, highly intuitive, compliant, and reliable financial bridge between the Nigerian Naira (NGN) and EVM-compatible digital assets. The platform eliminates the friction, volatility risks, and cognitive overhead typical of self-custodial wallets by offering an institutionally managed custodial experience backed by an immutable double-entry ledger.

### 1.2 Target Market: Nigeria-First Assumptions
Nigeria is one of the highest-volume cryptocurrency and peer-to-peer markets globally, driven by macroeconomic factors including currency volatility, high inflation, cross-border remittance demand, and a tech-savvy youth demographic. However, the market faces acute friction points:
1. **P2P Fraud & Scams:** High counterparty risk in informal Telegram/WhatsApp and P2P exchange desks.
2. **Bank Account Freezes:** Inconsistent bank interventions on crypto-related transaction narration.
3. **Complex Self-Custody UX:** Seed phrases and gas token management lead to catastrophic loss of funds for non-technical users.
4. **Network Fee Volatility:** Extreme gas spikes on Ethereum L1 make small retail transactions economically infeasible.

**Operating Assumptions for the MVP:**
- **Primary Base Currency:** Nigerian Naira (NGN).
- **Primary Asset Focus:** Stablecoins (e.g., USDT or USDC) and major digital assets (e.g., ETH or native network token) on low-fee EVM networks to minimize transaction friction.
- **Custody Model:** Managed custodial infrastructure. The platform owns customer relationships and internal ledgers, delegating on-chain custody and key management to an institutional provider.
- **Regulatory Caution:** Strict compliance posture aligning with the Nigerian Securities and Exchange Commission (SEC) Regulatory Incubation Program / Accelerated Regulatory Incubation Program (ARIP) guidelines, and standard AML/CFT/KYC requirements.

### 1.3 Core Value Proposition
- **Familiar Fintech Feel:** Operates like a top-tier Nigerian digital banking app (e.g., Moniepoint, Piggyvest, Kuda) with instant internal transfers, transparent NGN funding, and clear statements.
- **Zero Gas Hassle:** Users transact in target token amounts; gas fee complexities are abstracted by the platform and custodial infrastructure.
- **Instant Internal Transfers:** Zero-fee, instant off-chain transfers between registered platform users using emails, phone numbers, or platform tags.
- **Bank-Grade Financial Integrity:** Immutable double-entry ledger ensuring zero balance drift, zero floating-point calculation errors, and strict idempotency.

---

## 2. User Personas & Primary User Journeys

### 2.1 User Personas

| Persona | Demographics / Profile | Primary Goal | Pain Points |
| :--- | :--- | :--- | :--- |
| **Chidi – The Freelancer / Remote Earner** | 26, Lagos. Full-stack developer contracting for overseas clients. Receives monthly compensation in USDT. | Safely receive crypto payouts, convert what is needed to NGN for daily expenses, and keep savings in stablecoins. | P2P bank account flagging, high spread/slippage, opaque conversion fees. |
| **Amina – The Import Merchant** | 34, Kano / Abuja. Trades imported electronics and fabrics. | Pay international suppliers quickly using digital assets, funded directly with NGN profits. | Delays in bank wire transfers, FX rationing, unreliable exchange partners. |
| **Tunde – The Digital Native / Crypto Explorer** | 22, Ibadan. University graduate and digital marketer. | Hold small balances of crypto, swap between assets, and send money to friends without high gas costs. | Lost funds due to wrong network choices, complex seed phrases, transaction failures. |

---

### 2.2 Primary User Journeys

#### Journey 1: Onboarding and Wallet Provisioning
1. User visits marketing homepage and signs up with email, phone number, and strong password.
2. User verifies email address via Supabase Auth OTP/magic link.
3. Upon first successful login, the system automatically provisions internal ledger accounts (NGN, EVM assets) and issues an external EVM deposit address via the managed wallet provider.
4. User completes basic profile information and lands on the authenticated Dashboard.

#### Journey 2: Funding NGN Wallet (Add Money)
1. User clicks "Add Money" on the dashboard.
2. User selects NGN and inputs the desired funding amount (e.g., ₦50,000).
3. The platform initiates a payment session with the Nigerian payment provider (e.g., dedicated virtual bank account transfer or checkout link).
4. User transfers funds from their commercial bank app to the provided virtual account.
5. Payment provider issues a cryptographically signed webhook to the platform.
6. The platform verifies signature, checks idempotency, locks ledger, posts balancing entries, and credits the user's available NGN balance.
7. Real-time UI updates balance and marks transaction as "Successful".

#### Journey 3: Receiving Crypto (On-Chain EVM Deposit)
1. User clicks "Receive" and selects a supported asset (e.g., USDT).
2. The UI displays the user's designated EVM deposit address, a QR code, network warning alerts ("Send only USDT via [Selected EVM Network]"), and single-click copy button.
3. External sender broadcasts transaction on-chain.
4. Managed custody provider detects the deposit and dispatches webhook notifications (unconfirmed -> confirmed after reaching required block depth).
5. Platform verifies webhook authenticity, checks idempotency against the external transaction hash, records ledger credit to user wallet and debit to custody asset clearing, and notifies user.

#### Journey 4: Internal P2P Transfer (Off-Chain)
1. User clicks "Transfer", selects "Send to Platform User", and selects asset (NGN or Crypto).
2. User inputs recipient email/tag and amount.
3. System verifies recipient existence, checks available sender balance, and displays confirmation modal with recipient name and zero transfer fees.
4. User confirms transaction.
5. Atomic database transaction deducts sender available balance and credits recipient available balance in a single atomic double-entry transaction.
6. Both users receive transaction notifications and updated balance statements.

#### Journey 5: Instant Crypto Swap (NGN <-> Crypto or Crypto <-> Crypto)
1. User navigates to "Swap".
2. User selects Source Asset (e.g., NGN) and Target Asset (e.g., USDT) and enters source amount.
3. System requests a firm, time-limited executable quote from the swap adapter.
4. UI presents a countdown timer (e.g., 30 seconds), exchange rate, platform fee, and guaranteed output amount.
5. User confirms swap before countdown expires.
6. System locks rate, validates source balance, atomically executes double-entry swap ledger transaction, and updates both asset balances immediately.

#### Journey 6: External Crypto Withdrawal
1. User clicks "Transfer" -> "External Wallet".
2. User selects asset, enters external EVM address, and specifies withdrawal amount.
3. System validates address format (checksummed EVM hex), ensures withdrawal amount meets minimums and does not exceed user's available balance minus withdrawal network fee.
4. User confirms via two-factor/password confirmation.
5. System moves funds from "Available" to "Reserved" on the internal ledger.
6. Backend dispatches withdrawal instruction to the managed custody provider with a unique idempotency key.
7. Provider broadcasts transaction and returns provider transaction ID.
8. Upon on-chain confirmation webhook from custody provider, system finalizes transaction by moving reserved funds to the custody clearing account. If failed, system rolls back reserved funds back to available balance.

---

## 3. Detailed Functional Requirements

### 3.1 Public Marketing Homepage
- **FR-MKT-01:** High-conversion, mobile-responsive landing page presenting the core value proposition, security highlights, supported assets, and clear CTAs ("Get Started", "Sign In").
- **FR-MKT-02:** Live market pricing banner or ticker displaying indicative conversion rates for supported pairs.
- **FR-MKT-03:** FAQ section addressing custody model, security, deposit times, and regulatory stance.
- **FR-MKT-04:** Footer with terms of service, privacy policy, risk disclaimers, and support contact channels.

### 3.2 Authentication & Profile Management
- **FR-AUTH-01:** User registration using valid email address and password conforming to strong password policies (min 8 characters, uppercase, lowercase, number, special symbol).
- **FR-AUTH-02:** Secure session issuance and refresh via Supabase Auth with HTTP-only, Secure, SameSite cookies.
- **FR-AUTH-03:** Password recovery workflow via email verification link with rate limiting.
- **FR-AUTH-04:** User profile data management (First Name, Last Name, Phone Number, Residential Address, State of Residence in Nigeria).
- **FR-AUTH-05:** Security center: Session management (active sessions list, revoke other sessions), password modification, and activity log.

### 3.3 Wallet Dashboard & Portfolio
- **FR-DASH-01:** Portfolio overview displaying aggregate net worth denominated in NGN (with optional USD display toggle).
- **FR-DASH-02:** Quick action tray: Add Money, Receive, Transfer, Swap.
- **FR-DASH-03:** Asset breakdown list showing for each supported asset: Asset Name, Ticker, Icon, Available Balance, Reserved/Pending Balance, Fiat Equivalent Value, and 24h change.
- **FR-DASH-04:** Privacy toggle allowing users to mask balances on screen (e.g., `••••••`).
- **FR-DASH-05:** Recent activity feed displaying the 5 most recent transactions with status indicators, timestamp, asset amount, and counterparty/type.

### 3.4 Add Money (Fiat NGN Funding)
- **FR-FUND-01:** Support NGN funding through verified Nigerian payment infrastructure (e.g., dynamic virtual bank account or hosted payment checkout).
- **FR-FUND-02:** Clear payment instructions displaying Bank Name, Account Number, Account Name, and Expiry Window for dynamic accounts.
- **FR-FUND-03:** Enforce minimum funding limit (e.g., ₦1,000) and maximum single-transaction limit.
- **FR-FUND-04:** Idempotent webhook processing ensuring a payment reference can only credit an account exactly once.

### 3.5 Receive Crypto (EVM Inbound Deposit)
- **FR-REC-01:** Dynamic or pre-allocated dedicated EVM deposit address retrieved from the managed wallet provider.
- **FR-REC-02:** High-contrast QR code display with one-tap clipboard copy for the address.
- **FR-REC-03:** Prominent network compatibility warning specifying the exact EVM network (e.g., Arbitrum One, Polygon, or Base) and contract address for tokens.
- **FR-REC-04:** Multistage deposit tracking: Detected (0 confirmations) -> Confirming (n/required confirmations) -> Credited (Finalized).

### 3.6 Internal Transfers
- **FR-XFER-01:** Transfer funds between registered platform users using recipient email or unique username tag.
- **FR-XFER-02:** Recipient validation step displaying recipient name before final submission to prevent erroneous transfers.
- **FR-XFER-03:** Instant atomic settlement on the internal ledger with zero network fee.
- **FR-XFER-04:** Optional user note / payment description attached to the transfer.

### 3.7 External Crypto Withdrawals
- **FR-WTH-01:** Withdraw supported crypto assets to any external EVM address.
- **FR-WTH-02:** Client-side and server-side EVM address validation (EIP-55 checksum validation, rejection of null or contract creation addresses if unsupported).
- **FR-WTH-03:** Dynamic network fee estimation or flat provider withdrawal fee clearly disclosed prior to authorization.
- **FR-WTH-04:** Two-phase execution: Immediate internal ledger balance reservation followed by asynchronous custodial dispatch.
- **FR-WTH-05:** Real-time status tracking with direct link to public EVM block explorer using transaction hash upon broadcast.

### 3.8 Asset Swaps
- **FR-SWP-01:** Support conversion between NGN and supported crypto assets, and between crypto pairs.
- **FR-SWP-02:** RFQ (Request-for-Quote) engine providing guaranteed exchange rate valid for 30 seconds.
- **FR-SWP-03:** Transparent fee schedule showing platform spread/fee, inverse rate, and minimum received amount.
- **FR-SWP-04:** Atomic ledger settlement debiting source asset and crediting destination asset without balance drift.

### 3.9 Transaction History & Details
- **FR-TX-01:** Comprehensive transaction history with filtering by transaction type (Deposit, Withdrawal, Transfer In, Transfer Out, Swap), asset, date range, and status.
- **FR-TX-02:** Dedicated transaction detail modal/page showing: Transaction Reference ID, Date & Time, Type, Status, Asset Amount, Fiat Value at time of transaction, Fee, Sender/Recipient or External Hash, and Explorer link.
- **FR-TX-03:** Downloadable PDF or CSV statement generation for user accounting and tax compliance.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Security
- **NFR-SEC-01:** All client-to-server and server-to-external communication must strictly enforce TLS 1.3.
- **NFR-SEC-02:** Zero storage of private keys, seed phrases, or custodial root credentials in platform databases or environment variables.
- **NFR-SEC-03:** Database Row Level Security (RLS) enabled on all tables, ensuring users can never query or mutate another user's records directly.
- **NFR-SEC-04:** All financial mutations (debits, credits, transfers) must be executed solely through server-side authenticated RPC functions or protected services with atomic transaction boundaries.
- **NFR-SEC-05:** Webhook endpoints must verify cryptographic signatures (HMAC-SHA256 or asymmetric signatures) before processing payloads.
- **NFR-SEC-06:** Rate limiting applied to authentication endpoints (max 5 failed attempts per 15 min per IP/email) and financial endpoints (max 10 requests per min per user).

### 4.2 Reliability & Data Integrity
- **NFR-REL-01:** Financial ledger must follow strict double-entry principles; the sum of debits must equal the sum of credits for every transaction.
- **NFR-REL-02:** Idempotency keys required on all state-changing financial API requests to prevent double-spending or duplicate processing.
- **NFR-REL-03:** Zero floating-point math: All monetary values stored and computed as signed/unsigned arbitrary-precision integers or decimals (`numeric(36, 18)` for crypto, `numeric(20, 2)` for fiat).
- **NFR-REL-04:** System availability target of 99.9% uptime (excluding scheduled upstream provider maintenance).

### 4.3 Performance
- **NFR-PERF-01:** Server-rendered dashboard initial load < 1.5 seconds on standard Nigerian 4G mobile connections.
- **NFR-PERF-02:** Internal transfer execution latency < 500ms end-to-end.
- **NFR-PERF-03:** Swap quote generation latency < 800ms.

### 4.4 Accessibility & UX Responsiveness
- **NFR-ACC-01:** Fully responsive interface optimized for mobile viewport widths (360px to 430px) as well as tablet and desktop viewports.
- **NFR-ACC-02:** Adherence to WCAG 2.1 Level AA standards for color contrast, touch target sizes (minimum 44x44px), and keyboard navigation.

---

## 5. Supported Asset & Network Selection Criteria

### 5.1 Initial Network Selection: EVM Compatible
To minimize end-user costs while maintaining broad ecosystem liquidity and institutional custodial provider support, the initial network must satisfy:
1. **Low Transaction Fees:** Average transaction cost < $0.05 per transfer.
2. **Fast Finality:** Block confirmation time < 5 seconds.
3. **Institutional Custody Support:** Supported natively by providers such as Fireblocks, BitGo, Turnkey, or Privy.
4. **Stablecoin Liquidity:** Deep native liquidity for USDT and USDC.

**Candidate Networks Evaluated:**
- **Polygon PoS (MATIC/POL):** High retail familiarity in Nigeria, low gas fees, ubiquitous provider support.
- **Arbitrum One (L2):** High security inheritance from Ethereum L1, growing adoption, low fees.
- **Base (Coinbase L2):** Very low fees, rapid developer adoption, backed by Coinbase ecosystem.

*Status: Open Decision (Section 11) to finalize between Polygon, Arbitrum One, or Base.*

### 5.2 Initial Asset Scope
1. **NGN (Nigerian Naira):** Platform base fiat asset for on/off-ramp operations.
2. **USDT (Tether USD):** Primary digital dollar stablecoin heavily demanded in the Nigerian market.
3. **ETH (or Native EVM Token):** Gas and utility asset for the selected EVM chain.

---

## 6. Financial Precision & Unit Standard

| Asset | Precision (Decimals) | Smallest Unit | Base Unit Conversion Factor | Database Storage Type |
| :--- | :--- | :--- | :--- | :--- |
| **NGN** | 2 | Kobo | $1\text{ NGN} = 100\text{ Kobo}$ | `numeric(20, 2)` or `bigint` (kobo) |
| **USDT** (EVM) | 6 | Micro-USDT | $1\text{ USDT} = 10^6\text{ units}$ | `numeric(24, 6)` or `numeric(36, 18)` |
| **USDC** (EVM) | 6 | Micro-USDC | $1\text{ USDC} = 10^6\text{ units}$ | `numeric(24, 6)` or `numeric(36, 18)` |
| **ETH** (EVM) | 18 | Wei | $1\text{ ETH} = 10^{18}\text{ Wei}$ | `numeric(36, 18)` |

**Rule:** In the application code, monetary calculations must use integer base units (BigInt) or arbitrary precision decimal libraries (`decimal.js` / `bignumber.js`). **Never use native JavaScript `Number` for financial calculations.**

---

## 7. Transaction Status & Lifecycle Definitions

Every transaction across the platform moves through a deterministic state machine:

```
[INITIATED] ---> [PENDING / PROCESSING] ---> [CONFIRMED / SUCCESS]
                       |
                       +-------------------> [FAILED / REJECTED]
                       |
                       +-------------------> [CANCELLED / EXPIRED]
```

- **`INITIATED`:** Intent created, session or quote generated, awaiting user action or provider dispatch.
- **`PENDING`:** Funds reserved, payment awaiting bank confirmation, or transaction broadcast to the blockchain awaiting required block confirmations.
- **`CONFIRMED` / `SUCCESS`:** Funds fully settled, balancing ledger entries permanently posted, balances available for spending.
- **`FAILED`:** Upstream provider rejection, invalid bank account, insufficient gas, or on-chain revert. Reserved funds are unlocked back to available balance via compensating ledger entry.
- **`CANCELLED` / `EXPIRED`:** User abandoned session or swap quote expired before execution.

---

## 8. Fee Model & Limits

| Operation | Minimum Limit | Maximum Limit (Per Tx) | Platform Fee Structure | Network / Provider Pass-through Fee |
| :--- | :--- | :--- | :--- | :--- |
| **NGN Add Money** | ₦1,000 | ₦2,000,000 (Tier 1) | Free (Promotional) or Flat ₦50 | Incurred by platform or absorbed |
| **EVM Crypto Deposit**| $5.00 equivalent | Unlimited | 0.00% | Paid by external sender on-chain |
| **Internal Transfer** | ₦500 / $1.00 | ₦1,000,000 / $1,000 | 0.00% (Instant Free Off-chain) | None |
| **Crypto Swap** | $5.00 equivalent | $5,000 equivalent | 0.50% - 1.00% embedded spread | Dynamic liquidity provider spread |
| **Crypto Withdrawal** | $10.00 equivalent | $5,000 equivalent | Flat $1.00 platform processing | Estimated on-chain gas fee |

*Note: Limits and fee percentages are subject to operational policy adjustments and provider agreements.*

---

## 9. Explicit MVP Exclusions
To maintain strict architectural discipline and ensure a rock-solid, production-grade foundation, the following are explicitly out of scope for the MVP:
1. **Self-Custodial Key Management:** No user-held seed phrases or private keys.
2. **Non-EVM Blockchains:** No Bitcoin (UTXO), Solana (SVM), Tron (TRC-20), or TON networks in MVP.
3. **P2P Escrow / Peer-to-Peer Order Books:** No peer-to-peer chat trading or user-to-user dispute mediation.
4. **Crypto Staking / Yield Generation / Lending:** No interest-bearing or DeFi yield mechanisms.
5. **Physical / Virtual Debit Cards:** No card issuing integration in this phase.
6. **Merchant Payment APIs / SDKs:** No external checkout widgets or third-party merchant integration.

---

## 10. Success Metrics & Launch Acceptance Criteria

### 10.1 Key Performance Indicators (KPIs)
- **Zero Balance Discrepancy:** 100% daily ledger balancing with zero unresolved variances between internal user balances and omnibus custody balances.
- **Deposit Speed:** Inbound NGN deposits credited within 60 seconds of bank transfer completion.
- **Transfer Latency:** Internal transfers executed in under 1 second.
- **Withdrawal Processing:** External crypto withdrawals dispatched to the mempool within 120 seconds of user confirmation.
- **Crash-Free Sessions:** > 99.5% crash-free user sessions.

### 10.2 Phase 1 Exit Criteria
- Complete architectural specification approved covering PRD, Architecture, Ledger Design, Provider Strategy, Security, UI/UX, Implementation Plan, Environment & Deployment, and Acceptance Criteria.
- All documents cross-referenced and aligned on tech stack and boundaries.
- No code written until Phase 2 design system and screen specs are formally approved.

---

## 11. Unresolved Product Decisions & External Dependencies

The following decisions require explicit stakeholder sign-off:

1. **Selection of Primary EVM Network:**
   - *Option A:* **Polygon PoS** (mature, broad retail recognition in Nigeria).
   - *Option B:* **Arbitrum One** (low fees, Ethereum L2 security).
   - *Option C:* **Base** (fastest growing, low fees, backing from Coinbase).
2. **Selection of Nigerian Fiat Funding Provider:**
   - Candidates: Monnify (TeamApt/Moniepoint), Paystack, Flutterwave, or Korapay.
3. **Selection of Managed Custodial Infrastructure Partner:**
   - Candidates: Fireblocks, BitGo, Turnkey, or ZeroDev/Privy.
4. **KYC Verification Tiers & Provider:**
   - Tier 1 (BVN / NIN verification + phone number) vs Tier 2 (Government ID + proof of address).
   - Candidates: Smile ID, Dojah, or Prembly (Identitypass).
