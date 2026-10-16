# Authentication Implementation Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 1 (Foundation & Product Experience)  
**Last Updated:** October 2026

---

## 1. Architecture Overview

Authentication is powered by **Supabase Auth** backed by PostgreSQL Row Level Security (RLS). The system utilizes `@supabase/ssr` to implement secure, HTTP-only cookie-based session management compatible with the Next.js App Router (Server Actions, Server Components, and Edge Middleware).

```
Client Form (login/register)
        │
        ▼ (FormData)
Next.js Server Actions (src/actions/auth.actions.ts)
        │
        ├─► Zod Validation (src/lib/validation/auth.ts)
        ├─► Open-Redirect Sanitizer (src/lib/utils/redirects.ts)
        │
        ▼ (Authenticated Request)
Supabase Server Client (src/lib/supabase/server.ts)
        │
        ▼ (Cookie set / refresh via HTTP headers)
PostgreSQL Database (auth.users + public.user_profiles)
```

---

## 2. Component Breakdown

### 2.1 Clients and Session Handlers
- **Server Client (`src/lib/supabase/server.ts`):** Creates an SSR-safe client using `next/headers` cookies. Reads and writes session cookies across Server Component queries and Server Action mutations.
- **Client Client (`src/lib/supabase/client.ts`):** Browser-side client using `createBrowserClient` for interactive operations, auth state listeners, and client-side triggers.
- **Middleware Guard (`src/lib/supabase/middleware.ts` & `src/middleware.ts`):** Edge-compatible session verification using `getUser()`. Refreshes expired sessions and handles redirects before route rendering begins.

### 2.2 Validation Layer (`src/lib/validation/auth.ts`)
Uses **Zod** to enforce strict input sanitization and schema contracts:
- **Email:** Standard email format trimmed and lowercase.
- **Password:** Minimum 8 characters, requiring at least 1 uppercase letter, 1 lowercase letter, and 1 number.
- **Phone Number (Nigerian Onboarding):** Validates E.164 and local Nigerian phone numbers using regex:
  ```ts
  const NIGERIA_PHONE_REGEX = /^(?:\+234|234|0)(?:70|80|81|90|91)\d{8}$/;
  ```
  Automatically normalizes valid inputs into standard E.164 format `+234XXXXXXXXXX`.
- **Display Name:** 2 to 50 characters, trimmed of excessive whitespace.

### 2.3 Server Actions (`src/actions/auth.actions.ts`)
All authentication actions run strictly on the server:
- `loginAction(formData)`: Validates credentials, executes `signInWithPassword`, clears error states, and redirects to sanitized `redirectTo` target.
- `registerAction(formData)`: Validates user input, calls `signUp` with user metadata (`full_name`, `phone_number`), initiates email verification flow, and redirects to `/verify-email`.
- `logoutAction()`: Invokes `signOut` and clears session cookies, redirecting to `/login`.
- `resetPasswordAction(formData)`: Sends a password recovery email to the registered address via Supabase Auth with an origin-restricted redirect URI.
- `updatePasswordAction(formData)`: Updates user password for active recovery sessions via `updateUser({ password })`.

---

## 3. Security Hardening

### 3.1 Open Redirect Defense (`src/lib/utils/redirects.ts`)
To prevent open-redirect vulnerabilities (where attackers craft URLs such as `/login?redirectTo=https://malicious.com` or `/login?redirectTo=//attacker.com`):
- All redirect targets must start with a single `/`.
- URLs starting with `//` (protocol-relative URLs) are rejected.
- URLs with backslashes (`\`) or URI schemes (`http:`, `javascript:`, `data:`) are rejected.
- Rejection safely defaults to `/dashboard`.
- 100% verified via unit tests in `tests/unit/redirects.test.ts`.

### 3.2 Secure Error Handling
- Internal database errors and raw provider exceptions are never exposed to the client.
- Human-friendly, non-revealing error messages (e.g., "Invalid email or password", "An account with this email already exists") prevent user enumeration.
- All errors are logged via `src/lib/logger.ts` with PII and credential scrubbing (`[REDACTED]`).

### 3.3 Database Synchronization & RLS
- PostgreSQL trigger `on_auth_user_created` automatically creates a corresponding row in `public.user_profiles` whenever a new user is inserted into `auth.users`.
- Row-Level Security policy restricts access strictly to the owner:
  ```sql
  CREATE POLICY "Users can view own profile" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);
  ```

---

## 4. Verification & Testing

Unit tests cover schema validation, Nigerian phone format handling, open-redirect mitigation, and logger safety:
```bash
npm run test:unit
```
Test results:
- `tests/unit/auth-validation.test.ts`: **Passed** (valid/invalid emails, passwords, Nigerian phone numbers).
- `tests/unit/redirects.test.ts`: **Passed** (local paths, external targets, protocol-relative bypasses).
- `tests/unit/logger-safety.test.ts`: **Passed** (PII scrubbing, token and password redaction).
