-- ==============================================================================
-- SOLPLAY CLOUD DATABASE SCHEMA (PostgreSQL / Supabase)
-- ==============================================================================
-- This database schema gives each tester and user a permanent, globally unique
-- account that syncs bets, betslips, and balances across all devices in real-time.
-- ==============================================================================

-- 1. USERS TABLE
-- Tracks globally unique tester and player accounts
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,      -- 100% globally unique Solana address
    username TEXT UNIQUE,                    -- Optional unique handle (e.g. @david_sol)
    display_name TEXT,                       -- Friendly display name (e.g. David)
    avatar_url TEXT,
    balance_sol NUMERIC(14, 4) DEFAULT 10.0000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WAGERS TABLE
-- Stores every single bet and multi-leg accumulator placed on SolPlay
CREATE TABLE IF NOT EXISTS public.wagers (
    id TEXT PRIMARY KEY,                     -- Ticket ID, e.g. #SP-849201
    user_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    is_accumulator BOOLEAN DEFAULT false,
    legs_count INTEGER DEFAULT 1,
    legs JSONB NOT NULL,                     -- Array of individual legs with fixtures & status
    game_id INTEGER,                         -- Primary fixture ID
    outcome_label TEXT NOT NULL,             -- Pick or "4-Fold Acca (5.20x)"
    amount_sol NUMERIC(12, 4) NOT NULL,      -- Wagered SOL
    total_odds NUMERIC(10, 2) NOT NULL,      -- Combined decimal multiplier
    bonus_percent INTEGER DEFAULT 0,         -- Acca boost percentage
    potential_payout NUMERIC(14, 4) NOT NULL,-- Total SOL payout if won
    status TEXT DEFAULT 'PENDING',           -- 'PENDING', 'WON', 'LOST', 'VOID', 'CASHED_OUT'
    auto_cashout_target NUMERIC(14, 4),      -- Optional automated cashout profit threshold
    copy_creator TEXT,                       -- Tipster wallet address for 2% copy royalties
    claimed BOOLEAN DEFAULT false,           -- True if winnings disbursed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- Idempotent migrations for existing deployments
ALTER TABLE public.wagers ADD COLUMN IF NOT EXISTS auto_cashout_target NUMERIC(14, 4);
ALTER TABLE public.wagers ADD COLUMN IF NOT EXISTS copy_creator TEXT;

-- 3. BETSLIPS TABLE
-- Real-time cloud persistence of user selections (never clears on reload or device switch)
CREATE TABLE IF NOT EXISTS public.betslips (
    user_wallet TEXT PRIMARY KEY REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    selections JSONB NOT NULL DEFAULT '[]'::jsonb,
    betslip_mode TEXT DEFAULT 'accumulator',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast Indexes for Queries and Dashboards
CREATE INDEX IF NOT EXISTS idx_wagers_user_wallet ON public.wagers(user_wallet);
CREATE INDEX IF NOT EXISTS idx_wagers_status ON public.wagers(status);
CREATE INDEX IF NOT EXISTS idx_wagers_created_at ON public.wagers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betslips ENABLE ROW LEVEL SECURITY;

-- Transparent Public Policies (Permit read/write for testers with anon key)
DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
CREATE POLICY "Allow public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to wagers" ON public.wagers;
CREATE POLICY "Allow public access to wagers" ON public.wagers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to betslips" ON public.betslips;
CREATE POLICY "Allow public access to betslips" ON public.betslips FOR ALL USING (true) WITH CHECK (true);
