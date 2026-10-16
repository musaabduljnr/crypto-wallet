# Security Architecture, Threat Modeling & Compliance Blueprint
## Comprehensive Defense-in-Depth for Financial Operations

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Security Architecture Principles

In a managed financial application handling both fiat currency and cryptographic digital assets, security is not a post-hoc add-on—it is the foundational constraint governing all architectural choices. The system adheres to the following core tenets:
1. **Zero Trust Network & Compute:** All network ingress is presumed hostile until authenticated, authorized, and cryptographically verified.
2. **Principle of Least Privilege (PoLP):** Clients, application servers, background workers, and database roles possess strictly the minimum capabilities necessary to fulfill their responsibilities.
3. **Defense-in-Depth:** Multiple independent security barriers ensure that if a single layer fails (e.g., frontend validation), downstream layers (middleware, server services, database RLS, and constraints) still reject malicious input.
4. **No Custodial Root Exposure:** Master private keys, omnibus seed phrases, and high-privilege custodial API keys never touch application servers, codebases, or configuration files.

---

## 2. Threat Modeling & Mitigation Matrix (STRIDE)

| Threat Vector | Attack Scenario | Architectural Mitigation | Required Test Validation | Residual Risk & Operational Control |
| :--- | :--- | :--- | :--- | :--- |
| **Broken Access Control & IDOR** | Attacker queries `/api/wallet/balances?userId=victim_id` to inspect another user's funds. | Supabase Row Level Security (RLS) enforces `user_id = auth.uid()` on all queries. Server actions derive `userId` strictly from verified JWT claims. | Automated integration tests attempting cross-tenant reads return 0 rows or HTTP 403. | Risk: Flawed RLS policy on new tables. Control: CI linter checking RLS enabled on all tables. |
| **Account Takeover (ATO) & Session Hijacking** | Attacker steals session token via XSS or script injection. | Session tokens stored exclusively in `HTTP-only`, `Secure`, `SameSite=Lax` cookies. Client JavaScript cannot access tokens. | Penetration tests verifying `document.cookie` cannot read tokens; CSP headers block unauthorized scripts. | Risk: Device compromise. Control: Mandatory re-authentication for withdrawals; session revocation dashboard. |
| **Forged or Replayed Webhooks** | Attacker replays intercepted deposit webhook or crafts fraudulent credit webhook. | Mandatory HMAC-SHA256 signature verification over raw request body with secret timing-safe comparison (`crypto.timingSafeEqual`). 5-minute timestamp replay window. | Automated test suites firing webhooks with invalid signatures and expired timestamps verify HTTP 401/400 rejection. | Risk: Compromised provider webhook secret. Control: Instant secret rotation runbook in provider dashboard. |
| **Duplicate Funding Credits** | Network latency causes provider to dispatch the same payment webhook 5 times in 10 seconds. | Inbound event ID inserted into `webhook_events` with `UNIQUE (provider, external_event_id)` within a serializable transaction. Duplicate events are silently acknowledged (HTTP 200) without executing credits. | Unit and load tests bombarding endpoint with 10 identical webhook events verify exactly one ledger credit. | Negligible. Fully mitigated at database constraint layer. |
| **Concurrent Spending / Double-Spend Attack** | User has ₦100,000 and fires two concurrent withdrawal requests simultaneously to drain ₦200,000. | PostgreSQL pessimistic row-locking (`SELECT FOR UPDATE`) on the user balance row. Second request waits, reads updated balance, and throws `ERR_INSUFFICIENT_FUNDS`. | Vitest concurrency harness executing 50 simultaneous parallel debit requests against single balance. | Zero. Database transaction isolation guarantees serialization. |
| **Swap Quote Arbitrage & Stale Quotes** | Attacker delays executing quote until market moves favorably, extracting risk-free profit. | Cryptographic quote signature containing timestamp and price; server enforces `now() <= quote.expiresAt` (max 30s) prior to execution lock. | Unit tests verifying quotes rejected at $T+31$ seconds with `ERR_QUOTE_EXPIRED`. | Minimal. 30-second window bounds market volatility. |
| **Secret Exposure & Key Leakage** | Developer accidentally commits `.env` file or logs custody API keys to production logs. | Secrets stored in Vercel Encrypted Environment Variables. Git hooks block secret patterns. Automated log scrubber removes authorization headers and API keys. | Static analysis security testing (SAST) in CI scanning for credentials (e.g. `gitleaks`). | Human error. Mitigated by strict CI checks and zero-secret commit policies. |
| **Rate-Limit Bypass & DoS** | Botnet floods registration, OTP, or password reset endpoints, exhausting provider quotas. | Upstash Redis / Vercel Edge rate limiting applied per IP and per account identity (e.g., 5 attempts per 15 min for auth). | Synthetic load test exceeding threshold verifies HTTP 429 response. | Distributed botnets. Mitigated by Cloudflare / Vercel Bot Management. |
| **Database Privilege Escalation** | Attacker exploits an injection vulnerability to modify the `ledger_entries` table directly. | Standard authenticated web roles have zero `INSERT`/`UPDATE` permissions on ledger tables. Mutations occur exclusively via security-definer RPC stored procedures with parameter binding. | SQL injection test vectors tested across all server actions. | Mitigated by parameterized queries and strict RLS. |

---

## 3. Data Protection & Cryptography

### 3.1 Encryption at Rest and in Transit
- **In Transit:** TLS 1.3 enforced across all endpoints. Strict-Transport-Security (HSTS) header configured with `max-age=63072000; includeSubDomains; preload`.
- **At Rest:** Database storage volumes encrypted via AES-256. Sensitive PII columns (e.g., phone numbers, bank account numbers) hashed or encrypted prior to storage.
- **Zero Raw Key Storage:** Seed phrases and private keys are never handled by the application. The custodial wallet provider manages MPC key shards inside secure enclaves (HSM/TEE).

### 3.2 Secure Header Specification
Next.js security headers configured in `next.config.ts`:
```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { 
    key: 'Content-Security-Policy', 
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://*.supabase.co https://*.vercel.app;" 
  }
];
```

---

## 4. Input Validation & Defense Against Tampering

1. **Zod Schema Validation:** Every Server Action and Route Handler strictly parses incoming payloads with Zod before processing. Unexpected fields are stripped, and invalid types trigger immediate validation errors.
2. **EVM Address Sanitization:** All user-supplied EVM addresses must pass regex verification (`^0x[a-fA-F0-9]{40}$`) and EIP-55 checksum validation. The zero address (`0x0000000000000000000000000000000000000000`) is rejected.
3. **Monetary Precision Validation:** User inputs are parsed directly into string base units or BigInts. Decimals beyond the asset's allowed precision (e.g., 2 decimals for NGN, 6 for USDT, 18 for ETH) are rejected at the validation layer.

---

## 5. Regulatory, Compliance & AML/CFT Framework (Nigeria Context)

> **Important Legal Disclaimer:** This section outlines technical architecture capabilities required for regulatory compliance. It does not constitute legal counsel. Formal licensing, legal opinions, and regulatory engagement must be conducted by qualified Nigerian legal and compliance professionals.

### 5.1 Regulatory Considerations in Nigeria
Operating a virtual asset platform touching Nigerian Naira and digital currencies interacts with several regulatory regimes:
- **Securities and Exchange Commission (SEC) Nigeria:** Rules on Issuance, Offering Platforms and Custody of Digital Assets (including the Accelerated Regulatory Incubation Program - ARIP).
- **Central Bank of Nigeria (CBN):** Guidelines on banking operations for Virtual Asset Service Providers (VASPs).
- **Nigeria Data Protection Act (NDPA 2023):** Mandates strict consent, lawful processing, and protection of Nigerian citizens' personal data.
- **Financial Intelligence Unit (NFIU) & AML/CFT Sanctions:** Mandatory reporting of suspicious transactions and screening against global sanctions lists (OFAC, UN).

### 5.2 Technical Capabilities Required for Compliance
1. **Tiered KYC Architecture:**
   - **Tier 1 (Entry):** Verified email, verified phone number, BVN (Bank Verification Number) / NIN (National Identity Number) resolution. Daily transaction limit: ₦50,000.
   - **Tier 2 (Standard):** Government-issued photo ID (National ID card, Driver's License, International Passport) + liveness selfie check via biometric provider. Daily limit: ₦1,000,000.
   - **Tier 3 (Enhanced):** Proof of address (utility bill < 3 months old). Higher custom limits.
2. **Sanctions & Address Screening:** External EVM withdrawal addresses can be screened against blockchain analytics providers (e.g. Chainalysis, Elliptic, TRM Labs) to reject transactions associated with sanctioned entities, mixers, or stolen funds.
3. **Audit Trail Immutability:** User activity logs, ledger transaction histories, and webhook events are preserved indefinitely for compliance auditing and suspicious activity reporting (SAR).
