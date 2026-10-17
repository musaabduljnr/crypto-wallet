# Apex Crypto Wallet — Account Restrictions & Operational Locks

## 1. Principles

Frontend banners and disabled buttons are not security boundaries. In Apex Crypto Wallet, account restrictions are enforced transactionally inside backend financial execution paths. 

A restricted or suspended user cannot bypass controls by sending direct HTTP requests, invoking API endpoints, or submitting forged payloads.

---

## 2. Supported Restriction Types

| Restriction Type | Impact on Financial Operations | Applicable Scenarios |
| :--- | :--- | :--- |
| `FULL_SUSPENSION` | Blocks all financial actions: transfers, external withdrawals, swaps, fiat funding, and crypto deposits. | Confirmed account takeover, severe regulatory order, AML freeze. |
| `SIGN_IN` | Prevents token issuance or customer session creation. | Compromised credentials or requested self-exclusion. |
| `INTERNAL_TRANSFER` | Blocks internal peer-to-peer transfers to other platform customers. | Suspected fraudulent recipient or dispute investigation. |
| `EXTERNAL_WITHDRAWAL` | Blocks external blockchain payouts. All other operations remain intact. | New device cooling-off period (72h), withdrawal address anomaly. |
| `SWAP` | Prohibits instant asset conversions and quoting. | Unusual high-frequency arbitrage or price manipulation. |
| `FIAT_FUNDING` | Rejects virtual account generation and fiat checkout links. | Chargeback investigation, fiat provider risk flag. |
| `CRYPTO_DEPOSIT` | Ignores incoming blockchain deposit confirmations or routes to review. | Sanctioned wallet taint or unverified source of funds. |
| `TEMPORARY_HOLD` | Time-bound hold on specific outflows pending verification. | Verification document review or security check. |

---

## 3. Server-Side Enforcement Architecture

Restrictions are evaluated via the database stored procedure `public.check_user_active_restriction(p_user_id, p_restriction_type)`:

```sql
SELECT 1 FROM public.account_restrictions
WHERE user_id = p_user_id
  AND status = 'ACTIVE'
  AND (expires_at IS NULL OR expires_at > now())
  AND (
      restriction_type = p_restriction_type::public.restriction_type 
      OR restriction_type = 'FULL_SUSPENSION'::public.restriction_type
  );
```

### Integrated Core Services:
1. **`TransferService.executeInternalTransfer()`**: Evaluates `INTERNAL_TRANSFER`. If active, throws `ACCOUNT_RESTRICTED` (HTTP 403).
2. **`WithdrawalService.requestWithdrawal()`**: Evaluates `EXTERNAL_WITHDRAWAL`. If active, throws `ACCOUNT_RESTRICTED` (HTTP 403).
3. **`SwapService.executeSwap()`**: Evaluates `SWAP`. If active, throws `ACCOUNT_RESTRICTED` (HTTP 403).
4. **`FundingService.createFundingSession()`**: Evaluates `FIAT_FUNDING`. If active, throws `ACCOUNT_RESTRICTED` (HTTP 403).

---

## 4. Restriction Lifecycle & Lifting

- **Application:** Requires `users.restrict` permission, reason category (e.g. `SUSPECTED_FRAUD`, `SECURITY_COOLING_OFF`, `AML_INVESTIGATION`), and a mandatory internal explanation.
- **Expiration:** Can be permanent or time-bound (e.g. 72 hours). The database automatically considers expired restrictions inactive upon querying `expires_at > now()`.
- **Lifting:** Requires an authorized staff member to document the removal justification in `liftReason`. The operation updates status to `LIFTED` and records an immutable audit log.
