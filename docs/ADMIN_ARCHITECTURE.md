# Apex Crypto Wallet — Administrative Architecture

## 1. System Overview

The Apex Crypto Wallet Administrative Dashboard (`/admin`) is an enterprise-grade back-office operations and security portal designed for authorized financial personnel, compliance officers, and system administrators. 

It provides audit-grade management capabilities while strictly adhering to core platform invariants:
1. **Zero Direct Ledger Mutation:** Balances cannot be directly edited, overwritten, or fabricated. All financial adjustments must flow through double-entry accounting journals (`settle_approved_balance_adjustment`) using clearing accounts (`SYSTEM_RECONCILIATION`).
2. **Server-Side Authorization Enforcement:** Administrative permissions are enforced via server actions and server components (`requireStaffPermission`) using the protected `staff_users` table in PostgreSQL. Client-side navigation or role tokens are never trusted.
3. **Dual-Control Maker-Checker Governance:** Financial adjustments and high-consequence operations require separate requester ("Maker") and approver ("Checker") identities. Self-approval is strictly prevented at both application and database constraint levels (`chk_maker_checker_disjoint`).
4. **Authoritative State Enforcement:** Account restrictions (`account_restrictions`) are actively checked inside backend services (`transfer.service.ts`, `withdrawal.service.ts`, `swap.service.ts`, `funding.service.ts`), prohibiting restricted users from bypassing UI controls via direct API execution.
5. **Append-Only Tamper-Resistant Audit Trail:** All privileged administrative actions, configuration updates, and note submissions are recorded in `admin_audit_logs` with automatic redaction of credentials and private keys.

---

## 2. Route Hierarchy

The administrative portal is completely isolated under `/admin` and protected by server-side session authentication in `src/app/admin/layout.tsx`:

| Route | Functionality | Granular Permission Required |
| :--- | :--- | :--- |
| `/admin` | Administrative overview, real-time platform metrics, and provider status | Any authenticated staff role |
| `/admin/users` | Customer directory, search by name/email/phone, pagination, account creation | `users.read` |
| `/admin/users/[userId]` | Individual customer forensic profile, ledger balances, notes, restriction tools | `users.read` |
| `/admin/transactions` | Multi-asset transaction monitoring, status filtering, provider reference lookup | `transactions.read` |
| `/admin/transactions/[transactionId]` | Transaction investigation, double-entry journal balance check ($\sum D = \sum C$) | `transactions.read` |
| `/admin/balance-adjustments` | Maker-checker balance adjustment queue and approval workflow | `balances.adjust.request` / `balances.adjust.approve` |
| `/admin/restrictions` | Global account restrictions registry, operational holds, lifting dialogs | `users.restrict` |
| `/admin/audit-logs` | Tamper-resistant privileged action audit history with metadata inspection | `audit_logs.read` |
| `/admin/operations` | External provider health, live mathematical ledger reconciliation auditor | `audit_logs.read` |
| `/admin/settings` | Operational toggles (maintenance mode, 72h new device hold, withdrawal limits) | `settings.manage` |
| `/admin/staff` | Staff directory, role assignments, super-admin lockout protection | `staff.manage` |

---

## 3. Data Flow Architecture

```
   [Admin Client Browser]
             │
             │ HTTPS / Server Actions (Next.js 15)
             ▼
   [Server Action Layer (src/actions/admin.actions.ts)]
             │
             ├─► 1. getAuthenticatedStaff() -> Resolves session from Supabase Auth
             ├─► 2. requireStaffPermission(perm) -> Evaluates ROLE_PERMISSIONS matrix
             │
             ▼
   [Core Admin Services (src/lib/admin/*)]
             │
             ├─► adjustments.ts ──► PostgreSQL RPC settle_approved_balance_adjustment()
             ├─► restrictions.ts ──► PostgreSQL RPC check_user_active_restriction()
             ├─► users.ts ─────────► ledgerService.getUserBalances()
             ├─► transactions.ts ──► Double-entry ledger journals
             ├─► audit.ts ─────────► admin_audit_logs (Immutable append-only)
             │
             ▼
   [PostgreSQL Database (Supabase)]
             │
             ├── staff_users (Role definitions & active status)
             ├── account_restrictions (Operational locks)
             ├── balance_adjustments (Maker-checker queue)
             ├── admin_audit_logs (Tamper-resistant audit trail)
             ├── platform_settings (Global runtime configuration)
             └── ledger_transactions & ledger_entries (Authoritative books)
```
