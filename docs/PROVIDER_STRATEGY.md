# External Provider Integration Strategy & Adapter Contracts
## Swappable Adapter Architecture for Fiat, Custodial EVM Wallets & Swaps

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Provider Integration Strategy & Principles

In high-reliability fintech applications, tight coupling to third-party vendor SDKs introduces severe vulnerabilities: vendor API deprecations, rate limits, unexpected downtime, and vendor lock-in. 

To insulate the core business and ledger services from external instability, all integrations follow three core architectural rules:
1. **The Hexagonal / Ports & Adapters Architecture:** Business logic interacts solely with strongly typed TypeScript interfaces ("Ports"). Vendor-specific API calls and SDKs live exclusively in adapter modules ("Adapters").
2. **Deterministic Error Categorization:** Provider-specific errors (HTTP 4xx/5xx, network drops, rate limits) are normalized into standard application error categories (`PROVIDER_TIMEOUT`, `INSUFFICIENT_LIQUIDITY`, `INVALID_ADDRESS`, `RATE_LIMIT_EXCEEDED`, `UNAUTHENTICATED`).
3. **Idempotency & Defense in Depth:** Every outbound request carries a deterministic client-generated idempotency key. All inbound webhooks require cryptographic signature verification and payload deduplication.

---

## 2. Fiat Funding Provider Contract (`IFiatFundingAdapter`)

Responsible for generating NGN funding options (dedicated virtual bank accounts or checkout sessions) and processing inbound bank deposit notifications.

### 2.1 TypeScript Interface Definition
```typescript
export interface CreateFundingParams {
  userId: string;
  userEmail: string;
  userName: string;
  amountNgn: string; // Fixed-point string (e.g. "50000.00")
  idempotencyKey: string;
}

export interface VirtualAccountDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  expiresAt?: string; // ISO-8601 if dynamic
}

export interface FundingSessionResult {
  providerReference: string;
  paymentMethod: 'VIRTUAL_ACCOUNT' | 'CHECKOUT_URL';
  virtualAccount?: VirtualAccountDetails;
  checkoutUrl?: string;
  feeAmountNgn: string;
  status: 'PENDING';
}

export interface WebhookFundingPayload {
  rawBody: string;
  signature: string;
  timestampHeader?: string;
}

export interface VerifiedFundingEvent {
  externalEventId: string;
  providerReference: string;
  amountNgn: string;
  paidAt: string;
  senderBank?: string;
  senderAccountName?: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentStatusResult {
  providerReference: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  amountNgn: string;
  feeNgn: string;
  settledAt?: string;
}

export interface IFiatFundingAdapter {
  createFundingSession(params: CreateFundingParams): Promise<FundingSessionResult>;
  verifyWebhookSignature(payload: WebhookFundingPayload): boolean;
  parseFundingWebhook(payload: WebhookFundingPayload): VerifiedFundingEvent;
  queryPaymentStatus(providerReference: string): Promise<PaymentStatusResult>;
}
```

### 2.2 Retry & Failure Handling Policies
- **Outbound Timeouts:** 10-second hard timeout on session creation. On timeout, do not retry blindly; return `PROVIDER_TIMEOUT` to client.
- **Inbound Duplicate Webhooks:** Webhook handler logs event ID to PostgreSQL `webhook_events`. On duplicate primary key conflict, return HTTP 200 immediately without executing financial credits.
- **Inbound Signature Failures:** Log unauthorized attempt with IP address, immediately reject with HTTP 401, and discard payload.

---

## 3. Managed EVM Custody Wallet Provider Contract (`ICustodyWalletAdapter`)

Responsible for custodial EVM address provisioning, tracking inbound block confirmations, and broadcasting signed external withdrawal transactions.

### 3.1 TypeScript Interface Definition
```typescript
export interface GenerateAddressParams {
  userId: string;
  network: 'POLYGON' | 'ARBITRUM' | 'BASE';
  asset: 'USDT' | 'ETH';
}

export interface DepositAddressResult {
  address: string; // Checksummed 0x hex address
  network: string;
  asset: string;
  memoOrTag?: string; // Null for EVM, reserved for other architectures
}

export interface InboundDepositWebhookEvent {
  externalTxHash: string;
  toAddress: string;
  fromAddress: string;
  amount: string; // Base units (e.g. "100000000" for 100 USDT)
  asset: string;
  network: string;
  blockNumber: number;
  confirmations: number;
  status: 'DETECTED' | 'CONFIRMED'; // CONFIRMED once minimum confirmations reached
}

export interface SubmitWithdrawalParams {
  withdrawalId: string; // Internal UUID
  recipientAddress: string;
  asset: string;
  network: string;
  amount: string; // Exact units
  idempotencyKey: string;
}

export interface WithdrawalSubmissionResult {
  providerTxId: string;
  status: 'QUEUED' | 'BROADCASTED';
  estimatedGasFee: string;
}

export interface WithdrawalStatusResult {
  providerTxId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash?: string;
  blockNumber?: number;
  networkFeeDeducted?: string;
  failureReason?: string;
}

export interface ICustodyWalletAdapter {
  generateDepositAddress(params: GenerateAddressParams): Promise<DepositAddressResult>;
  validateAddress(address: string, network: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  parseDepositWebhook(rawBody: string): InboundDepositWebhookEvent;
  submitWithdrawal(params: SubmitWithdrawalParams): Promise<WithdrawalSubmissionResult>;
  getWithdrawalStatus(providerTxId: string): Promise<WithdrawalStatusResult>;
  getVaultBalance(asset: string, network: string): Promise<string>;
}
```

### 3.2 Confirmation Depth & Security Thresholds
To protect against blockchain reorganizations (re-orgs):
- **Polygon PoS:** Minimum 64 block confirmations (~2.5 minutes).
- **Arbitrum One:** Minimum 32 L2 confirmations or L1 batch finality state.
- **Base:** Minimum 30 L2 block confirmations.
- Inbound deposits only post to `USER_AVAILABLE` after reaching the `CONFIRMED` state. Prior to that, UI displays state as `Confirming (n/required)`.

---

## 4. Crypto Swap / RFQ Provider Contract (`ISwapQuoteAdapter`)

Responsible for generating firm, guaranteed Request-For-Quote (RFQ) rates and executing asset swaps.

### 4.1 TypeScript Interface Definition
```typescript
export interface GetQuoteParams {
  userId: string;
  sourceAsset: string; // e.g. "NGN" or "USDT"
  destinationAsset: string; // e.g. "USDT" or "ETH"
  sourceAmount: string; // Fixed-point string
}

export interface ExecutableQuoteResult {
  quoteId: string;
  sourceAsset: string;
  destinationAsset: string;
  sourceAmount: string;
  destinationAmount: string; // Gross received before platform fee
  netReceivedAmount: string; // Net credited to user
  platformFeeAmount: string;
  exchangeRate: string; // e.g. "1500.00" NGN/USDT
  expiresAt: string; // ISO-8601 (typically current time + 30 seconds)
}

export interface ExecuteQuoteParams {
  quoteId: string;
  userId: string;
  idempotencyKey: string;
}

export interface SwapExecutionResult {
  executionId: string;
  status: 'SUCCESS' | 'EXPIRED' | 'FAILED';
  sourceAsset: string;
  destinationAsset: string;
  sourceAmountDebited: string;
  destinationAmountCredited: string;
  settledAt: string;
  errorMessage?: string;
}

export interface ISwapQuoteAdapter {
  getQuote(params: GetQuoteParams): Promise<ExecutableQuoteResult>;
  executeQuote(params: ExecuteQuoteParams): Promise<SwapExecutionResult>;
}
```

### 4.2 Quote Expiration & Slippage Guard
1. **Fixed Validity Window:** All quotes expire strictly after 30 seconds.
2. **Server-Side Expiry Enforcement:** When the user clicks "Confirm Swap", the server checks `now() <= quote.expiresAt`. If expired, the transaction is rejected immediately with `ERR_QUOTE_EXPIRED` without debiting funds.
3. **No Unbounded Slippage:** Unlike AMMs (automated market makers) where slippage parameters can cause variable fills, the RFQ model guarantees exact output: the user receives precisely `netReceivedAmount` or the transaction aborts.

---

## 5. Candidate Provider Evaluation Criteria

The actual external providers will be formally selected prior to Phase 7. The table below outlines the evaluation criteria:

### 5.1 Nigerian Fiat Funding Candidates

| Criteria | Paystack | Monnify (TeamApt) | Korapay | Flutterwave |
| :--- | :--- | :--- | :--- | :--- |
| **Virtual Bank Accounts** | Dedicated DVA & Dynamic | Industry leader in dedicated DVA | High reliability DVA | Available |
| **Webhook Quality** | HMAC-SHA512, sub-second | Cryptographic hash, robust | HMAC signature, clean docs | Webhook retries |
| **Settlement Speed** | T+1 standard, instant payout api | Real-time settlement options | Fast settlement options | T+1 |
| **Pricing / Fees** | ~1.5% (capped at ₦2,000) | Low flat per-transfer fee | Competitive volume pricing | ~1.4% |
| **Nigeria Regulatory Standing**| CBN PSSP / Commercial licenses | CBN PSSP license | CBN PSSP / IMTO licenses | CBN PSSP license |

### 5.2 Managed EVM Custody Candidates

| Criteria | Fireblocks | Turnkey | BitGo | ZeroDev / Privy (Account Abstraction) |
| :--- | :--- | :--- | :--- | :--- |
| **Custody Model** | Institutional MPC-CMP | Developer-first Quorum MPC | Multi-sig & institutional MPC | Smart Contract / Embedded MPC |
| **API / SDK Quality** | Enterprise REST / TypeScript | Modern, high-speed API | Comprehensive REST | Web3 / Wagmi centric |
| **Policy Engine** | Granular multi-approver rules | Cryptographic policy engine | Granular spend rules | Smart contract module rules |
| **SLA & Uptime** | 99.99% Enterprise SLA | High availability cloud | Proven track record | Cloud dependent |
| **Pricing** | High monthly minimums ($$$) | Usage-based / Developer friendly | Enterprise retainers | Pay-per-active-wallet |

### 5.3 Swap / Liquidity Provider Candidates

| Criteria | 0x / Matcha API | Uniswap v3 Routing API | Institutional RFQ Desk (e.g. Wintermute/B2C2) |
| :--- | :--- | :--- | :--- |
| **Execution Model** | Aggregated DEX liquidity | Direct AMM routing | Guaranteed bilateral RFQ quotes |
| **Pricing / Slippage**| Dynamic gas + route optimization | On-chain gas overhead | Zero gas, tight institutional spread |
| **Fiat <-> Crypto** | Crypto-to-crypto only | Crypto-to-crypto only | Multi-asset including NGN liquidity |
