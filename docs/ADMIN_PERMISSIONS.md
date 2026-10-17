# Apex Crypto Wallet — Administrative Permissions & RBAC Matrix

## 1. Overview

Administrative security in Apex Crypto Wallet is established on the principle of least privilege. Permissions are defined at a granular action level and mapped to operational roles. 

No administrative privilege is ever derived from user-controlled tokens, URL query params, or client headers. The session is resolved exclusively on the server from Supabase Auth (`auth.users`) and verified against the `public.staff_users` table with Row Level Security (RLS).

---

## 2. Defined Staff Roles

1. **`super_admin`**: Full operational, administrative, financial, and security authority. The only role permitted to manage staff assignments and modify platform-wide operational settings.
2. **`admin`**: Day-to-day operations. Can manage customer profiles, inspect transactions, request balance adjustments, and apply operational holds.
3. **`finance`**: Dual-control financial operations. Permitted to review and approve balance adjustments submitted by other staff members, and inspect double-entry ledger journals.
4. **`compliance`**: Regulatory risk and investigations. Authorized to apply and lift account restrictions, review KYC statuses, and add confidential forensic investigation notes.
5. **`support`**: Tier-1/Tier-2 customer support. Read-only profile visibility and transaction status inquiries. Strictly prohibited from altering balances or lifting security restrictions.
6. **`read_only`**: Forensic audit and inspection role. Read-only access to users, transactions, and audit trails without mutation rights.

---

## 3. Permission Matrix

| Permission Key | Description | `super_admin` | `admin` | `finance` | `compliance` | `support` | `read_only` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `users.read` | View customer directory & profile details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `users.create` | Onboard customer accounts via server API | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `users.update` | Edit customer name, phone, or KYC tier | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `users.restrict` | Apply/lift operational locks & suspensions | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `transactions.read` | View global transaction list & inspect tx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `transactions.review` | Flag transactions or add investigation notes | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `balances.adjust.request` | Initiate maker-checker adjustment request | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `balances.adjust.approve` | Approve/reject pending adjustments (dual control) | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `withdrawals.review` | Inspect & review high-risk withdrawals | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `compliance.review` | Review identity verification & risk signals | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `audit_logs.read` | Inspect immutable administrative audit trail | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `staff.manage` | Assign roles, activate/suspend staff accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `settings.manage` | Update platform limits & maintenance mode | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Invariant Protections

### 4.1 Last Super-Admin Lockout Protection
At both the server logic (`src/lib/admin/staff.ts`) and database level, any attempt to demote or deactivate the last remaining active `super_admin` account is rejected with `LAST_SUPER_ADMIN_PROTECTED`.

### 4.2 Maker-Checker Dual Control Invariant
In accordance with fintech security requirements, a staff member who creates a balance adjustment request cannot approve or settle it (`requested_by <> reviewed_by`).
