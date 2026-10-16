# Environment Configuration Specification

**Document Version:** 1.0.0  
**Status:** Approved / Implemented  
**Milestone:** 1 (Foundation & Product Experience)  
**Last Updated:** October 2026

---

## 1. Environment Variable Architecture

Environment variables are strictly separated into two domains:
1. **Public Client-Side Variables (`NEXT_PUBLIC_*`):** Safe for browser execution, bundled with client-side JavaScript.
2. **Confidential Server-Side Variables:** Accessible solely in Node.js / edge runtime environments, Server Actions, and API routes.

Runtime validation is performed in `src/lib/config/env.ts` using **Zod**. If an essential variable is missing or malformed during application initialization, the system fails fast with a descriptive configuration error.

---

## 2. Environment Matrix

| Variable Name | Scope | Required In | Description & Format | Sensitivity |
|:---|:---|:---|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Browser | All | HTTPS endpoint of the Supabase project instance (e.g. `https://xyz.supabase.co`) | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Browser | All | JWT anonymous key for client RLS operations | Public / Restricted by RLS |
| `NEXT_PUBLIC_APP_URL` | Public / Browser | All | Canonical application URL (e.g. `http://localhost:3000` or production domain) | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Milestone 2+ | Admin key bypassing RLS. Must **NEVER** be prefixed with `NEXT_PUBLIC_` | **Secret / High** |
| `NODE_ENV` | System | All | Runtime environment (`development`, `production`, `test`) | System |

---

## 3. Sample `.env.example`

```bash
# ==============================================================================
# CRYPTO WALLET ENVIRONMENT CONFIGURATION (MILESTONE 1)
# ==============================================================================

# Public Supabase Project Endpoint (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public Supabase Anonymous Key (Required)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Base URL (Required for callback redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# MILESTONE 2 & 3 ADVANCED CONFIGURATION (UPCOMING)
# ==============================================================================

# Supabase Service Role Key (Server-Only, reserved for backend daemon tasks)
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Korapay Secret Key (Naira payment rails)
# KORAPAY_SECRET_KEY=korapay_secret_...
# KORAPAY_PUBLIC_KEY=korapay_public_...

# Fireblocks Credentials (MPC Custody)
# FIREBLOCKS_API_KEY=...
# FIREBLOCKS_SECRET_PATH=/path/to/fireblocks_secret.key
```

---

## 4. Configuration Validation (`src/lib/config/env.ts`)

```typescript
import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').default('http://localhost:3000'),
});

const serverEnvSchema = clientEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});
```

### Safety Guarantees
- **No Inadvertent Secret Leaks:** Keys without `NEXT_PUBLIC_` are excluded from the client build bundle.
- **Graceful Fallbacks in Development:** Non-critical values provide safe local fallbacks so developers can spin up the environment with minimal bootstrapping friction.
- **Automated PII/Secret Masking:** Structured logger (`src/lib/logger.ts`) explicitly sanitizes headers, cookies, tokens, and authorization fields matching known credential signatures.
