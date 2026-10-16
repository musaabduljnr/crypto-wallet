# Routes and Layouts Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 1 (Foundation & Product Experience)  
**Last Updated:** October 2026

---

## 1. Overview & Architecture

The application is structured using Next.js 15 App Router with TypeScript. It enforces strict separation of concerns across route groups, layout boundaries, and rendering paradigms (Server Components for data fetching and layout structure; Client Components for localized interactivity and form state management).

```
src/app/
├── layout.tsx                  # Root HTML shell, fonts (Inter/JetBrains Mono), metadata
├── page.tsx                    # Public marketing homepage
├── not-found.tsx               # Global 404 handler
├── error.tsx                   # Global client error boundary
├── (auth)/                     # Auth Route Group (Isolated centered card layout)
│   ├── layout.tsx              # Centered card layout with header logo & trust indicators
│   ├── login/page.tsx          # Login form
│   ├── register/page.tsx       # 3-step registration (Email, Phone, Password)
│   ├── verify-email/page.tsx   # Email verification waiting screen
│   ├── reset-password/page.tsx # Password reset request
│   └── update-password/page.tsx# New password submission
├── (dashboard)/                # Authenticated Application Shell Group
│   ├── layout.tsx              # Authenticated shell (Desktop Sidebar, Header, Mobile Bottom Nav)
│   ├── page.tsx                # Main wallet overview (Portfolio, quick actions, transactions)
│   ├── settings/page.tsx       # User profile, KYC status, security credentials
│   ├── add-money/page.tsx      # Milestone 2 stub: Fiat top-up (Naira virtual accounts/cards)
│   ├── receive/page.tsx        # Milestone 2 stub: On-chain crypto deposit addresses & QR
│   ├── transfer/page.tsx       # Milestone 2 stub: Instant internal P2P user-to-user transfers
│   ├── swap/page.tsx           # Milestone 3 stub: Non-custodial/custodial asset exchange
│   └── history/page.tsx        # Milestone 2 stub: Full audit ledger transaction history
└── api/
    └── health/route.ts         # Unauthenticated operational liveness & readiness check
```

---

## 2. Route Inventory

| Route Path | Route Group | Authentication Required | Rendering Mode | Purpose & Scope |
|:---|:---|:---|:---|:---|
| `/` | Root | No | Server Component (SSR/Static) | Public marketing homepage, capabilities, security architecture, FAQ |
| `/login` | `(auth)` | No (Redirects if auth) | Client Component | Secure email + password credential authentication |
| `/register` | `(auth)` | No (Redirects if auth) | Client Component | User account onboarding (+234 phone, email, strong password) |
| `/verify-email` | `(auth)` | No | Server Component | Post-signup instruction screen to confirm email inbox |
| `/reset-password` | `(auth)` | No (Redirects if auth) | Client Component | Initiates password recovery email via Supabase Auth |
| `/update-password` | `(auth)` | Conditional (Recovery) | Client Component | Submits updated password after recovery link click |
| `/dashboard` | `(dashboard)` | **Yes** (Strict) | Server Component + Client actions | Main account overview, asset balance tiles, recent activity |
| `/settings` | `(dashboard)` | **Yes** (Strict) | Server Component + Client form | Profile management, Tier 1 status display, phone number update |
| `/add-money` | `(dashboard)` | **Yes** (Strict) | Server Component (Stub) | Scope placeholder for Milestone 2 fiat deposit pipelines |
| `/receive` | `(dashboard)` | **Yes** (Strict) | Server Component (Stub) | Scope placeholder for Milestone 2 deposit address generation |
| `/transfer` | `(dashboard)` | **Yes** (Strict) | Server Component (Stub) | Scope placeholder for Milestone 2 internal ledger transfers |
| `/swap` | `(dashboard)` | **Yes** (Strict) | Server Component (Stub) | Scope placeholder for Milestone 3 RFQ token swap engine |
| `/history` | `(dashboard)` | **Yes** (Strict) | Server Component (Stub) | Scope placeholder for Milestone 2 paginated transaction ledger |
| `/api/health` | API | No | Edge / Node API Route | System health, uptime, and timestamp monitoring probe |

---

## 3. Layout Hierarchy & Composition

### 3.1 Root Layout (`src/app/layout.tsx`)
- Configures global typography: Google Fonts `Inter` (sans-serif) and `JetBrains Mono` (monospace for crypto addresses, hashes, and balances).
- Sets up HTML document metadata: OpenGraph properties, security meta headers, and viewport constraints.
- Injects global stylesheet `globals.css` with CSS variables for dark/light fintech palette.

### 3.2 Authentication Layout (`src/app/(auth)/layout.tsx`)
- Clean, focused layout with no navigation header or distracting marketing links.
- Centered container (`max-w-md`) on an ambient subtle radial background.
- Top branding bar with application logo and "Encrypted Session" security badge.
- Bottom footer with privacy policy link, terms of service link, and NDIC/regulatory disclaimer.

### 3.3 Dashboard Layout (`src/app/(dashboard)/layout.tsx`)
- Server Component resolving active user profile from Supabase server session.
- **Desktop Sidebar (`md:flex`):**
  - Brand header with version badge.
  - Primary navigation links: Dashboard, Add Money, Receive, Transfer, Swap, History, Settings.
  - Active route highlighting using pathname matching.
  - Bottom user profile pill with user email, Tier 1 badge, and one-click sign-out button.
- **Desktop Top Header (`md:flex`):**
  - Search/status bar and testnet indicator badge.
  - Direct action triggers (Quick Add Money, Settings shortcut).
- **Mobile Responsive Navigation:**
  - Sticky mobile top bar with brand mark and profile avatar.
  - Fixed mobile bottom navigation bar (`md:hidden`) with high-frequency touch targets: Home, Add, Transfer, History, Settings.

---

## 4. Protected Route & Edge Middleware Enforcement

All incoming requests are intercepted by `src/middleware.ts` delegating to `src/lib/supabase/middleware.ts`.

### 4.1 Route Guard Rules
1. **Public Routes:** `/`, `/api/health`, and static asset routes (`/_next/*`, `/favicon.ico`) bypass session validation.
2. **Dashboard Routes (`/dashboard/*`, `/settings`, `/add-money`, `/receive`, `/transfer`, `/swap`, `/history`):**
   - If `supabase.auth.getUser()` fails or returns null, the user is redirected to `/login?redirectTo=${encodeURIComponent(pathname)}`.
3. **Auth Routes (`/login`, `/register`, `/reset-password`, `/verify-email`):**
   - If an active session exists, the user is immediately redirected to `/dashboard` to prevent duplicate authentication.

### 4.2 Cookie Propagation
- Auth session cookies are refreshed seamlessly on each request via `@supabase/ssr` request/response cookie headers.
- Guarantees valid JWTs on server component renders without client-side authentication flicker.

---

## 5. Non-Deceptive Placeholder Strategy

To maintain fintech integrity and avoid misleading users before live backend integrations:
- No balances, returns, or transaction histories are fabricated with fake numbers.
- Unimplemented feature routes (`/add-money`, `/receive`, `/transfer`, `/swap`, `/history`) display explicit **Milestone Informational Badges**:
  - Explains the capability and expected integration (e.g., Korapay, Fireblocks, Central Ledger).
  - Clarifies that transactional mutations are locked pending Milestone 2 & 3 delivery.
  - Provides a safe return path to the dashboard.
