# Apex Crypto Wallet — Administrative Security Review

## 1. Executive Summary

A comprehensive security review was performed on the Administrative Dashboard architecture to ensure full compliance with fintech enterprise controls, zero-trust server boundaries, and cryptographic custody safety.

---

## 2. Threat Modeling & Mitigation Analysis

| Potential Threat / Vector | Architectural Vulnerability | Implemented Countermeasure | Verification Status |
| :--- | :--- | :--- | :---: |
| **Client Role Spoofing** | User alters JWT claims, local storage, or request body to claim `super_admin`. | Server actions and Server Components resolve staff identity strictly through server-side Supabase session query against `public.staff_users`. Client claims are ignored. | ✅ PASS |
| **Direct API Bypass** | Restricted user executes transactions via direct cURL/Postman calls, bypassing UI restriction banners. | Restriction checks (`check_user_active_restriction`) are integrated directly into backend service logic (`transfer.service.ts`, `withdrawal.service.ts`, `swap.service.ts`, `funding.service.ts`). | ✅ PASS |
| **Arbitrary Ledger Inflation** | Rogue administrator directly updates balance numbers or injects synthetic credits. | Direct updates are prohibited by database permissions. Adjustments must use `settle_approved_balance_adjustment` which enforces double-entry entries against `SYSTEM_RECONCILIATION`. | ✅ PASS |
| **Self-Approved Balance Theft** | Administrator submits a balance credit to their own account and approves it. | Maker-checker dual control is enforced at both application layer and PostgreSQL table constraint (`chk_maker_checker_disjoint`). Self-approval throws `MAKER_CHECKER_SELF_APPROVAL_PROHIBITED`. | ✅ PASS |
| **Super Administrator Lockout** | Accidental or malicious demotion/deactivation of all super administrators. | Code and database logic reject demoting or deactivating the last active `super_admin` (`LAST_SUPER_ADMIN_PROTECTED`). | ✅ PASS |
| **Credential / Key Leakage in Logs** | Administrative audit logs capture passwords, PINs, or private keys. | `recordAdminAuditLog()` sanitizes all payload dictionaries, deleting `password`, `payment_pin`, `secret_key`, and `token` fields before database insertion. | ✅ PASS |
| **Replay & Duplicate Adjustments** | Network retry causes multiple balance credits for a single incident. | Every balance adjustment request and ledger entry requires a globally unique `idempotency_key` with unique database index enforcement. | ✅ PASS |

---

## 3. RLS & Least-Privilege Policies

- `public.staff_users`: Readable only by authenticated staff members; mutable only via service-role context.
- `public.balance_adjustments`: Readable by staff with financial review permissions; insertable by makers; settleable only via transactional stored procedure.
- `public.account_restrictions`: Enforced via security-definer database function `check_user_active_restriction`.
- `public.admin_audit_logs`: Append-only (`INSERT` / `SELECT`). Modification (`UPDATE`) and deletion (`DELETE`) are revoked.
