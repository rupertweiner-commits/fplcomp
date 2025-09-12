-- Enhanced Gameweek Tracking System
-- This creates a comprehensive system for tracking gameweek scores over time

-- 1. ENHANCED PLAYER PERFORMANCE TRACKING

-- Player performance per gameweek (detailed stats)
CREATE TABLE IF NOT EXISTS public.player_gameweek_performance (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    gameweek INTEGER NOT NULL,
    season TEXT DEFAULT '2024-25',
    
    -- Basic stats
    minutes_played INTEGER DEFAULT 0,
    goals_scored INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    clean_sheets INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    own_goals INTEGER DEFAULT 0,
    penalties_saved INTEGER DEFAULT 0,
    penalties_missed INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    
    -- FPL specific stats
    total_points DECIMAL(4,1) DEFAULT 0.0,
    bonus_points INTEGER DEFAULT 0,
    bps INTEGER DEFAULT 0,
    influence DECIMAL(4,1) DEFAULT 0.0,
    creativity DECIMAL(4,1) DEFAULT 0.0,
    threat DECIMAL(4,1) DEFAULT 0.0,
    ict_index DECIMAL(4,1) DEFAULT 0.0,
    
    -- Availability
    was_available BOOLEAN DEFAULT true,
    availability_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, gameweek, season)
);

-- 2. USER TEAM COMPOSITION HISTORY

-- User team composition per gameweek (snapshot)
CREATE TABLE IF NOT EXISTS public.user_team_snapshots (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    season TEXT DEFAULT '2024-25',
    
    -- Team composition (JSON for flexibility)
    team_composition JSONB NOT NULL,
    
    -- Formation
    formation TEXT,
    
    -- Transfers made this gameweek
    transfers_made INTEGER DEFAULT 0,
    transfer_cost INTEGER DEFAULT 0,
    
    -- Chips used
    chip_used TEXT,
    chip_points DECIMAL(4,1) DEFAULT 0.0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, gameweek, season)
);

-- 3. ENHANCED USER GAMEWEEK SCORES

-- Drop and recreate with enhanced structure
DROP TABLE IF EXISTS public.user_gameweek_scores CASCADE;

CREATE TABLE public.user_gameweek_scores (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    season TEXT DEFAULT '2024-25',
    
    -- Score breakdown
    total_points DECIMAL(6,1) DEFAULT 0.0,
    starting_xi_points DECIMAL(6,1) DEFAULT 0.0,
    bench_points DECIMAL(6,1) DEFAULT 0.0,
    captain_points DECIMAL(6,1) DEFAULT 0.0,
    vice_captain_points DECIMAL(6,1) DEFAULT 0.0,
    
    -- Chip effects
    chip_used TEXT,
    chip_points DECIMAL(6,1) DEFAULT 0.0,
    
    -- Transfer costs
    transfer_cost INTEGER DEFAULT 0,
    
    -- Performance metrics
    rank_this_gameweek INTEGER,
    points_above_average DECIMAL(6,1) DEFAULT 0.0,
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, gameweek, season)
);

-- 4. TRANSFER HISTORY TRACKING

CREATE TABLE IF NOT EXISTS public.user_transfer_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    season TEXT DEFAULT '2024-25',
    
    -- Transfer details
    player_out_id INTEGER NOT NULL,
    player_out_name TEXT NOT NULL,
    player_in_id INTEGER NOT NULL,
    player_in_name TEXT NOT NULL,
    
    -- Transfer costs
    transfer_cost INTEGER DEFAULT 0,
    is_free_transfer BOOLEAN DEFAULT true,
    
    -- Timing
    transfer_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CHIP USAGE HISTORY

CREATE TABLE IF NOT EXISTS public.user_chip_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    season TEXT DEFAULT '2024-25',
    
    -- Chip details
    chip_type TEXT NOT NULL,
    points_gained DECIMAL(6,1) DEFAULT 0.0,
    
    -- Context
    team_value_before DECIMAL(6,1),
    team_value_after DECIMAL(6,1),
    
    -- Metadata
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ENHANCED USER TOTALS WITH TRENDS

-- Drop and recreate with enhanced structure
DROP TABLE IF EXISTS public.user_total_points CASCADE;

CREATE TABLE public.user_total_points (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    season TEXT DEFAULT '2024-25',
    
    -- Current totals
    total_points DECIMAL(8,1) DEFAULT 0.0,
    gameweeks_played INTEGER DEFAULT 0,
    average_points DECIMAL(6,2) DEFAULT 0.0,
    
    -- Performance metrics
    highest_gameweek_score DECIMAL(6,1) DEFAULT 0.0,
    lowest_gameweek_score DECIMAL(6,1) DEFAULT 0.0,
    current_rank INTEGER,
    best_rank INTEGER,
    worst_rank INTEGER,
    
    -- Consistency metrics
    score_variance DECIMAL(6,2) DEFAULT 0.0,
    consecutive_weeks_above_average INTEGER DEFAULT 0,
    
    -- Team value tracking
    current_team_value DECIMAL(6,1) DEFAULT 0.0,
    team_value_gained DECIMAL(6,1) DEFAULT 0.0,
    
    -- Chip usage
    chips_used INTEGER DEFAULT 0,
    wildcard_used BOOLEAN DEFAULT false,
    free_hit_used BOOLEAN DEFAULT false,
    bench_boost_used BOOLEAN DEFAULT false,
    triple_captain_used BOOLEAN DEFAULT false,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, season)
);

-- 7. GAMEWEEK RANKINGS

CREATE TABLE IF NOT EXISTS public.gameweek_rankings (
    id SERIAL PRIMARY KEY,
    gameweek INTEGER NOT NULL,
    season TEXT DEFAULT '2024-25',
    
    -- User ranking data
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    points DECIMAL(6,1) NOT NULL,
    
    -- Movement from previous week
    rank_change INTEGER DEFAULT 0,
    points_change DECIMAL(6,1) DEFAULT 0.0,
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(gameweek, season, user_id)
);

-- 8. SEASON OVERVIEW

CREATE TABLE IF NOT EXISTS public.season_overview (
    id SERIAL PRIMARY KEY,
    season TEXT UNIQUE NOT NULL,
    
    -- Season status
    is_active BOOLEAN DEFAULT true,
    current_gameweek INTEGER DEFAULT 1,
    total_gameweeks INTEGER DEFAULT 38,
    
    -- Statistics
    total_users INTEGER DEFAULT 0,
    total_transfers INTEGER DEFAULT 0,
    total_chips_used INTEGER DEFAULT 0,
    
    -- Metadata
    season_start TIMESTAMP WITH TIME ZONE,
    season_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. INDEXES FOR PERFORMANCE

-- Player performance indexes
CREATE INDEX IF NOT EXISTS idx_player_gameweek_performance_player_gameweek 
    ON public.player_gameweek_performance(player_id, gameweek, season);

CREATE INDEX IF NOT EXISTS idx_player_gameweek_performance_gameweek_season 
    ON public.player_gameweek_performance(gameweek, season);

-- User scores indexes
CREATE INDEX IF NOT EXISTS idx_user_gameweek_scores_user_gameweek 
    ON public.user_gameweek_scores(user_id, gameweek, season);

CREATE INDEX IF NOT EXISTS idx_user_gameweek_scores_gameweek_season 
    ON public.user_gameweek_scores(gameweek, season);

CREATE INDEX IF NOT EXISTS idx_user_gameweek_scores_total_points 
    ON public.user_gameweek_scores(total_points DESC);

-- Team snapshots indexes
CREATE INDEX IF NOT EXISTS idx_user_team_snapshots_user_gameweek 
    ON public.user_team_snapshots(user_id, gameweek, season);

-- Transfer history indexes
CREATE INDEX IF NOT EXISTS idx_user_transfer_history_user_gameweek 
    ON public.user_transfer_history(user_id, gameweek, season);

-- Rankings indexes
CREATE INDEX IF NOT EXISTS idx_gameweek_rankings_gameweek_season 
    ON public.gameweek_rankings(gameweek, season);

CREATE INDEX IF NOT EXISTS idx_gameweek_rankings_rank 
    ON public.gameweek_rankings(rank);

-- 10. ROW LEVEL SECURITY POLICIES

-- Enable RLS on all tables
ALTER TABLE public.player_gameweek_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_team_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transfer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chip_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_total_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweek_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_overview ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables
CREATE POLICY "Public read access" ON public.player_gameweek_performance FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.user_gameweek_scores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.user_total_points FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.gameweek_rankings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.season_overview FOR SELECT USING (true);

-- User-specific access for personal data
CREATE POLICY "Users can read own team snapshots" ON public.user_team_snapshots 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own transfer history" ON public.user_transfer_history 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own chip history" ON public.user_chip_history 
    FOR SELECT USING (auth.uid() = user_id);

-- Admin write access
CREATE POLICY "Admins can insert player performance" ON public.player_gameweek_performance 
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update player performance" ON public.player_gameweek_performance 
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- 11. HELPER FUNCTIONS

-- Function to calculate user's gameweek score
CREATE OR REPLACE FUNCTION calculate_user_gameweek_score(
    p_user_id UUID,
    p_gameweek INTEGER,
    p_season TEXT DEFAULT '2024-25'
) RETURNS DECIMAL(6,1) AS $$
DECLARE
    total_score DECIMAL(6,1) := 0.0;
    team_snapshot JSONB;
    player_performance RECORD;
    player_points DECIMAL(4,1);
    captain_multiplier DECIMAL(2,1) := 1.0;
BEGIN
    -- Get user's team composition for this gameweek
    SELECT team_composition INTO team_snapshot
    FROM public.user_team_snapshots
    WHERE user_id = p_user_id 
      AND gameweek = p_gameweek 
      AND season = p_season;
    
    IF team_snapshot IS NULL THEN
        RETURN 0.0;
    END IF;
    
    -- Calculate score for each player in the team
    FOR player_performance IN
        SELECT 
            (team_snapshot->>'player_id')::INTEGER as player_id,
            (team_snapshot->>'is_captain')::BOOLEAN as is_captain,
            (team_snapshot->>'is_vice_captain')::BOOLEAN as is_vice_captain
        FROM jsonb_array_elements(team_snapshot)
    LOOP
        -- Get player's performance for this gameweek
        SELECT total_points INTO player_points
        FROM public.player_gameweek_performance
        WHERE player_id = player_performance.player_id
          AND gameweek = p_gameweek
          AND season = p_season;
        
        IF player_points IS NOT NULL THEN
            -- Apply captain/vice-captain multipliers
            IF player_performance.is_captain THEN
                captain_multiplier := 2.0;
            ELSIF player_performance.is_vice_captain THEN
                captain_multiplier := 1.5;
            ELSE
                captain_multiplier := 1.0;
            END IF;
            
            total_score := total_score + (player_points * captain_multiplier);
        END IF;
    END LOOP;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update user totals
CREATE OR REPLACE FUNCTION update_user_totals(
    p_user_id UUID,
    p_season TEXT DEFAULT '2024-25'
) RETURNS VOID AS $$
DECLARE
    total_pts DECIMAL(8,1);
    games_played INTEGER;
    avg_pts DECIMAL(6,2);
    current_rank INTEGER;
BEGIN
    -- Calculate totals from gameweek scores
    SELECT 
        COALESCE(SUM(total_points), 0),
        COUNT(*)
    INTO total_pts, games_played
    FROM public.user_gameweek_scores
    WHERE user_id = p_user_id AND season = p_season;
    
    -- Calculate average
    avg_pts := CASE WHEN games_played > 0 THEN total_pts / games_played ELSE 0.0 END;
    
    -- Get current rank
    SELECT COUNT(*) + 1 INTO current_rank
    FROM public.user_total_points
    WHERE season = p_season AND total_points > total_pts;
    
    -- Upsert user totals
    INSERT INTO public.user_total_points (
        user_id, season, total_points, gameweeks_played, 
        average_points, current_rank, last_updated
    ) VALUES (
        p_user_id, p_season, total_pts, games_played, 
        avg_pts, current_rank, NOW()
    )
    ON CONFLICT (user_id, season) 
    DO UPDATE SET
        total_points = EXCLUDED.total_points,
        gameweeks_played = EXCLUDED.gameweeks_played,
        average_points = EXCLUDED.average_points,
        current_rank = EXCLUDED.current_rank,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- 12. INITIAL DATA SETUP

-- Insert current season overview
INSERT INTO public.season_overview (season, is_active, current_gameweek, total_gameweeks, season_start)
VALUES ('2024-25', true, 1, 38, NOW())
ON CONFLICT (season) DO NOTHING;
