-- CONSOLIDATED DATABASE SCHEMA
-- This script consolidates all user-related tables and eliminates confusion
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: DROP ALL CONFLICTING TABLES
-- ============================================================================

-- Drop all tables that reference the old user system
DROP TABLE IF EXISTS public.draft_picks CASCADE;
DROP TABLE IF EXISTS public.user_teams CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;
DROP TABLE IF EXISTS public.user_total_points CASCADE;
DROP TABLE IF EXISTS public.user_gameweek_scores CASCADE;
DROP TABLE IF EXISTS public.player_ownership CASCADE;
DROP TABLE IF EXISTS public.player_transfers CASCADE;
DROP TABLE IF EXISTS public.user_teams_weekly CASCADE;
DROP TABLE IF EXISTS public.draft_allocations CASCADE;
DROP TABLE IF EXISTS public.user_chips CASCADE;
DROP TABLE IF EXISTS public.chip_usage CASCADE;
DROP TABLE IF EXISTS public.transfer_history CASCADE;
DROP TABLE IF EXISTS public.draft_status CASCADE;
DROP TABLE IF EXISTS public.simulation_status CASCADE;
DROP TABLE IF EXISTS public.gameweek_results CASCADE;

-- Drop the old users table (we'll use auth.users + user_profiles)
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- STEP 2: CREATE CONSOLIDATED USER SYSTEM
-- ============================================================================

-- Create user_profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_picture TEXT,
    notification_preferences JSONB DEFAULT '{
        "deadlineReminders": true,
        "deadlineSummaries": true,
        "transferNotifications": true,
        "chipNotifications": true,
        "liveScoreUpdates": false,
        "weeklyReports": true,
        "emailNotifications": true,
        "pushNotifications": true
    }',
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE CONSOLIDATED DRAFT SYSTEM
-- ============================================================================

-- Create draft_status table
CREATE TABLE IF NOT EXISTS public.draft_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_draft_active BOOLEAN DEFAULT false,
    is_draft_complete BOOLEAN DEFAULT false,
    simulation_mode BOOLEAN DEFAULT false,
    current_gameweek INTEGER DEFAULT 1,
    total_picks INTEGER DEFAULT 0,
    draft_order JSONB DEFAULT '[]',
    completed_picks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_picks table (consolidated)
CREATE TABLE IF NOT EXISTS public.draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    total_score NUMERIC DEFAULT 0.0,
    gameweek_score NUMERIC DEFAULT 0.0,
    is_captain BOOLEAN DEFAULT false,
    is_vice_captain BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, player_id)
);

-- ============================================================================
-- STEP 4: CREATE CONSOLIDATED TEAM SYSTEM
-- ============================================================================

-- Create user_teams table (consolidated)
CREATE TABLE IF NOT EXISTS public.user_teams (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    position TEXT NOT NULL,
    price NUMERIC DEFAULT 0.0,
    is_captain BOOLEAN DEFAULT false,
    is_vice_captain BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, player_id)
);

-- ============================================================================
-- STEP 5: CREATE CONSOLIDATED SIMULATION SYSTEM
-- ============================================================================

-- Create simulation_status table
CREATE TABLE IF NOT EXISTS public.simulation_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_simulation_mode BOOLEAN DEFAULT false,
    current_gameweek INTEGER DEFAULT 1,
    is_draft_complete BOOLEAN DEFAULT false,
    total_gameweeks INTEGER DEFAULT 38,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gameweek_results table
CREATE TABLE IF NOT EXISTS public.gameweek_results (
    id SERIAL PRIMARY KEY,
    gameweek INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    position TEXT NOT NULL,
    points INTEGER NOT NULL,
    goals_scored INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    clean_sheets INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gameweek, player_id)
);

-- Create user_gameweek_scores table
CREATE TABLE IF NOT EXISTS public.user_gameweek_scores (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    gameweek INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    captain_points INTEGER DEFAULT 0,
    vice_captain_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gameweek)
);

-- Create user_total_points table
CREATE TABLE IF NOT EXISTS public.user_total_points (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    gameweeks_played INTEGER DEFAULT 0,
    average_points NUMERIC DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- STEP 6: CREATE CONSOLIDATED ACTIVITY SYSTEM
-- ============================================================================

-- Create user_activity table
CREATE TABLE IF NOT EXISTS public.user_activity (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweek_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_total_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================================================

-- User profiles policies
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Anyone can read all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Draft status policies
CREATE POLICY "Anyone can read draft status" ON public.draft_status
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage draft status" ON public.draft_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Draft picks policies
CREATE POLICY "Users can read all draft picks" ON public.draft_picks
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage draft picks" ON public.draft_picks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- User teams policies
CREATE POLICY "Users can read all user teams" ON public.user_teams
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage user teams" ON public.user_teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Simulation policies
CREATE POLICY "Anyone can read simulation status" ON public.simulation_status
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage simulation status" ON public.simulation_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Gameweek results policies
CREATE POLICY "Anyone can read gameweek results" ON public.gameweek_results
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage gameweek results" ON public.gameweek_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- User scores policies
CREATE POLICY "Users can read all user scores" ON public.user_gameweek_scores
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage user scores" ON public.user_gameweek_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- User total points policies
CREATE POLICY "Users can read all total points" ON public.user_total_points
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage total points" ON public.user_total_points
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- User activity policies
CREATE POLICY "Users can read all activity" ON public.user_activity
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage activity" ON public.user_activity
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================================================
-- STEP 9: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);

-- Draft picks indexes
CREATE INDEX IF NOT EXISTS idx_draft_picks_user_id ON public.draft_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_player_id ON public.draft_picks(player_id);

-- User teams indexes
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON public.user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_player_id ON public.user_teams(player_id);

-- Gameweek results indexes
CREATE INDEX IF NOT EXISTS idx_gameweek_results_gameweek ON public.gameweek_results(gameweek);
CREATE INDEX IF NOT EXISTS idx_gameweek_results_player_id ON public.gameweek_results(player_id);

-- User scores indexes
CREATE INDEX IF NOT EXISTS idx_user_gameweek_scores_user_id ON public.user_gameweek_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gameweek_scores_gameweek ON public.user_gameweek_scores(gameweek);

-- User total points indexes
CREATE INDEX IF NOT EXISTS idx_user_total_points_user_id ON public.user_total_points(user_id);

-- User activity indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at);

-- ============================================================================
-- STEP 10: INSERT INITIAL DATA
-- ============================================================================

-- Insert initial draft status
INSERT INTO public.draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek, total_picks) VALUES
(1, false, false, false, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert initial simulation status
INSERT INTO public.simulation_status (id, is_simulation_mode, current_gameweek, is_draft_complete) VALUES
(1, false, 1, false)
ON CONFLICT (id) DO NOTHING;

SELECT 'Consolidated database schema created successfully!' as status;
