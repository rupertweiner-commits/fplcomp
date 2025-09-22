-- Create table to store individual gameweek points for each player
-- This will allow us to calculate points for specific gameweeks (4-5) only

-- Create gameweek_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS gameweek_points (
    id SERIAL PRIMARY KEY,
    fpl_id INTEGER NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    gameweek INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    minutes INTEGER DEFAULT 0,
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
    bonus INTEGER DEFAULT 0,
    bps INTEGER DEFAULT 0,
    influence DECIMAL(5,1) DEFAULT 0,
    creativity DECIMAL(5,1) DEFAULT 0,
    threat DECIMAL(5,1) DEFAULT 0,
    ict_index DECIMAL(5,1) DEFAULT 0,
    starts INTEGER DEFAULT 0,
    expected_goals DECIMAL(4,2) DEFAULT 0,
    expected_assists DECIMAL(4,2) DEFAULT 0,
    expected_goal_involvements DECIMAL(4,2) DEFAULT 0,
    expected_goals_conceded DECIMAL(4,2) DEFAULT 0,
    value INTEGER DEFAULT 0,
    transfers_balance INTEGER DEFAULT 0,
    selected INTEGER DEFAULT 0,
    transfers_in INTEGER DEFAULT 0,
    transfers_out INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique combination of player and gameweek
    UNIQUE(fpl_id, gameweek)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gameweek_points_fpl_id ON gameweek_points(fpl_id);
CREATE INDEX IF NOT EXISTS idx_gameweek_points_gameweek ON gameweek_points(gameweek);
CREATE INDEX IF NOT EXISTS idx_gameweek_points_fpl_gameweek ON gameweek_points(fpl_id, gameweek);

-- Enable RLS
ALTER TABLE gameweek_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Public read access" ON gameweek_points;
CREATE POLICY "Public read access" ON gameweek_points FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access" ON gameweek_points;
CREATE POLICY "Admin full access" ON gameweek_points FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Create view for competition points (GW 4-5 only)
CREATE OR REPLACE VIEW player_competition_points AS
SELECT 
    cp.id as chelsea_player_id,
    cp.fpl_id,
    cp.name,
    cp.position,
    cp.assigned_to_user_id,
    cp.is_captain,
    cp.is_vice_captain,
    
    -- Total FPL points (all gameweeks)
    cp.total_points as total_fpl_points,
    
    -- Competition points (GW 4-5 only)
    COALESCE(gw_stats.competition_points, 0) as competition_points,
    COALESCE(gw_stats.competition_goals, 0) as competition_goals,
    COALESCE(gw_stats.competition_assists, 0) as competition_assists,
    COALESCE(gw_stats.competition_clean_sheets, 0) as competition_clean_sheets,
    COALESCE(gw_stats.competition_minutes, 0) as competition_minutes,
    COALESCE(gw_stats.competition_bonus, 0) as competition_bonus,
    
    -- Apply captain/vice-captain multipliers
    CASE 
        WHEN cp.is_captain THEN COALESCE(gw_stats.competition_points, 0) * 2
        WHEN cp.is_vice_captain THEN COALESCE(gw_stats.competition_points, 0) * 1.5
        ELSE COALESCE(gw_stats.competition_points, 0)
    END as competition_points_with_multiplier

FROM chelsea_players cp
LEFT JOIN (
    -- Aggregate gameweek 4-5 points for each player
    SELECT 
        fpl_id,
        SUM(points) as competition_points,
        SUM(goals_scored) as competition_goals,
        SUM(assists) as competition_assists,
        SUM(clean_sheets) as competition_clean_sheets,
        SUM(minutes) as competition_minutes,
        SUM(bonus) as competition_bonus
    FROM gameweek_points 
    WHERE gameweek >= 4 AND gameweek <= 5
    GROUP BY fpl_id
) gw_stats ON gw_stats.fpl_id = cp.fpl_id;

-- Create enhanced leaderboard view using gameweek-specific data
CREATE OR REPLACE VIEW enhanced_leaderboard_gw AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_admin,
    
    -- Team composition
    COUNT(pcp.chelsea_player_id) as allocated_players,
    STRING_AGG(
        CASE 
            WHEN pcp.is_captain THEN pcp.name || ' (C)' 
            WHEN pcp.is_vice_captain THEN pcp.name || ' (VC)'
            ELSE pcp.name 
        END, 
        ', ' 
        ORDER BY pcp.competition_points DESC
    ) as team_players,
    
    -- FPL points (all gameweeks)
    SUM(COALESCE(pcp.total_fpl_points, 0)) as total_fpl_points,
    
    -- Competition points (GW 4-5 only)
    SUM(COALESCE(pcp.competition_points, 0)) as competition_points,
    SUM(COALESCE(pcp.competition_points_with_multiplier, 0)) as competition_points_with_multiplier,
    
    -- Detailed competition stats (GW 4-5 only)
    SUM(COALESCE(pcp.competition_goals, 0)) as total_goals,
    SUM(COALESCE(pcp.competition_assists, 0)) as total_assists,
    SUM(COALESCE(pcp.competition_clean_sheets, 0)) as total_clean_sheets,
    SUM(COALESCE(pcp.competition_minutes, 0)) as total_minutes_played,
    SUM(COALESCE(pcp.competition_bonus, 0)) as total_bonus_points,
    
    -- Performance metrics
    ROUND(
        SUM(COALESCE(pcp.competition_points, 0)) / 
        GREATEST(1, COUNT(pcp.chelsea_player_id)), 
        2
    ) as avg_competition_points_per_player

FROM user_profiles up
LEFT JOIN player_competition_points pcp ON pcp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin;

-- Success messages
DO $$
BEGIN
    RAISE NOTICE 'Gameweek points tracking system created successfully';
    RAISE NOTICE 'Tables: gameweek_points';
    RAISE NOTICE 'Views: player_competition_points, enhanced_leaderboard_gw';
    RAISE NOTICE 'Next step: Use API to populate gameweek_points with individual GW data';
    RAISE NOTICE 'Example: Chalobah GW4: 3 points, GW5: 8 points = 11 competition points total';
END $$;
