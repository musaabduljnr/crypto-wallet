-- ==============================================================================
-- MIGRATION: 00004_admin_dashboard.sql
-- DESCRIPTION: Super Admin RBAC, Account Restrictions, Maker-Checker Balance
--              Adjustments, Audit Logging, Staff Roles, and Admin Notes.
-- COMPLIANCE: Principle of least privilege, strict server-side RBAC, immutable
--             audit trail, dual-control maker-checker for balance adjustments.
-- ==============================================================================

-- 1. ENUMS AND CUSTOM TYPES
DO $$ BEGIN
    CREATE TYPE staff_role_type AS ENUM (
        'super_admin',
        'admin',
        'support',
        'compliance',
        'finance',
        'read_only'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE restriction_type AS ENUM (
        'FULL_SUSPENSION',
        'SIGN_IN',
        'FIAT_FUNDING',
        'CRYPTO_DEPOSIT',
        'INTERNAL_TRANSFER',
        'EXTERNAL_WITHDRAWAL',
        'SWAP',
        'TEMPORARY_HOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE restriction_status AS ENUM (
        'ACTIVE',
        'LIFTED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE adjustment_status AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'POSTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE adjustment_direction AS ENUM (
        'CREDIT',
        'DEBIT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend ledger account types for operational balance adjustments
DO $$ BEGIN
    ALTER TYPE ledger_account_type ADD VALUE IF NOT EXISTS 'SYSTEM_RECONCILIATION';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. STAFF USERS & ROLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role staff_role_type NOT NULL DEFAULT 'read_only',
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_users_role ON public.staff_users(role, is_active);

-- 3. ACCOUNT RESTRICTIONS TABLE
CREATE TABLE IF NOT EXISTS public.account_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restriction_type restriction_type NOT NULL,
    reason_category VARCHAR(64) NOT NULL,
    internal_explanation TEXT NOT NULL,
    status restriction_status NOT NULL DEFAULT 'ACTIVE',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    lifted_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    lifted_at TIMESTAMPTZ,
    lift_reason TEXT,
    CONSTRAINT chk_lifted_consistency CHECK (
        (status = 'LIFTED' AND lifted_by IS NOT NULL AND lifted_at IS NOT NULL) OR
        (status <> 'LIFTED')
    )
);

CREATE INDEX IF NOT EXISTS idx_account_restrictions_user_active 
    ON public.account_restrictions(user_id, restriction_type, status);

-- 4. BALANCE ADJUSTMENT REQUESTS (Maker-Checker Dual Control)
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    direction adjustment_direction NOT NULL,
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    reason_category VARCHAR(64) NOT NULL,
    justification TEXT NOT NULL,
    reference_case VARCHAR(128),
    status adjustment_status NOT NULL DEFAULT 'PENDING',
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    -- Strict Maker-Checker Invariant: Requester cannot approve their own adjustment
    CONSTRAINT chk_maker_checker_disjoint CHECK (
        status <> 'APPROVED' OR (requested_by <> reviewed_by)
    ),
    CONSTRAINT chk_review_record CHECK (
        (status IN ('APPROVED', 'POSTED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
        (status = 'PENDING')
    )
);

CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user ON public.balance_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_status ON public.balance_adjustments(status);

-- 5. ADMINISTRATIVE AUDIT LOGS (Immutable Append-Only)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    actor_email VARCHAR(255) NOT NULL,
    actor_role staff_role_type NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_entity_type VARCHAR(64) NOT NULL,
    target_entity_id VARCHAR(128) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_logs(target_entity_type, target_entity_id);

-- 6. ADMINISTRATIVE NOTES (Internal Case Notes)
CREATE TABLE IF NOT EXISTS public.admin_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_entity_type VARCHAR(32) NOT NULL, -- 'USER', 'TRANSACTION', 'ADJUSTMENT'
    target_entity_id VARCHAR(128) NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    author_email VARCHAR(255) NOT NULL,
    note_text TEXT NOT NULL,
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_target ON public.admin_notes(target_entity_type, target_entity_id, created_at DESC);

-- 7. PLATFORM OPERATIONAL SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed baseline operational settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('maintenance_mode', '{"enabled": false, "reason": ""}'::jsonb, 'Global platform maintenance toggle'),
    ('cooling_off_period_hours', '{"hours": 72}'::jsonb, 'New device withdrawal cooling off duration in hours'),
    ('daily_withdrawal_limit_usd', '{"tier1": 50000, "tier2": 250000, "tier3": 1000000}'::jsonb, 'Maximum daily crypto withdrawal limits by KYC tier')
ON CONFLICT (key) DO NOTHING;

-- 8. DATABASE FUNCTIONS FOR RESTRICTION & AUTHORIZATION CHECKING

-- 8.1 Active Restriction Lookup
CREATE OR REPLACE FUNCTION public.check_user_active_restriction(
    p_user_id UUID,
    p_restriction_type VARCHAR
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.account_restrictions
        WHERE user_id = p_user_id
          AND status = 'ACTIVE'
          AND (expires_at IS NULL OR expires_at > now())
          AND (
              restriction_type = p_restriction_type::public.restriction_type 
              OR restriction_type = 'FULL_SUSPENSION'::public.restriction_type
          )
    );
END;
$$;

-- 8.2 Atomic Balance Adjustment Settlement (Ledger Invariant Preserved)
CREATE OR REPLACE FUNCTION public.settle_approved_balance_adjustment(
    p_adjustment_id UUID,
    p_reviewer_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_adj RECORD;
    v_user_acct UUID;
    v_system_reconciliation_acct UUID;
    v_current_available NUMERIC;
    v_tx_id UUID;
    v_entry_id UUID;
BEGIN
    -- 1. Fetch and validate adjustment record with row lock
    SELECT * INTO v_adj
    FROM public.balance_adjustments
    WHERE id = p_adjustment_id
    FOR UPDATE;

    IF v_adj IS NULL THEN
        RAISE EXCEPTION 'ERR_ADJUSTMENT_NOT_FOUND';
    END IF;

    IF v_adj.status <> 'PENDING' THEN
        RAISE EXCEPTION 'ERR_ADJUSTMENT_ALREADY_PROCESSED';
    END IF;

    -- Strict Maker-Checker Invariant
    IF v_adj.requested_by = p_reviewer_id THEN
        RAISE EXCEPTION 'ERR_MAKER_CHECKER_SELF_APPROVAL_PROHIBITED';
    END IF;

    -- 2. Resolve accounts
    v_user_acct := public.get_or_create_user_account(v_adj.user_id, 'USER_AVAILABLE', v_adj.asset_ticker);
    v_system_reconciliation_acct := public.get_or_create_system_account('SYSTEM_RECONCILIATION', v_adj.asset_ticker);

    -- 3. If DEBIT adjustment, ensure user has sufficient available balance
    IF v_adj.direction = 'DEBIT' THEN
        SELECT available_balance INTO v_current_available
        FROM public.wallet_balances
        WHERE account_id = v_user_acct
        FOR UPDATE;

        IF v_current_available IS NULL OR v_current_available < v_adj.amount THEN
            RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS_FOR_DEBIT_ADJUSTMENT';
        END IF;
    END IF;

    -- 4. Create Ledger Transaction Header
    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, metadata, posted_at
    ) VALUES (
        'SYSTEM_RECONCILIATION', 'POSTED', 'ADJ-' || upper(substr(p_adjustment_id::text, 1, 8)),
        v_adj.idempotency_key, 
        jsonb_build_object(
            'adjustment_id', p_adjustment_id,
            'direction', v_adj.direction,
            'reason_category', v_adj.reason_category,
            'justification', v_adj.justification,
            'requested_by', v_adj.requested_by,
            'approved_by', p_reviewer_id
        ),
        now()
    ) RETURNING id INTO v_tx_id;

    -- 5. Balanced Double-Entry Postings
    IF v_adj.direction = 'CREDIT' THEN
        -- Increase user funds:
        -- DEBIT System SYSTEM_RECONCILIATION (System Expense/Asset Offset)
        INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
        VALUES (v_tx_id, v_system_reconciliation_acct, 'DEBIT', v_adj.amount, v_adj.asset_ticker);

        -- CREDIT User USER_AVAILABLE (User Liability increases)
        INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
        VALUES (v_tx_id, v_user_acct, 'CREDIT', v_adj.amount, v_adj.asset_ticker)
        RETURNING id INTO v_entry_id;

        -- Update balances
        UPDATE public.wallet_balances 
        SET available_balance = available_balance + v_adj.amount,
            last_entry_id = v_entry_id,
            updated_at = now()
        WHERE account_id = v_user_acct;

        UPDATE public.wallet_balances 
        SET available_balance = available_balance - v_adj.amount,
            updated_at = now()
        WHERE account_id = v_system_reconciliation_acct;
    ELSE
        -- Decrease user funds (DEBIT):
        -- DEBIT User USER_AVAILABLE (User Liability decreases)
        INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
        VALUES (v_tx_id, v_user_acct, 'DEBIT', v_adj.amount, v_adj.asset_ticker);

        -- CREDIT System SYSTEM_RECONCILIATION
        INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
        VALUES (v_tx_id, v_system_reconciliation_acct, 'CREDIT', v_adj.amount, v_adj.asset_ticker)
        RETURNING id INTO v_entry_id;

        -- Update balances
        UPDATE public.wallet_balances 
        SET available_balance = available_balance - v_adj.amount,
            last_entry_id = v_entry_id,
            updated_at = now()
        WHERE account_id = v_user_acct;

        UPDATE public.wallet_balances 
        SET available_balance = available_balance + v_adj.amount,
            updated_at = now()
        WHERE account_id = v_system_reconciliation_acct;
    END IF;

    -- 6. Update adjustment record state
    UPDATE public.balance_adjustments
    SET status = 'POSTED',
        reviewed_by = p_reviewer_id,
        reviewed_at = now(),
        ledger_transaction_id = v_tx_id
    WHERE id = p_adjustment_id;

    RETURN v_tx_id;
END;
$$;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Staff users can view their own role
CREATE POLICY "Staff views own role" ON public.staff_users
    FOR SELECT USING (auth.uid() = id);

-- Super admins and authorized staff view staff table
CREATE POLICY "Super admins manage staff" ON public.staff_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
    );

-- Restrictions visible to staff members
CREATE POLICY "Staff views restrictions" ON public.account_restrictions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- Balance adjustments visible to staff members
CREATE POLICY "Staff views balance adjustments" ON public.balance_adjustments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- Audit logs visible only to staff with audit read permissions
CREATE POLICY "Staff views audit logs" ON public.admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'compliance', 'finance') AND is_active = true
        )
    );

-- Notes visible to staff
CREATE POLICY "Staff views notes" ON public.admin_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- Settings readable by staff, editable by super_admin
CREATE POLICY "Staff views settings" ON public.platform_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Super admins update settings" ON public.platform_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.staff_users 
            WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
    );

-- Deny all unauthenticated or client-side direct mutations on privileged tables
CREATE POLICY "Deny client insert on admin_audit_logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on admin_audit_logs" ON public.admin_audit_logs FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on admin_audit_logs" ON public.admin_audit_logs FOR DELETE USING (false);
