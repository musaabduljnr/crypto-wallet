# Funding Webhooks & On-Ramp Security Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 2 (Wallet Engine, Ledger, Funding & Crypto Receiving)  
**Date:** October 2026

---

## 1. Webhook Architecture & Threat Model

Webhooks from fiat on-ramp providers (such as Korapay) represent an external, network-facing attack surface. If unhardened, an attacker could attempt:
1. **Signature Forgery:** Transmitting fake `charge.success` events to trigger fraudulent ledger credits.
2. **Replay Attacks:** Re-sending valid historical webhooks multiple times to duplicate balance credits.
3. **Payload Tampering:** Modifying amounts or references in transit.
4. **Client-Side Spoofing:** Claiming payment success via browser redirection alone.

### Inviolable Security Rules
- **No Client-Side Authority:** Browser redirects or checkout completion callbacks are strictly treated as navigational hints, NEVER as proof of payment.
- **Cryptographic Signature Validation:** All inbound payloads must pass constant-time HMAC validation before parsing.
- **Strict Deduplication:** Inbound `event_id` is recorded in `public.webhook_events` under a unique constraint. Duplicate deliveries are acknowledged with HTTP 200 without executing secondary ledger credits.
- **Double-Entry Ledger Atomic Boundary:** Crediting occurs via `public.credit_fiat_deposit(...)` stored procedure within a single database transaction.

---

## 2. Inbound Processing Pipeline

```
Upstream Provider (Korapay)
            │
            ▼ (HTTP POST with x-korapay-signature)
src/app/api/webhooks/korapay/route.ts
            │
            ├─► 1. Verify HMAC-SHA256 signature (constant-time)
            │      └─► Reject with 401 if invalid
            │
            ├─► 2. Idempotency Check (public.webhook_events)
            │      └─► If event_id exists: Return 200 "Duplicate event ignored"
            │
            ├─► 3. Match Funding Session (public.funding_sessions)
            │      └─► Verify session exists & is in 'PENDING' status
            │
            ▼ 4. Atomic Double-Entry Ledger Posting (PostgreSQL)
  DEBIT  public.ledger_accounts (FIAT_CLEARING)
  CREDIT public.ledger_accounts (USER_AVAILABLE, NGN)
            │
            ├─► 5. Update funding_sessions status = 'SUCCESSFUL'
            ├─► 6. Write financial_audit_logs record
            │
            ▼
HTTP 200 OK Response
```

---

## 3. Webhook Payload & Signature Verification

### 3.1 Signature Algorithm
```typescript
const computedHash = crypto
  .createHmac("sha256", secretKey)
  .update(rawBody)
  .digest("hex");

const isValid = crypto.timingSafeEqual(
  Buffer.from(computedHash, "hex"),
  Buffer.from(receivedSignature, "hex")
);
```

### 3.2 Sample Verified Payload
```json
{
  "event": "charge.success",
  "event_id": "EVT_KORA_9812481023",
  "data": {
    "reference": "KORA-FUND-USER1-1729080000",
    "amount": 50000.00,
    "fee": 50.00,
    "currency": "NGN",
    "status": "success",
    "paid_at": "2026-10-16T12:30:00.000Z",
    "payer_bank": "Guaranty Trust Bank",
    "payer_name": "MUSA ABUBAKAR"
  }
}
```

---

## 4. Failure Modes & Edge Case Recovery

| Failure Scenario | Engine Behavior | Recovery Mechanism |
|:---|:---|:---|
| **Invalid Signature** | Immediate HTTP 401 Unauthorized; payload dropped; security log emitted. | Upstream provider must correct credentials. |
| **Duplicate Delivery (Replay)** | Duplicate key caught in `webhook_events`; returns HTTP 200 without ledger mutation. | None required; self-healing. |
| **Database Downtime during Webhook** | Route returns HTTP 500; transaction rolls back. | Upstream provider retries webhook exponentially (e.g. 5m, 15m, 1h). |
| **Timeout on Session Creation** | AbortSignal triggers after 10s; user receives `PROVIDER_TIMEOUT`. | User can retry without duplicate charges. |
