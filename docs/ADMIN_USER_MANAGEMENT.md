# Apex Crypto Wallet — Administrative User Management

## 1. Scope & Workflow

The Administrative User Management module allows authorized personnel (`users.read`, `users.create`, `users.update`) to safely onboard customers, search user records, inspect balances derived directly from the double-entry ledger, and update profile metadata.

---

## 2. User Directory (`/admin/users`)

The directory displays:
- **Identity:** Full Name, Email, Phone Number, Unique Account ID (UUID).
- **KYC Tier:** Tier 1 (Basic), Tier 2 (Verified), Tier 3 (Enhanced/Institutional).
- **Account State:** Active, Restricted, or Suspended.
- **Created Timestamp:** Account registration date.

### Search & Filtering
- Search queries query against First Name, Last Name, Email, and Phone Number using case-insensitive PostgreSQL pattern matching.
- Results are paginated with server-side limit and offset bounds.

---

## 3. Account Provisioning (`createAdminUser`)

Authorized staff can initiate customer onboarding via the modal on `/admin/users`:
1. **Input Validation:** Requires valid email format, first name, last name, and phone number.
2. **Identity Creation:** Uses the server-side Supabase Admin client (`auth.admin.createUser`) to prevent email conflicts and generate an isolated authentication identity.
3. **Profile Initialisation:** Creates the corresponding row in `public.user_profiles`.
4. **Credential Security:** Plaintext passwords are not retained in application memory or logs. If an initial password is provided during development provisioning, the customer is prompted to establish new credentials.
5. **No Balance Fabrication:** User accounts are initialized with empty ledger accounts. Balances cannot be artificially manufactured upon creation.
6. **Audit Trail:** Logs a `USER_CREATED` event with target UUID and creating administrator identity.

---

## 4. User Detail Forensic View (`/admin/users/[userId]`)

The individual user inspection page provides five forensic tabs:
1. **Balances Tab:** Displays authoritative balances across all six supported platform assets (USDT, USDC, BTC, ETH, SOL, NGN) split into Available, Reserved, and Pending amounts, fetched from `ledgerService.getUserBalances()`.
2. **Restrictions Tab:** Displays active and historical operational locks, reasons, and a one-click dialog to lift restrictions with a mandatory justification.
3. **Transactions Tab:** Displays recent ledger activity scoped strictly to the selected user.
4. **Investigation Notes Tab:** Private, timestamped notes created by staff members. Supports confidential flags for compliance/legal cases.
5. **Profile Metadata Tab:** Allows updating user display names, phone numbers, and KYC tiers with mandatory reason tracking.
