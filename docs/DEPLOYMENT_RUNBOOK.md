# Production Deployment & Operations Runbook

**Document Version:** 1.0.0  
**Target Architecture:** Vercel (Edge & Node.js Serverless) + Supabase (PostgreSQL with RLS)  
**Date:** October 2026  

---

## 1. Environment Variable Separation

Production secrets must never be committed to Git or shared across staging/preview environments. Use Vercel Environment Variables and Supabase Vault.

### 1.1 Required Environment Variables

```bash
# Application Environment
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://wallet.apexwallet.io

# Supabase Managed Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>

# Fiat Provider (Korapay)
KORAPAY_PUBLIC_KEY=<pk_live_...>
KORAPAY_SECRET_KEY=<sk_live_...>

# Custodial MPC Provider (Fireblocks)
FIREBLOCKS_API_KEY=<api-user-uuid>
FIREBLOCKS_SECRET_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBLOCKS_WEBHOOK_SECRET=<hmac-sha512-webhook-secret>

# Email & Notifications (Resend / SendGrid)
RESEND_API_KEY=<re_live_...>
```

---

## 2. Step-by-Step Deployment Protocol

### Step 1: Pre-Flight Verification
Execute automated tests, type checks, and production builds in clean workspace:
```bash
npm run test:unit    # Must pass 100% (79/79 tests)
npm run typecheck    # Must exit code 0
npm run build        # Must generate all 20 routes cleanly
```

### Step 2: Database Migration Deployment
Apply Supabase migrations in strict sequential order:
```bash
# Sequential execution on production PostgreSQL:
supabase db push \
  --include 00001_auth_profiles.sql \
  --include 00002_ledger_engine.sql \
  --include 00003_transactions_notifications.sql
```
*Verify all RLS policies are enabled and tables have row locks active.*

### Step 3: Vercel Production Build & Deployment
1. Link GitHub repository to Vercel production project.
2. Verify Root Directory is `./` and Framework is `Next.js`.
3. Configure custom domains with SSL:
   - Apex domain: `apexwallet.ng`
   - Application domain: `wallet.apexwallet.ng`
4. Trigger production deployment via Vercel CLI or Git release tag:
   ```bash
   vercel --prod
   ```

### Step 4: Post-Deployment Smoke Verification
1. **Health Check:** `curl -f -s https://wallet.apexwallet.ng/api/health` (verify HTTP 200 and `{ status: "UP" }`).
2. **Webhook Reachability:**
   - Test Korapay webhook endpoint: `POST /api/webhooks/korapay` (verify HTTP 401 on missing signature).
   - Test Custody webhook endpoint: `POST /api/webhooks/custody` (verify HTTP 401 on missing signature).
3. **Smoke Test User:** Execute test sign-in on staging/canary to verify cookie issuance and dashboard balance projection.

---

## 3. Rollback Protocol

If an unexpected ledger fault, database deadlock, or critical defect is detected post-deployment:
1. **Immediate Frontend Rollback:** In Vercel dashboard, click **Redeploy** on the previous known-good deployment artifact (restoration time < 30 seconds).
2. **Database Rollback:** If migration rollback is required, execute compensating scripts; **never drop tables holding ledger journals or balances**.
3. **Kill-Switch Activation:** Set `NEXT_PUBLIC_MAINTENANCE_MODE=true` in Vercel to route all non-admin traffic to a maintenance screen while investigating.
