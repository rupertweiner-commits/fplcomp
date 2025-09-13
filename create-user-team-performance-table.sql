-- Create Proper User Team Performance Tracking Table
-- This creates a comprehensive table to track user team performance over time

-- 0. First ensure baseline_points column exists in chelsea_players
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chelsea_players' 
        AND column_name = 'baseline_points'
    ) THEN
        ALTER TABLE chelsea_players ADD COLUMN baseline_points INTEGER DEFAULT 0;
        RAISE NOTICE 'Added baseline_points column to chelsea_players';
    ELSE
        RAISE NOTICE 'baseline_points column already exists in chelsea_players';
    END IF;
END $$;

-- 1. Create user_team_performance table for tracking weekly performance
CREATE TABLE IF NOT EXISTS user_team_performance (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    
    -- Team composition for this gameweek
    active_players JSONB NOT NULL DEFAULT '[]', -- Array of player IDs in starting XI
    benched_player INTEGER, -- Single benched player ID
    captain_id INTEGER, -- Captain player ID
    vice_captain_id INTEGER, -- Vice captain player ID
    
    -- Points breakdown
    total_points INTEGER DEFAULT 0,
    captain_points INTEGER DEFAULT 0, -- Points from captain (doubled)
    vice_captain_points INTEGER DEFAULT 0, -- Points from vice captain
    bench_points INTEGER DEFAULT 0, -- Points from benched player
    
    -- Competition-specific points (since competition start)
    competition_points INTEGER DEFAULT 0,
    competition_captain_points INTEGER DEFAULT 0,
    
    -- Team value and transfers
    team_value DECIMAL(10,2) DEFAULT 0,
    transfers_made INTEGER DEFAULT 0,
    transfer_cost INTEGER DEFAULT 0,
    
    -- Chips used this gameweek
    chip_used VARCHAR(50), -- 'wildcard', 'free_hit', 'bench_boost', 'triple_captain'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per gameweek
    UNIQUE(user_id, gameweek)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_team_performance_user_gameweek ON user_team_performance(user_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_user_team_performance_gameweek ON user_team_performance(gameweek);
CREATE INDEX IF NOT EXISTS idx_user_team_performance_points ON user_team_performance(total_points DESC);

-- 3. Enable RLS
ALTER TABLE user_team_performance ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view all team performance" ON user_team_performance
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own team performance" ON user_team_performance
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all team performance" ON user_team_performance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 5. Create user_team_summary view for easy leaderboard access
CREATE OR REPLACE VIEW user_team_summary AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_admin,
    
    -- Current team from chelsea_players allocations
    COUNT(cp.id) as allocated_players,
    
    -- FPL points
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    
    -- Competition points (only since competition start)
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as competition_points_with_captain,
    
    -- Team composition
    STRING_AGG(CASE WHEN cp.is_captain THEN cp.name || ' (C)' 
                   WHEN cp.is_vice_captain THEN cp.name || ' (VC)'
                   ELSE cp.name END, ', ' ORDER BY cp.position, cp.name) as team_players,
    
    -- Latest performance data
    (SELECT total_points FROM user_team_performance utp 
     WHERE utp.user_id = up.id 
     ORDER BY gameweek DESC LIMIT 1) as latest_gameweek_points,
    
    (SELECT gameweek FROM user_team_performance utp 
     WHERE utp.user_id = up.id 
     ORDER BY gameweek DESC LIMIT 1) as latest_gameweek

FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin;

-- 6. Create function to update team performance
CREATE OR REPLACE FUNCTION update_user_team_performance(
    p_user_id UUID,
    p_gameweek INTEGER
) RETURNS VOID AS $$
DECLARE
    team_record RECORD;
    total_pts INTEGER := 0;
    captain_pts INTEGER := 0;
    vice_captain_pts INTEGER := 0;
    comp_pts INTEGER := 0;
    comp_captain_pts INTEGER := 0;
BEGIN
    -- Calculate points for this user's team
    SELECT 
        COALESCE(SUM(cp.total_points), 0) as total_points,
        COALESCE(SUM(CASE WHEN cp.is_captain THEN cp.total_points * 2 ELSE cp.total_points END), 0) as total_with_captain,
        COALESCE(SUM(CASE WHEN cp.is_captain THEN cp.total_points ELSE 0 END), 0) as captain_points,
        COALESCE(SUM(CASE WHEN cp.is_vice_captain THEN cp.total_points ELSE 0 END), 0) as vice_captain_points,
        COALESCE(SUM(GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))), 0) as competition_points,
        COALESCE(SUM(CASE 
            WHEN cp.is_captain THEN GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
            ELSE GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))
        END), 0) as competition_with_captain,
        ARRAY_AGG(cp.id ORDER BY cp.position, cp.name) as player_ids
    INTO team_record
    FROM chelsea_players cp
    WHERE cp.assigned_to_user_id = p_user_id;
    
    -- Insert or update performance record
    INSERT INTO user_team_performance (
        user_id, gameweek, total_points, captain_points, vice_captain_points,
        competition_points, competition_captain_points, active_players, updated_at
    )
    VALUES (
        p_user_id, p_gameweek, team_record.total_points, team_record.captain_points, 
        team_record.vice_captain_points, team_record.competition_points, 
        team_record.competition_with_captain, to_jsonb(team_record.player_ids), NOW()
    )
    ON CONFLICT (user_id, gameweek)
    DO UPDATE SET
        total_points = EXCLUDED.total_points,
        captain_points = EXCLUDED.captain_points,
        vice_captain_points = EXCLUDED.vice_captain_points,
        competition_points = EXCLUDED.competition_points,
        competition_captain_points = EXCLUDED.competition_captain_points,
        active_players = EXCLUDED.active_players,
        updated_at = NOW();
        
END;
$$ LANGUAGE plpgsql;

-- 7. Show what we created
SELECT 'User Team Performance System Created' as status,
       'Tables: user_team_performance, Views: user_team_summary, Functions: update_user_team_performance' as components;
