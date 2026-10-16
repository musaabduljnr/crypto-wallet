# Profile & Security Settings Specification

## 1. Overview
ApexWallet's account and security settings module provides self-service identity management, authentication controls, and user notification preference management in compliance with Nigerian VASP regulations and SEC ARIP requirements.

---

## 2. Core Capabilities
- **Profile Updates:** First name, last name, phone number, and state of residence can be updated securely with input sanitization and length bounds.
- **Real Password Changes:** Integrated directly with Supabase Auth (`supabase.auth.updateUser({ password })`). Requires minimum 8 characters and automatically emits a high-priority `SECURITY_ALERT` notification upon change.
- **Session Protection:** All browser interactions utilize HTTP-only, `SameSite=Lax`, secure cookie tokens preventing token leakage through Cross-Site Scripting (XSS).
- **Global Session Invalidation:** Users can terminate all active sessions across all devices via `signOutAllSessionsAction` invoking `supabase.auth.signOut({ scope: "global" })`.
- **Granular Notification Preferences:** Allows users to independently toggle email and in-app alerts for transfers, funding deposits, withdrawals, and security alerts. Changes are stored in `user_notification_preferences` with immediate optimistic client UI updates.
- **KYC & Regulatory Compliance Tier:** Displays authentic verification status (Tier 1 Verified) and clear regulatory explanation (₦50,000 daily transaction limits; higher tiers requiring BVN/NIN and government-issued ID).
