-- ==============================================================================
-- MIGRATION: 00003_transactions_notifications.sql
-- DESCRIPTION: Internal Transfers, Two-Phase Withdrawals, RFQ Swaps,
--              In-App Notifications, and Security Preferences.
-- ==============================================================================

-- 1. ENUMS AND CUSTOM TYPES
DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM (
        'INITIATED',
        'RESERVED',
        'BROADCASTED',
        'CONFIRMED',
        'FAILED',
        'REVERSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE swap_quote_status AS ENUM (
        'ACTIVE',
        'EXECUTED',
        'EXPIRED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'FUNDING_CONFIRMED',
        'DEPOSIT_DETECTED',
        'DEPOSIT_CONFIRMED',
        'TRANSFER_SENT',
        'TRANSFER_RECEIVED',
        'WITHDRAWAL_INITIATED',
        'WITHDRAWAL_CONFIRMED',
        'WITHDRAWAL_FAILED',
        'SWAP_COMPLETED',
        'SECURITY_ALERT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. WITHDRAWAL REQUESTS TABLE (Two-Phase Execution)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    network_id VARCHAR(20) NOT NULL REFERENCES public.supported_networks(network_id) ON DELETE RESTRICT,
    destination_address VARCHAR(128) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    network_fee NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (network_fee >= 0),
    total_debit NUMERIC(36, 18) NOT NULL CHECK (total_debit >= amount),
    status withdrawal_status NOT NULL DEFAULT 'INITIATED',
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    provider_operation_id VARCHAR(128),
    tx_hash VARCHAR(128),
    reservation_tx_id UUID REFERENCES public.ledger_transactions(id),
    settlement_tx_id UUID REFERENCES public.ledger_transactions(id),
    error_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_op ON public.withdrawal_requests(provider_operation_id);

-- 3. SWAP QUOTES TABLE (30-second RFQ Rate Lock)
CREATE TABLE IF NOT EXISTS public.swap_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    source_asset VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    destination_asset VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    source_amount NUMERIC(36, 18) NOT NULL CHECK (source_amount > 0),
    destination_amount NUMERIC(36, 18) NOT NULL CHECK (destination_amount > 0),
    net_received_amount NUMERIC(36, 18) NOT NULL CHECK (net_received_amount > 0),
    platform_fee_amount NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (platform_fee_amount >= 0),
    exchange_rate NUMERIC(36, 18) NOT NULL CHECK (exchange_rate > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status swap_quote_status NOT NULL DEFAULT 'ACTIVE',
    idempotency_key VARCHAR(128) UNIQUE,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swap_quotes_user ON public.swap_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_quotes_status ON public.swap_quotes(status);

-- 4. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    link_url VARCHAR(256),
    idempotency_key VARCHAR(128) UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- 5. USER NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_funding_notifications BOOLEAN NOT NULL DEFAULT true,
    email_transfer_notifications BOOLEAN NOT NULL DEFAULT true,
    email_withdrawal_notifications BOOLEAN NOT NULL DEFAULT true,
    email_security_alerts BOOLEAN NOT NULL DEFAULT true,
    in_app_funding_notifications BOOLEAN NOT NULL DEFAULT true,
    in_app_transfer_notifications BOOLEAN NOT NULL DEFAULT true,
    in_app_withdrawal_notifications BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. STORED PROCEDURES & DOUBLE-ENTRY BUSINESS LOGIC

-- 6.1 Atomic Internal User-to-User Transfer
CREATE OR REPLACE FUNCTION public.execute_internal_transfer(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_asset VARCHAR,
    p_amount NUMERIC,
    p_reference_id VARCHAR,
    p_idempotency_key VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_sender_acct UUID;
    v_recipient_acct UUID;
    v_current_available NUMERIC;
    v_tx_id UUID;
    v_credit_entry_id UUID;
BEGIN
    -- Idempotency check
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    -- Prohibit self-transfer
    IF p_sender_id = p_recipient_id THEN
        RAISE EXCEPTION 'ERR_SELF_TRANSFER_PROHIBITED';
    END IF;

    -- Resolve sender and recipient accounts
    v_sender_acct := public.get_or_create_user_account(p_sender_id, 'USER_AVAILABLE', p_asset);
    v_recipient_acct := public.get_or_create_user_account(p_recipient_id, 'USER_AVAILABLE', p_asset);

    -- Lock sender balance row exclusively (concurrency control & race protection)
    SELECT available_balance INTO v_current_available
    FROM public.wallet_balances
    WHERE account_id = v_sender_acct
    FOR UPDATE;

    IF v_current_available IS NULL OR v_current_available < p_amount THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS';
    END IF;

    -- Lock recipient balance row
    PERFORM 1 FROM public.wallet_balances WHERE account_id = v_recipient_acct FOR UPDATE;

    -- Create journal header
    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, metadata, posted_at
    ) VALUES (
        'INTERNAL_TRANSFER', 'POSTED', p_reference_id, p_idempotency_key, p_metadata, now()
    ) RETURNING id INTO v_tx_id;

    -- Double Entry:
    -- 1. DEBIT Sender USER_AVAILABLE (liability decreases)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_sender_acct, 'DEBIT', p_amount, p_asset);

    -- 2. CREDIT Recipient USER_AVAILABLE (liability increases)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_recipient_acct, 'CREDIT', p_amount, p_asset)
    RETURNING id INTO v_credit_entry_id;

    -- Update materialized balance cache
    UPDATE public.wallet_balances 
    SET available_balance = available_balance - p_amount, updated_at = now()
    WHERE account_id = v_sender_acct;

    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_amount,
        last_entry_id = v_credit_entry_id,
        updated_at = now()
    WHERE account_id = v_recipient_acct;

    RETURN v_tx_id;
END;
$$;

-- 6.2 Two-Phase Withdrawal: Phase 1 (Atomic Reservation)
CREATE OR REPLACE FUNCTION public.reserve_withdrawal_funds(
    p_user_id UUID,
    p_asset VARCHAR,
    p_total_debit NUMERIC,
    p_idempotency_key VARCHAR,
    p_reference_id VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_available_acct UUID;
    v_reserved_acct UUID;
    v_current_available NUMERIC;
    v_tx_id UUID;
BEGIN
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    v_available_acct := public.get_or_create_user_account(p_user_id, 'USER_AVAILABLE', p_asset);
    v_reserved_acct := public.get_or_create_user_account(p_user_id, 'USER_RESERVED', p_asset);

    -- Lock available balance
    SELECT available_balance INTO v_current_available
    FROM public.wallet_balances
    WHERE account_id = v_available_acct
    FOR UPDATE;

    IF v_current_available IS NULL OR v_current_available < p_total_debit THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS';
    END IF;

    -- Journal Header
    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, posted_at
    ) VALUES (
        'EXTERNAL_WITHDRAWAL', 'POSTED', p_reference_id, p_idempotency_key, now()
    ) RETURNING id INTO v_tx_id;

    -- Move from AVAILABLE to RESERVED:
    -- DEBIT USER_AVAILABLE
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_available_acct, 'DEBIT', p_total_debit, p_asset);

    -- CREDIT USER_RESERVED
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_reserved_acct, 'CREDIT', p_total_debit, p_asset);

    -- Update balances
    UPDATE public.wallet_balances 
    SET available_balance = available_balance - p_total_debit, updated_at = now()
    WHERE account_id = v_available_acct;

    UPDATE public.wallet_balances 
    SET reserved_balance = reserved_balance + p_total_debit, updated_at = now()
    WHERE account_id = v_reserved_acct;

    RETURN v_tx_id;
END;
$$;

-- 6.3 Two-Phase Withdrawal: Phase 2a (Final Settlement upon On-Chain Broadcast)
CREATE OR REPLACE FUNCTION public.settle_withdrawal_funds(
    p_user_id UUID,
    p_asset VARCHAR,
    p_net_amount NUMERIC,
    p_fee_amount NUMERIC,
    p_tx_hash VARCHAR,
    p_idempotency_key VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_reserved_acct UUID;
    v_custody_clearing UUID;
    v_fee_revenue UUID;
    v_total_debit NUMERIC := p_net_amount + p_fee_amount;
    v_current_reserved NUMERIC;
    v_tx_id UUID;
BEGIN
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    v_reserved_acct := public.get_or_create_user_account(p_user_id, 'USER_RESERVED', p_asset);
    v_custody_clearing := public.get_or_create_system_account('CUSTODY_CLEARING', p_asset);

    -- Lock reserved balance
    SELECT reserved_balance INTO v_current_reserved
    FROM public.wallet_balances
    WHERE account_id = v_reserved_acct
    FOR UPDATE;

    IF v_current_reserved IS NULL OR v_current_reserved < v_total_debit THEN
        RAISE EXCEPTION 'ERR_RESERVED_BALANCE_DEFICIT';
    END IF;

    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, external_provider_ref, posted_at
    ) VALUES (
        'EXTERNAL_WITHDRAWAL', 'POSTED', 'WDL-SETTLE-' || upper(substr(md5(random()::text), 1, 8)),
        p_idempotency_key, p_tx_hash, now()
    ) RETURNING id INTO v_tx_id;

    -- DEBIT USER_RESERVED (total)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_reserved_acct, 'DEBIT', v_total_debit, p_asset);

    -- CREDIT CUSTODY_CLEARING (net on-chain amount)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_custody_clearing, 'CREDIT', p_net_amount, p_asset);

    -- CREDIT FEE_REVENUE (platform fee, if any)
    IF p_fee_amount > 0 THEN
        v_fee_revenue := public.get_or_create_system_account('FEE_REVENUE', p_asset);
        INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
        VALUES (v_tx_id, v_fee_revenue, 'CREDIT', p_fee_amount, p_asset);
    END IF;

    -- Update balances
    UPDATE public.wallet_balances 
    SET reserved_balance = reserved_balance - v_total_debit, updated_at = now()
    WHERE account_id = v_reserved_acct;

    UPDATE public.wallet_balances 
    SET available_balance = available_balance - p_net_amount, updated_at = now()
    WHERE account_id = v_custody_clearing;

    RETURN v_tx_id;
END;
$$;

-- 6.4 Two-Phase Withdrawal: Phase 2b (Compensating Rollback upon Failure)
CREATE OR REPLACE FUNCTION public.rollback_withdrawal_funds(
    p_user_id UUID,
    p_asset VARCHAR,
    p_total_debit NUMERIC,
    p_idempotency_key VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_available_acct UUID;
    v_reserved_acct UUID;
    v_tx_id UUID;
BEGIN
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    v_available_acct := public.get_or_create_user_account(p_user_id, 'USER_AVAILABLE', p_asset);
    v_reserved_acct := public.get_or_create_user_account(p_user_id, 'USER_RESERVED', p_asset);

    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, posted_at
    ) VALUES (
        'EXTERNAL_WITHDRAWAL', 'REVERSED', 'WDL-ROLLBACK-' || upper(substr(md5(random()::text), 1, 8)),
        p_idempotency_key, now()
    ) RETURNING id INTO v_tx_id;

    -- Return from RESERVED to AVAILABLE:
    -- DEBIT USER_RESERVED
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_reserved_acct, 'DEBIT', p_total_debit, p_asset);

    -- CREDIT USER_AVAILABLE
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_available_acct, 'CREDIT', p_total_debit, p_asset);

    UPDATE public.wallet_balances 
    SET reserved_balance = reserved_balance - p_total_debit, updated_at = now()
    WHERE account_id = v_reserved_acct;

    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_total_debit, updated_at = now()
    WHERE account_id = v_available_acct;

    RETURN v_tx_id;
END;
$$;

-- 6.5 Atomic Multi-Asset Swap Execution (Balanced via SWAP_CLEARING)
CREATE OR REPLACE FUNCTION public.execute_swap_settlement(
    p_user_id UUID,
    p_source_asset VARCHAR,
    p_source_amount NUMERIC,
    p_destination_asset VARCHAR,
    p_destination_amount NUMERIC,
    p_fee_amount NUMERIC,
    p_reference_id VARCHAR,
    p_idempotency_key VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_user_source_acct UUID;
    v_user_dest_acct UUID;
    v_swap_clearing_source UUID;
    v_swap_clearing_dest UUID;
    v_fee_revenue_dest UUID;
    v_current_available NUMERIC;
    v_tx_id UUID;
BEGIN
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    v_user_source_acct := public.get_or_create_user_account(p_user_id, 'USER_AVAILABLE', p_source_asset);
    v_user_dest_acct := public.get_or_create_user_account(p_user_id, 'USER_AVAILABLE', p_destination_asset);
    v_swap_clearing_source := public.get_or_create_system_account('SWAP_CLEARING', p_source_asset);
    v_swap_clearing_dest := public.get_or_create_system_account('SWAP_CLEARING', p_destination_asset);

    -- Lock user source balance
    SELECT available_balance INTO v_current_available
    FROM public.wallet_balances
    WHERE account_id = v_user_source_acct
    FOR UPDATE;

    IF v_current_available IS NULL OR v_current_available < p_source_amount THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS';
    END IF;

    -- Create journal header
    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, posted_at
    ) VALUES (
        'SWAP_CONVERSION', 'POSTED', p_reference_id, p_idempotency_key, now()
    ) RETURNING id INTO v_tx_id;

    -- LEG 1: Source Asset (Balanced: Debits = Credits = p_source_amount)
    -- DEBIT User USER_AVAILABLE (Source Asset)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_user_source_acct, 'DEBIT', p_source_amount, p_source_asset);

    -- CREDIT System SWAP_CLEARING (Source Asset)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_swap_clearing_source, 'CREDIT', p_source_amount, p_source_asset);

    -- LEG 2: Destination Asset (Balanced: Debits = Credits = p_destination_amount + p_fee_amount)
    -- DEBIT System SWAP_CLEARING (Destination Asset)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_swap_clearing_dest, 'DEBIT', p_destination_amount + p_fee_amount, p_destination_asset);

    -- CREDIT User USER_AVAILABLE (Destination Asset net received)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_user_dest_acct, 'CREDIT', p_destination_amount, p_destination_asset);

    -- CREDIT System FEE_REVENUE (Destination Asset platform fee, if any)
    IF p_fee_amount > 0 THEN
        v_fee_revenue_dest := public.get_or_create_system_account('FEE_REVENUE', p_destination_asset);
        INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
        VALUES (v_tx_id, v_fee_revenue_dest, 'CREDIT', p_fee_amount, p_destination_asset);
    END IF;

    -- Update materialized balances
    UPDATE public.wallet_balances 
    SET available_balance = available_balance - p_source_amount, updated_at = now()
    WHERE account_id = v_user_source_acct;

    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_destination_amount, updated_at = now()
    WHERE account_id = v_user_dest_acct;

    RETURN v_tx_id;
END;
$$;

-- 6.6 Privacy-Conscious Recipient Discovery
CREATE OR REPLACE FUNCTION public.resolve_transfer_recipient(
    p_identifier TEXT
) RETURNS TABLE (
    recipient_id UUID,
    masked_identifier TEXT,
    display_name TEXT,
    kyc_tier SMALLINT,
    is_verified BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_clean TEXT := lower(trim(p_identifier));
    v_uid UUID;
    v_first TEXT;
    v_last TEXT;
    v_tier SMALLINT;
    v_masked TEXT;
BEGIN
    -- Check by email in auth.users
    SELECT u.id, p.first_name, p.last_name, p.kyc_tier
    INTO v_uid, v_first, v_last, v_tier
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
    WHERE lower(u.email) = v_clean
    LIMIT 1;

    -- If not found, check by phone number in user_profiles
    IF v_uid IS NULL THEN
        SELECT p.id, p.first_name, p.last_name, p.kyc_tier
        INTO v_uid, v_first, v_last, v_tier
        FROM public.user_profiles p
        WHERE regexp_replace(p.phone_number, '[^0-9]', '', 'g') = regexp_replace(v_clean, '[^0-9]', '', 'g')
        LIMIT 1;
    END IF;

    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    -- Compute privacy-preserving masked identifier
    IF position('@' in v_clean) > 0 THEN
        v_masked := substr(v_clean, 1, 2) || '***@' || split_part(v_clean, '@', 2);
    ELSE
        v_masked := '+' || substr(v_clean, 1, 4) || '***' || substr(v_clean, length(v_clean) - 3);
    END IF;

    RETURN QUERY
    SELECT
        v_uid AS recipient_id,
        v_masked AS masked_identifier,
        (COALESCE(v_first, 'User') || ' ' || CASE WHEN length(v_last) > 0 THEN substr(v_last, 1, 1) || '.' ELSE '' END) AS display_name,
        COALESCE(v_tier, 1::SMALLINT) AS kyc_tier,
        (COALESCE(v_tier, 1::SMALLINT) >= 1) AS is_verified;
END;
$$;


-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User views own swap quotes" ON public.swap_quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User views own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User updates own notifications read state" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User views own notification preferences" ON public.user_notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User updates own notification preferences" ON public.user_notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deny client mutations on transactional tables
CREATE POLICY "Deny client insert on withdrawal_requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on withdrawal_requests" ON public.withdrawal_requests FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on withdrawal_requests" ON public.withdrawal_requests FOR DELETE USING (false);

CREATE POLICY "Deny client insert on swap_quotes" ON public.swap_quotes FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on swap_quotes" ON public.swap_quotes FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on swap_quotes" ON public.swap_quotes FOR DELETE USING (false);
