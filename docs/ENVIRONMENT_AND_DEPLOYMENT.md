# Environment, Configuration & Deployment Specification
## Environment Tiers, Secret Management, CI/CD & Deployment Procedures

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Environment Variables & Secret Classification

To prevent inadvertent credential leakage and enforce isolation between browser client execution and server-side runtime, all environment variables follow strict naming conventions:
- **`NEXT_PUBLIC_*`:** Variables embedded into the client bundle at build time. Must **never** contain private keys, service role tokens, or provider secrets.
- **Server-Only (No prefix):** Accessible strictly within Next.js Route Handlers, Server Components, and Server Actions. Completely invisible to browser JavaScript.

### 1.1 Complete Environment Variable Dictionary

| Variable Name | Exposure | Required Tier | Purpose / Description |
| :--- | :--- | :--- | :--- |
| **`NEXT_PUBLIC_APP_URL`** | Public (Client) | All | Canonical base URL of the web application (e.g., `https://wallet.example.ng`). |
| **`NEXT_PUBLIC_APP_ENV`** | Public (Client) | All | Runtime environment tag: `development`, `test`, `staging`, `production`. |
| **`NEXT_PUBLIC_SUPABASE_URL`** | Public (Client) | All | Public HTTPS endpoint for Supabase project instance. |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Public (Client) | All | Public anonymous client API key for Supabase Auth and RLS-scoped reads. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **Server-Only** | All | Elevated service-role key for backend service operations bypassing RLS. |
| **`SUPABASE_DB_URL`** | **Server-Only** | All | Direct PostgreSQL connection string for database migrations (`postgres://...`). |
| **`FIAT_PROVIDER_NAME`** | **Server-Only** | Staging / Prod | Name of active fiat adapter (e.g., `PAYSTACK`, `MONNIFY`, `MOCK`). |
| **`FIAT_PROVIDER_SECRET_KEY`** | **Server-Only** | Staging / Prod | Secret API authorization key for partner payment provider. |
| **`FIAT_PROVIDER_WEBHOOK_SECRET`**| **Server-Only** | Staging / Prod | Cryptographic secret used to compute and verify inbound payment webhooks. |
| **`CUSTODY_PROVIDER_NAME`** | **Server-Only** | Staging / Prod | Name of active custody adapter (e.g., `TURNKEY`, `FIREBLOCKS`, `MOCK`). |
| **`CUSTODY_PROVIDER_API_KEY`** | **Server-Only** | Staging / Prod | API key for custodial wallet infrastructure provider. |
| **`CUSTODY_PROVIDER_API_SECRET`** | **Server-Only** | Staging / Prod | Private signing secret for custodial wallet infrastructure provider. |
| **`CUSTODY_WEBHOOK_SECRET`** | **Server-Only** | Staging / Prod | Secret used to verify on-chain deposit and withdrawal confirmation webhooks. |
| **`SWAP_PROVIDER_API_KEY`** | **Server-Only** | Staging / Prod | API credentials for swap / RFQ liquidity provider. |
| **`APP_ENCRYPTION_KEY`** | **Server-Only** | Staging / Prod | 32-byte hex key for application-level field encryption of sensitive user data. |
| **`UPSTASH_REDIS_REST_URL`** | **Server-Only** | Staging / Prod | Redis endpoint for distributed rate limiting across serverless edge nodes. |
| **`UPSTASH_REDIS_REST_TOKEN`** | **Server-Only** | Staging / Prod | Redis authorization token for rate limiting. |

---

## 2. Environment Tiers & Isolation Matrix

| Characteristic | Local Development (`development`) | Automated Testing (`test`) | Sandbox / Staging (`staging`) | Production (`production`) |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting Platform** | Local Machine (`localhost:3000`) | GitHub Actions CI Runner | Vercel Preview / Staging URL | Vercel Production (`*.example.ng`) |
| **Database** | Local Supabase Docker or Dev DB | Ephemeral Postgres / Vitest DB | Supabase Staging Project | Dedicated Supabase Production Project |
| **Fiat Provider** | Mock Adapter / Provider Sandbox | Mock Adapter (Zero network) | Provider Sandbox (Test BVN/Cards) | Live Licensed Bank Partner API |
| **Custody Provider** | Mock Adapter / EVM Testnet | Mock Adapter | Testnet (Polygon Amoy / Base Sepolia) | Mainnet EVM Custody Vault |
| **Authentication** | Auto-confirmed test accounts | Synthetic mock sessions | Real email verification (sandbox) | Real email verification + rate limits |
| **Data Retention** | Ephemeral, reset on demand | Discarded after test run | Persistent test staging data | Permanent, encrypted backups |

---

## 3. Database Migration Management

All database schema evolutions, table creations, RLS modifications, and stored procedures must be version-controlled in the repository under `supabase/migrations/`.

### Migration Rules
1. **Numbered Sequential Migrations:** Migrations follow the pattern `YYYYMMDDHHMMSS_description.sql` or sequential `00001_initial_schema.sql`.
2. **Zero Destructive In-Place Edits:** Never alter or drop existing production columns directly. Migrations must be forward-compatible and non-blocking.
3. **Automated Migration Check in CI:** Every pull request runs `supabase db test` or applies migrations against an isolated Postgres container to ensure clean execution.
4. **Promotion Sequence:** Migrations are applied automatically to Staging on branch merge, and to Production only during approved release windows via GitHub Actions.

---

## 4. Continuous Integration & Continuous Deployment (CI/CD)

### 4.1 CI Workflow (`.github/workflows/ci.yml`)
On every pull request or push to `main`:
1. **Lint & Formatting:** Runs `npm run lint` and checks code formatting with Prettier.
2. **Type Checking:** Runs `tsc --noEmit` to guarantee complete TypeScript type safety.
3. **Unit & Financial Invariant Tests:** Runs `npm run test:unit` via Vitest. Verifies that all double-entry ledger invariant tests pass.
4. **Integration & Adapter Tests:** Runs `npm run test:integration` against mocked provider contracts and database functions.
5. **Security Scanning:** Runs `npm audit --audit-level=high` and scans for hard-coded credentials.
6. **Next.js Production Build:** Runs `npm run build` to ensure all server and client components compile cleanly without static generation errors.

### 4.2 Deployment Workflow (`.github/workflows/deploy.yml`)
- Merges into `staging` trigger automated deployment to the Vercel Staging environment.
- Releases tagged with `v*.*.*` trigger deployment to Vercel Production following manual approval in GitHub Environments.

---

## 5. Webhook Endpoint Configuration & Routing

External providers must deliver notifications to public, high-availability endpoints configured in their respective partner consoles:

- **Fiat Funding Webhooks:** `https://wallet.example.ng/api/webhooks/fiat`
  - Required Header: `x-paystack-signature` or `x-monnify-signature` (depending on provider).
- **Custody Wallet Webhooks:** `https://wallet.example.ng/api/webhooks/custody`
  - Required Header: `x-custody-signature` and `x-custody-timestamp`.

### Routing & Edge Middleware Exemption
Webhook endpoints must be explicitly exempted from user session authentication in `src/middleware.ts`, while maintaining strict IP whitelisting or cryptographic signature verification before body parsing.

---

## 6. Rollback Procedures & Production Smoke Tests

### 6.1 Rollback Procedures
1. **Frontend / Application Code:** If a critical bug is detected post-deployment, trigger instant rollback to the previous deployment SHA directly via the Vercel dashboard. Zero build step required; traffic switches in < 5 seconds.
2. **Database Rollback:** If a migration introduced a flaw, execute a forward-compensating migration script (`*_revert_*.sql`). Never attempt destructive raw drops against a live financial database.
3. **Emergency Circuit Breaker:** The application supports an emergency environment flag `NEXT_PUBLIC_MAINTENANCE_MODE=true` which immediately renders a secure maintenance screen and halts all financial mutations.

### 6.2 Production Smoke Test Checklist
Immediately following any production release, execute the following non-destructive verification steps:
- [ ] Query `/api/health` and verify 200 OK with database connection latency < 100ms.
- [ ] Visit marketing homepage and confirm hero ticker renders without layout shift.
- [ ] Log in with a dedicated canary test account.
- [ ] Confirm dashboard renders user balances with zero console errors.
- [ ] Verify CSRF tokens and session cookie attributes (`HttpOnly`, `Secure`, `SameSite=Lax`).
- [ ] Confirm Webhook listener responds with HTTP 401 when tested with invalid signature.
