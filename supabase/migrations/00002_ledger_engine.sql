-- ==============================================================================
-- MIGRATION: 00002_ledger_engine.sql
-- DESCRIPTION: Double-Entry Ledger, Financial Accounts, Funding, Deposits,
--              Webhook Deduplication, and Auditing.
-- COMPLIANCE: Immutable append-only ledger, strict debit/credit equilibrium,
--             zero floating-point math, non-negative balance checks, RLS.
-- ==============================================================================

-- 1. ENUMS AND CUSTOM TYPES
DO $$ BEGIN
    CREATE TYPE account_category AS ENUM ('LIABILITY', 'ASSET', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ledger_account_type AS ENUM (
        'USER_AVAILABLE',
        'USER_RESERVED',
        'FIAT_CLEARING',
        'CUSTODY_CLEARING',
        'SWAP_CLEARING',
        'FEE_REVENUE',
        'NETWORK_EXPENSE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ledger_tx_status AS ENUM (
        'INITIATED',
        'PENDING',
        'POSTED',
        'FAILED',
        'REVERSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ledger_tx_type AS ENUM (
        'FIAT_DEPOSIT',
        'CRYPTO_DEPOSIT',
        'INTERNAL_TRANSFER',
        'EXTERNAL_WITHDRAWAL',
        'SWAP_CONVERSION',
        'FEE_ASSESSMENT',
        'SYSTEM_RECONCILIATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_direction AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE funding_status AS ENUM (
        'PENDING',
        'SUCCESSFUL',
        'FAILED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crypto_deposit_status AS ENUM (
        'DETECTED',
        'CONFIRMED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. SUPPORTED ASSETS & NETWORKS SPECIFICATION
CREATE TABLE IF NOT EXISTS public.supported_assets (
    ticker VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    decimals INT NOT NULL CHECK (decimals >= 0 AND decimals <= 18),
    asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('FIAT', 'CRYPTO')),
    min_deposit NUMERIC(36, 18) NOT NULL DEFAULT 0,
    deposit_fee_percentage NUMERIC(5, 4) NOT NULL DEFAULT 0, -- e.g. 0.0050 = 0.5%
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supported_networks (
    network_id VARCHAR(20) PRIMARY KEY, -- 'POLYGON', 'ARBITRUM', 'BASE', 'TRON', 'ETHEREUM', 'SOLANA'
    name VARCHAR(50) NOT NULL,
    chain_id INT, -- NULL for non-EVM like TRON/SOLANA
    confirmation_depth INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_network_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    network_id VARCHAR(20) NOT NULL REFERENCES public.supported_networks(network_id) ON DELETE RESTRICT,
    contract_address VARCHAR(128), -- NULL for native assets
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_asset_network UNIQUE (asset_ticker, network_id)
);

-- 3. CORE LEDGER TABLES

-- 3.1 Ledger Accounts (User & System accounts)
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT, -- NULL for system platform accounts
    account_type ledger_account_type NOT NULL,
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_account_asset UNIQUE (user_id, account_type, asset_ticker)
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_user ON public.ledger_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_type_asset ON public.ledger_accounts(account_type, asset_ticker);

-- 3.2 Ledger Transactions (Journal Headers)
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type ledger_tx_type NOT NULL,
    status ledger_tx_status NOT NULL DEFAULT 'INITIATED',
    reference_id VARCHAR(64) NOT NULL UNIQUE, -- Human-readable ref e.g. TX-20261016-XYZ
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    external_provider_ref VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx_idempotency ON public.ledger_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_external_ref ON public.ledger_transactions(external_provider_ref);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_status ON public.ledger_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_created ON public.ledger_transactions(created_at DESC);

-- 3.3 Ledger Entries (Immutable Debit & Credit Lines)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    direction entry_direction NOT NULL,
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON public.ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_asset ON public.ledger_entries(asset_ticker);

-- 3.4 Materialized Wallet Balances Cache
CREATE TABLE IF NOT EXISTS public.wallet_balances (
    account_id UUID PRIMARY KEY REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    available_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    reserved_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
    pending_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    last_entry_id UUID REFERENCES public.ledger_entries(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_balances_user ON public.wallet_balances(user_id);

-- 4. FUNDING & CRYPTO DEPOSIT TRACKING TABLES

-- 4.1 Fiat Funding Sessions (Korapay / NGN on-ramp)
CREATE TABLE IF NOT EXISTS public.funding_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount_ngn NUMERIC(18, 2) NOT NULL CHECK (amount_ngn >= 100), -- Minimum ₦100
    fee_ngn NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (fee_ngn >= 0),
    provider_reference VARCHAR(128) NOT NULL UNIQUE,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'VIRTUAL_ACCOUNT', -- 'VIRTUAL_ACCOUNT' | 'CHECKOUT_URL'
    virtual_bank_name VARCHAR(100),
    virtual_account_number VARCHAR(30),
    virtual_account_name VARCHAR(100),
    checkout_url TEXT,
    status funding_status NOT NULL DEFAULT 'PENDING',
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_funding_sessions_user ON public.funding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_funding_sessions_ref ON public.funding_sessions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_funding_sessions_status ON public.funding_sessions(status);

-- 4.2 Crypto Deposit Addresses
CREATE TABLE IF NOT EXISTS public.crypto_deposit_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    network_id VARCHAR(20) NOT NULL REFERENCES public.supported_networks(network_id) ON DELETE RESTRICT,
    address VARCHAR(128) NOT NULL,
    memo_or_tag VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_asset_network_addr UNIQUE (user_id, asset_ticker, network_id)
);

CREATE INDEX IF NOT EXISTS idx_deposit_addr_lookup ON public.crypto_deposit_addresses(address, network_id);
CREATE INDEX IF NOT EXISTS idx_deposit_addr_user ON public.crypto_deposit_addresses(user_id);

-- 4.3 Inbound Crypto Deposits
CREATE TABLE IF NOT EXISTS public.crypto_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    asset_ticker VARCHAR(10) NOT NULL REFERENCES public.supported_assets(ticker) ON DELETE RESTRICT,
    network_id VARCHAR(20) NOT NULL REFERENCES public.supported_networks(network_id) ON DELETE RESTRICT,
    tx_hash VARCHAR(128) NOT NULL,
    from_address VARCHAR(128) NOT NULL,
    to_address VARCHAR(128) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    confirmations INT NOT NULL DEFAULT 0,
    required_confirmations INT NOT NULL DEFAULT 30,
    status crypto_deposit_status NOT NULL DEFAULT 'DETECTED',
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_deposit_tx_network UNIQUE (network_id, tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_crypto_deposits_user ON public.crypto_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_status ON public.crypto_deposits(status);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_tx ON public.crypto_deposits(tx_hash);

-- 4.4 Webhook Deduplication Table
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- 'KORAPAY', 'CUSTODY_PROVIDER'
    event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(256),
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSED', -- 'PROCESSED', 'FAILED', 'IGNORED'
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_lookup ON public.webhook_events(provider, event_id);

-- 4.5 Financial Audit Log Table
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.financial_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.financial_audit_logs(event_type, created_at DESC);

-- 5. ATOMIC STORED PROCEDURES & RECONCILIATION FUNCTIONS

-- 5.1 Helper: Get or Create User Account
CREATE OR REPLACE FUNCTION public.get_or_create_user_account(
    p_user_id UUID,
    p_account_type ledger_account_type,
    p_asset VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_account_id UUID;
BEGIN
    SELECT id INTO v_account_id
    FROM public.ledger_accounts
    WHERE user_id = p_user_id 
      AND account_type = p_account_type 
      AND asset_ticker = p_asset;

    IF v_account_id IS NULL THEN
        INSERT INTO public.ledger_accounts (user_id, account_type, asset_ticker)
        VALUES (p_user_id, p_account_type, p_asset)
        RETURNING id INTO v_account_id;

        -- Initialize materialized balance record
        INSERT INTO public.wallet_balances (account_id, user_id, asset_ticker, available_balance, reserved_balance, pending_balance)
        VALUES (v_account_id, p_user_id, p_asset, 0, 0, 0)
        ON CONFLICT (account_id) DO NOTHING;
    END IF;

    RETURN v_account_id;
END;
$$;

-- 5.2 Helper: Get or Create System Account
CREATE OR REPLACE FUNCTION public.get_or_create_system_account(
    p_account_type ledger_account_type,
    p_asset VARCHAR
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_account_id UUID;
BEGIN
    SELECT id INTO v_account_id
    FROM public.ledger_accounts
    WHERE user_id IS NULL 
      AND account_type = p_account_type 
      AND asset_ticker = p_asset;

    IF v_account_id IS NULL THEN
        INSERT INTO public.ledger_accounts (user_id, account_type, asset_ticker)
        VALUES (NULL, p_account_type, p_asset)
        RETURNING id INTO v_account_id;

        INSERT INTO public.wallet_balances (account_id, user_id, asset_ticker, available_balance, reserved_balance, pending_balance)
        VALUES (v_account_id, NULL, p_asset, 0, 0, 0)
        ON CONFLICT (account_id) DO NOTHING;
    END IF;

    RETURN v_account_id;
END;
$$;

-- 5.3 Core Procedure: Credit Verified Fiat Deposit (Add Money)
CREATE OR REPLACE FUNCTION public.credit_fiat_deposit(
    p_user_id UUID,
    p_amount_ngn NUMERIC,
    p_provider_ref VARCHAR,
    p_idempotency_key VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_system_fiat_acct UUID;
    v_user_available_acct UUID;
    v_tx_id UUID;
    v_entry_credit_id UUID;
BEGIN
    -- Idempotency check: if transaction with this idempotency key exists, return it
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    -- Resolve or initialize accounts
    v_system_fiat_acct := public.get_or_create_system_account('FIAT_CLEARING', 'NGN');
    v_user_available_acct := public.get_or_create_user_account(p_user_id, 'USER_AVAILABLE', 'NGN');

    -- Create journal transaction header
    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, external_provider_ref, metadata, posted_at
    ) VALUES (
        'FIAT_DEPOSIT', 'POSTED', 'DEP-NGN-' || upper(substr(md5(random()::text), 1, 10)),
        p_idempotency_key, p_provider_ref, p_metadata, now()
    ) RETURNING id INTO v_tx_id;

    -- Double Entry:
    -- 1. DEBIT System FIAT_CLEARING (Asset increases)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_system_fiat_acct, 'DEBIT', p_amount_ngn, 'NGN');

    -- 2. CREDIT User USER_AVAILABLE (Liability to user increases)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_user_available_acct, 'CREDIT', p_amount_ngn, 'NGN')
    RETURNING id INTO v_entry_credit_id;

    -- Update materialized cache
    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_amount_ngn,
        last_entry_id = v_entry_credit_id,
        updated_at = now()
    WHERE account_id = v_user_available_acct;

    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_amount_ngn,
        updated_at = now()
    WHERE account_id = v_system_fiat_acct;

    RETURN v_tx_id;
END;
$$;

-- 5.4 Core Procedure: Credit Verified Crypto Deposit
CREATE OR REPLACE FUNCTION public.credit_crypto_deposit(
    p_user_id UUID,
    p_asset VARCHAR,
    p_amount NUMERIC,
    p_tx_hash VARCHAR,
    p_idempotency_key VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_system_custody_acct UUID;
    v_user_available_acct UUID;
    v_tx_id UUID;
    v_entry_credit_id UUID;
BEGIN
    -- Idempotency check
    SELECT id INTO v_tx_id FROM public.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
        RETURN v_tx_id;
    END IF;

    -- Resolve accounts
    v_system_custody_acct := public.get_or_create_system_account('CUSTODY_CLEARING', p_asset);
    v_user_available_acct := public.get_or_create_user_account(p_user_id, 'USER_AVAILABLE', p_asset);

    -- Create transaction header
    INSERT INTO public.ledger_transactions (
        transaction_type, status, reference_id, idempotency_key, external_provider_ref, metadata, posted_at
    ) VALUES (
        'CRYPTO_DEPOSIT', 'POSTED', 'DEP-' || p_asset || '-' || upper(substr(md5(random()::text), 1, 10)),
        p_idempotency_key, p_tx_hash, p_metadata, now()
    ) RETURNING id INTO v_tx_id;

    -- Double Entry:
    -- 1. DEBIT System CUSTODY_CLEARING (Asset increases)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_system_custody_acct, 'DEBIT', p_amount, p_asset);

    -- 2. CREDIT User USER_AVAILABLE (Liability increases)
    INSERT INTO public.ledger_entries (transaction_id, account_id, direction, amount, asset_ticker)
    VALUES (v_tx_id, v_user_available_acct, 'CREDIT', p_amount, p_asset)
    RETURNING id INTO v_entry_credit_id;

    -- Update materialized cache
    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_amount,
        last_entry_id = v_entry_credit_id,
        updated_at = now()
    WHERE account_id = v_user_available_acct;

    UPDATE public.wallet_balances 
    SET available_balance = available_balance + p_amount,
        updated_at = now()
    WHERE account_id = v_system_custody_acct;

    RETURN v_tx_id;
END;
$$;

-- 5.5 Reconciliation Procedure: Detect Ledger Invariants & Unbalanced Entries
CREATE OR REPLACE FUNCTION public.reconcile_ledger_invariants()
RETURNS TABLE (
    transaction_id UUID,
    asset_ticker VARCHAR,
    total_debits NUMERIC,
    total_credits NUMERIC,
    discrepancy NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.transaction_id,
        e.asset_ticker,
        COALESCE(SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE 0 END), 0) AS total_debits,
        COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE -e.amount END), 0) AS discrepancy
    FROM public.ledger_entries e
    JOIN public.ledger_transactions t ON t.id = e.transaction_id
    WHERE t.status = 'POSTED'
    GROUP BY e.transaction_id, e.asset_ticker
    HAVING SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE -e.amount END) != 0;
END;
$$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.supported_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_network_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies for public asset / network catalog
CREATE POLICY "Public read supported assets" ON public.supported_assets FOR SELECT USING (is_active = true);
CREATE POLICY "Public read supported networks" ON public.supported_networks FOR SELECT USING (is_active = true);
CREATE POLICY "Public read asset network mappings" ON public.asset_network_mappings FOR SELECT USING (is_active = true);

-- Tenant Isolation: User can only view their own accounts and balances
CREATE POLICY "User views own ledger accounts" ON public.ledger_accounts 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User views own wallet balances" ON public.wallet_balances 
    FOR SELECT USING (auth.uid() = user_id);

-- User views transactions they are party to (via ledger_entries)
CREATE POLICY "User views relevant ledger transactions" ON public.ledger_transactions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ledger_entries e
            JOIN public.ledger_accounts a ON a.id = e.account_id
            WHERE e.transaction_id = ledger_transactions.id 
              AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "User views own ledger entries" ON public.ledger_entries 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ledger_accounts a
            WHERE a.id = ledger_entries.account_id 
              AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "User views own funding sessions" ON public.funding_sessions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User views own crypto deposit addresses" ON public.crypto_deposit_addresses 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User views own crypto deposits" ON public.crypto_deposits 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User views own audit logs" ON public.financial_audit_logs 
    FOR SELECT USING (auth.uid() = user_id);

-- STRICT BLOCK: Disallow direct insert/update/delete from browser on all financial ledger tables!
-- All mutations must occur via authenticated server actions utilizing service role or stored procedures!
CREATE POLICY "Deny client insert on ledger_accounts" ON public.ledger_accounts FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on ledger_accounts" ON public.ledger_accounts FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on ledger_accounts" ON public.ledger_accounts FOR DELETE USING (false);

CREATE POLICY "Deny client insert on ledger_transactions" ON public.ledger_transactions FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on ledger_transactions" ON public.ledger_transactions FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on ledger_transactions" ON public.ledger_transactions FOR DELETE USING (false);

CREATE POLICY "Deny client insert on ledger_entries" ON public.ledger_entries FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on ledger_entries" ON public.ledger_entries FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on ledger_entries" ON public.ledger_entries FOR DELETE USING (false);

CREATE POLICY "Deny client insert on wallet_balances" ON public.wallet_balances FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on wallet_balances" ON public.wallet_balances FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on wallet_balances" ON public.wallet_balances FOR DELETE USING (false);

CREATE POLICY "Deny client insert on crypto_deposits" ON public.crypto_deposits FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny client update on crypto_deposits" ON public.crypto_deposits FOR UPDATE USING (false);
CREATE POLICY "Deny client delete on crypto_deposits" ON public.crypto_deposits FOR DELETE USING (false);

CREATE POLICY "Deny client access on webhook_events" ON public.webhook_events FOR ALL USING (false);

-- 7. SEED INITIAL SUPPORTED ASSETS & NETWORKS
INSERT INTO public.supported_assets (ticker, name, decimals, asset_type, min_deposit, deposit_fee_percentage)
VALUES 
    ('NGN', 'Nigerian Naira', 2, 'FIAT', 100.00, 0.0000),
    ('USDT', 'Tether USD', 6, 'CRYPTO', 1.00, 0.0000),
    ('USDC', 'USD Coin', 6, 'CRYPTO', 1.00, 0.0000),
    ('BTC', 'Bitcoin', 8, 'CRYPTO', 0.0001, 0.0000),
    ('ETH', 'Ethereum', 18, 'CRYPTO', 0.001, 0.0000),
    ('SOL', 'Solana', 9, 'CRYPTO', 0.01, 0.0000)
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO public.supported_networks (network_id, name, chain_id, confirmation_depth)
VALUES 
    ('POLYGON', 'Polygon PoS', 137, 64),
    ('ARBITRUM', 'Arbitrum One', 42161, 32),
    ('BASE', 'Base', 8453, 30),
    ('TRON', 'Tron (TRC-20)', NULL, 20),
    ('ETHEREUM', 'Ethereum Mainnet', 1, 12),
    ('SOLANA', 'Solana', NULL, 32)
ON CONFLICT (network_id) DO NOTHING;

INSERT INTO public.asset_network_mappings (asset_ticker, network_id, contract_address)
VALUES 
    ('USDT', 'POLYGON', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'),
    ('USDT', 'ARBITRUM', '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'),
    ('USDT', 'BASE', '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'),
    ('USDT', 'TRON', 'TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t'),
    ('USDC', 'POLYGON', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'),
    ('USDC', 'ARBITRUM', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
    ('USDC', 'BASE', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
    ('ETH', 'ETHEREUM', NULL),
    ('ETH', 'ARBITRUM', NULL),
    ('ETH', 'BASE', NULL),
    ('BTC', 'POLYGON', '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'),
    ('SOL', 'SOLANA', NULL)
ON CONFLICT (asset_ticker, network_id) DO NOTHING;
