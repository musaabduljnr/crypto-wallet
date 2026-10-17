# Apex Crypto Wallet — Administrative Operations Runbook

## 1. Daily Operations & Morning Health Checks

Every operational shift begins with reviewing the Administrative Operations Center (`/admin/operations`):
1. **Verify Provider Connectivity:**
   - Confirm Korapay Gateway is `ONLINE` and webhook signature checks are healthy.
   - Confirm Custodial MPC Vault status is `ONLINE` and cluster signing response times are within normal parameters.
   - Confirm Price Oracle Feed latency is $< 150\text{ms}$ with active streaming.
2. **Execute Ledger Reconciliation Integrity Check:**
   - Click "Run Integrity Check" on `/admin/operations`.
   - Verify the audit reports `HEALTHY & BALANCED`.
   - Invariant: Unbalanced Transactions count **must be 0**.
   - Invariant: Duplicate Provider References count **must be 0**.
3. **Inspect Operational Backlog:**
   - Review pending external withdrawal queue.
   - Review pending maker-checker balance adjustments.

---

## 2. Maker-Checker Balance Adjustment Workflow

When an accounting correction or customer compensation is required:
1. **Initiation (Maker):**
   - Authorized staff (`balances.adjust.request`) navigates to the customer profile `/admin/users/[userId]`.
   - Clicks "Request Balance Adjustment", inputs Asset, Direction (`CREDIT`/`DEBIT`), Exact Amount, Reason, and Justification.
   - Request is saved with status `PENDING`.
2. **Independent Review (Checker):**
   - Independent authorized staff (`balances.adjust.approve`) opens `/admin/balance-adjustments`.
   - Inspects the request details and justification.
   - If the reviewer is the same staff member who requested the adjustment, the system strictly disables approval and warns: *"Self-Approval Prohibited"*.
   - Upon independent approval, the backend executes `settle_approved_balance_adjustment`, posting double-entry entries atomically against `SYSTEM_RECONCILIATION`.
   - If rejected, a rejection reason must be recorded.

---

## 3. Account Restrictions & High-Risk Quarantine

When a security incident or risk flag occurs (e.g. sign-in from suspicious IP subnet or chargeback inquiry):
1. **Applying Restriction:**
   - Open `/admin/users/[userId]`.
   - Click "Apply Account Restriction".
   - Select restriction type (e.g. `EXTERNAL_WITHDRAWAL` for 72h hold or `FULL_SUSPENSION` for critical freeze).
   - Enter reason category and internal justification.
   - Confirm application. The change immediately takes effect across backend services (`TransferService`, `WithdrawalService`, `SwapService`, `FundingService`).
2. **Lifting Restriction:**
   - Navigate to `/admin/restrictions` or the user detail page.
   - Click "Lift", enter verified forensic reason, and confirm.

---

## 4. Emergency Procedures

### 4.1 Activating Platform Maintenance Mode
If an upstream provider outage or systemic risk occurs:
1. Navigate to `/admin/settings`.
2. Toggle "Maintenance Status" to active and enter a public explanation.
3. Click "Save Maintenance". Customer trading, funding, and withdrawals are held in safe state.

### 4.2 Super Administrator Initial Provisioning & Recovery
Initial super administrator accounts are created exclusively through server-side CLI scripts (`scripts/provision-super-admin.mjs`), never through public browser registration forms:
```bash
node scripts/provision-super-admin.mjs <email> <password>
```
The script uses `SUPABASE_SERVICE_ROLE_KEY` to create the identity in `auth.users` and upsert the `staff_users` record with role `super_admin`.
