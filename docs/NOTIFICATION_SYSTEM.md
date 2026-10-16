# In-App Notification System Specification

## 1. Overview
The in-app notification system provides real-time, trusted transactional feedback and security alerts to users. Notifications originate strictly from authoritative server-side events, never from client requests.

---

## 2. Event Types & Triggers

| Event Type | Trigger Condition | Content Example |
| :--- | :--- | :--- |
| `FUNDING_CONFIRMED` | Korapay webhook verifies NGN bank credit | "Your wallet was credited with ₦50,000 via virtual bank transfer." |
| `DEPOSIT_DETECTED` | Custody webhook detects inbound crypto tx | "Incoming deposit of 100 USDT detected on Polygon. Waiting for 64 confirmations." |
| `DEPOSIT_CONFIRMED` | Custody confirmation depth reached | "Your deposit of 100 USDT has confirmed and is available to spend." |
| `TRANSFER_SENT` | Sender initiates internal transfer | "You sent 50.00 USDT to Musa A. Ref: TRF-8B29FA1C." |
| `TRANSFER_RECEIVED` | Recipient receives internal transfer | "You received 50.00 USDT from a verified user. Ref: TRF-8B29FA1C." |
| `WITHDRAWAL_INITIATED` | Outbound withdrawal reserved | "Withdrawal of 40 USDT on Polygon initiated." |
| `WITHDRAWAL_CONFIRMED` | Custodial provider broadcasts to mempool | "Your withdrawal of 40 USDT has been submitted to the blockchain." |
| `WITHDRAWAL_FAILED` | Provider rejects or rolls back withdrawal | "Withdrawal failed. Your reserved funds have been restored." |
| `SWAP_COMPLETED` | Double-entry swap settlement completes | "Swapped 100 USDT for ₦154,225. Ref: SWP-4C82E19D." |
| `SECURITY_ALERT` | Password change or new device session | "Security Alert: Your password was successfully updated." |

---

## 3. Invariants & Privacy Protections
1. **Strict Idempotency:** Every notification uses a unique `idempotency_key` (e.g. `notif-txf-[key]`). Webhook replays and retries cannot generate duplicate notifications.
2. **User Isolation:** Notifications table enforces Row Level Security:
   - Users can only read their own notifications (`auth.uid() = user_id`).
   - Users can only update the `is_read` status on their own notifications.
   - Client inserts are denied.
3. **Privacy Compliance:** Notifications never display raw API secrets, private keys, full credit card numbers, or unmasked sensitive bank details.
