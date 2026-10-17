# Apex Crypto Wallet — Administrative Audit Logging

## 1. Objectives

All administrative actions that impact customer access, security policies, financial balances, or platform configurations must produce an immutable, tamper-resistant audit event. 

The audit log serves as an irrefutable source of truth for internal security audits, regulatory compliance, and incident response.

---

## 2. Table Design & Security Policies

Audit events are stored in `public.admin_audit_logs`:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, generated via `gen_random_uuid()` |
| `actor_id` | `UUID` | Foreign Key to `auth.users(id)` |
| `actor_email` | `VARCHAR(255)` | Email of the acting staff member |
| `actor_role` | `staff_role_type` | Staff role at time of execution |
| `action_type` | `VARCHAR(64)` | Standardized event identifier |
| `target_entity_type` | `VARCHAR(64)` | Target entity category (e.g. `USER`, `SETTING`, `STAFF_USER`) |
| `target_entity_id` | `VARCHAR(128)` | Target entity identifier |
| `details` | `JSONB` | Contextual event metadata |
| `ip_address` | `VARCHAR(45)` | IPv4 / IPv6 of the client connection |
| `user_agent` | `TEXT` | Browser user-agent header |
| `status` | `VARCHAR(20)` | `SUCCESS` or `FAILED` |
| `created_at` | `TIMESTAMPTZ` | Timestamp generated via `now()` |

### Immutability & Append-Only Guarantees
- No `UPDATE` or `DELETE` operations are permitted on `admin_audit_logs`.
- Only `INSERT` and `SELECT` are granted to the server application role.

---

## 3. Data Sanitization & Credential Protection

Before any audit record is persisted, `recordAdminAuditLog()` surgically strips sensitive credentials to guarantee zero leakage:
- Passwords and temporary credentials
- Payment PINs
- Provider secret keys and API secrets
- JWT session tokens and bearer keys
