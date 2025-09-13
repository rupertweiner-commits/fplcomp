-- Enhance User Performance System with Detailed Stats and Awards Tracking
-- This adds comprehensive stats tracking for goals, assists, clean sheets, and awards

-- 1. Add detailed stats columns to user_team_performance table
ALTER TABLE user_team_performance 
ADD COLUMN IF NOT EXISTS goals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded INTEGER DEFAULT 0;

-- 2. Create awards tracking table
CREATE TABLE IF NOT EXISTS user_awards (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    award_type VARCHAR(100) NOT NULL, -- 'most_points', 'most_goals', 'most_assists', 'most_clean_sheets', 'best_captain', etc.
    award_name VARCHAR(200) NOT NULL,
    award_description TEXT,
    value INTEGER NOT NULL, -- The stat value that earned the award
    gameweek_start INTEGER, -- If award is for a specific gameweek range
    gameweek_end INTEGER,
    season VARCHAR(20) DEFAULT '2024-25',
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one award per type per user per season
    UNIQUE(user_id, award_type, season)
);

-- 3. Create season stats summary table
CREATE TABLE IF NOT EXISTS user_season_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    season VARCHAR(20) DEFAULT '2024-25',
    
    -- Overall performance
    total_points INTEGER DEFAULT 0,
    competition_points INTEGER DEFAULT 0, -- Points since competition start
    gameweeks_played INTEGER DEFAULT 0,
    average_points_per_gameweek DECIMAL(10,2) DEFAULT 0,
    
    -- Detailed stats (aggregated from all gameweeks)
    total_goals INTEGER DEFAULT 0,
    total_assists INTEGER DEFAULT 0,
    total_clean_sheets INTEGER DEFAULT 0,
    total_saves INTEGER DEFAULT 0,
    total_yellow_cards INTEGER DEFAULT 0,
    total_red_cards INTEGER DEFAULT 0,
    total_bonus_points INTEGER DEFAULT 0,
    total_minutes_played INTEGER DEFAULT 0,
    total_goals_conceded INTEGER DEFAULT 0,
    
    -- Captain performance
    captain_points INTEGER DEFAULT 0,
    successful_captain_picks INTEGER DEFAULT 0, -- Gameweeks where captain scored above average
    
    -- Team composition stats
    best_gameweek_score INTEGER DEFAULT 0,
    worst_gameweek_score INTEGER DEFAULT 0,
    most_goals_in_gameweek INTEGER DEFAULT 0,
    most_assists_in_gameweek INTEGER DEFAULT 0,
    
    -- Rankings
    current_rank INTEGER,
    highest_rank INTEGER,
    lowest_rank INTEGER,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, season)
);

-- 4. Enable RLS for new tables
ALTER TABLE user_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_season_stats ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for user_awards
CREATE POLICY "Users can view all awards" ON user_awards
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all awards" ON user_awards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 6. Create RLS policies for user_season_stats
CREATE POLICY "Users can view all season stats" ON user_season_stats
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own season stats" ON user_season_stats
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all season stats" ON user_season_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 7. Create enhanced leaderboard view with detailed stats
CREATE OR REPLACE VIEW enhanced_leaderboard AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_admin,
    
    -- Team composition from chelsea_players
    COUNT(cp.id) as allocated_players,
    STRING_AGG(
        CASE 
            WHEN cp.is_captain THEN cp.name || ' (C)' 
            WHEN cp.is_vice_captain THEN cp.name || ' (VC)'
            ELSE cp.name 
        END, 
        ', ' 
        ORDER BY cp.position, cp.name
    ) as team_players,
    
    -- FPL points
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    
    -- Competition points (only since competition start)
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as competition_points_with_multiplier,
    
    -- Detailed stats from chelsea_players (aggregated)
    SUM(COALESCE(cp.goals_scored, 0)) as total_goals,
    SUM(COALESCE(cp.assists, 0)) as total_assists,
    SUM(COALESCE(cp.clean_sheets, 0)) as total_clean_sheets,
    SUM(COALESCE(cp.saves, 0)) as total_saves,
    SUM(COALESCE(cp.yellow_cards, 0)) as total_yellow_cards,
    SUM(COALESCE(cp.red_cards, 0)) as total_red_cards,
    SUM(COALESCE(cp.bonus, 0)) as total_bonus_points,
    SUM(COALESCE(cp.minutes, 0)) as total_minutes_played,
    SUM(COALESCE(cp.goals_conceded, 0)) as total_goals_conceded,
    
    -- Performance metrics
    ROUND(
        SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) / 
        GREATEST(1, COUNT(cp.id)), 
        2
    ) as avg_competition_points_per_player,
    
    -- Latest performance data
    (SELECT total_points FROM user_team_performance utp 
     WHERE utp.user_id = up.id 
     ORDER BY gameweek DESC LIMIT 1) as latest_gameweek_points,
    
    (SELECT gameweek FROM user_team_performance utp 
     WHERE utp.user_id = up.id 
     ORDER BY gameweek DESC LIMIT 1) as latest_gameweek,
     
    -- Awards count
    (SELECT COUNT(*) FROM user_awards ua WHERE ua.user_id = up.id) as total_awards

FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin;

-- 8. Create awards calculation function
CREATE OR REPLACE FUNCTION calculate_and_award_achievements(p_season VARCHAR DEFAULT '2024-25') 
RETURNS TABLE(award_type VARCHAR, winner_email VARCHAR, winner_name VARCHAR, value INTEGER) AS $$
BEGIN
    -- Clear existing awards for the season
    DELETE FROM user_awards WHERE season = p_season;
    
    -- Most Competition Points
    INSERT INTO user_awards (user_id, award_type, award_name, award_description, value, season)
    SELECT 
        user_id, 
        'most_points', 
        '🏆 Points Champion', 
        'Highest total competition points', 
        competition_points::INTEGER, 
        p_season
    FROM enhanced_leaderboard 
    WHERE competition_points = (SELECT MAX(competition_points) FROM enhanced_leaderboard)
    LIMIT 1;
    
    -- Most Goals
    INSERT INTO user_awards (user_id, award_type, award_name, award_description, value, season)
    SELECT 
        user_id, 
        'most_goals', 
        '⚽ Goal Machine', 
        'Most goals scored by team', 
        total_goals, 
        p_season
    FROM enhanced_leaderboard 
    WHERE total_goals = (SELECT MAX(total_goals) FROM enhanced_leaderboard)
    AND total_goals > 0
    LIMIT 1;
    
    -- Most Assists
    INSERT INTO user_awards (user_id, award_type, award_name, award_description, value, season)
    SELECT 
        user_id, 
        'most_assists', 
        '🎯 Assist King', 
        'Most assists by team', 
        total_assists, 
        p_season
    FROM enhanced_leaderboard 
    WHERE total_assists = (SELECT MAX(total_assists) FROM enhanced_leaderboard)
    AND total_assists > 0
    LIMIT 1;
    
    -- Most Clean Sheets
    INSERT INTO user_awards (user_id, award_type, award_name, award_description, value, season)
    SELECT 
        user_id, 
        'most_clean_sheets', 
        '🛡️ Clean Sheet Master', 
        'Most clean sheets by team', 
        total_clean_sheets, 
        p_season
    FROM enhanced_leaderboard 
    WHERE total_clean_sheets = (SELECT MAX(total_clean_sheets) FROM enhanced_leaderboard)
    AND total_clean_sheets > 0
    LIMIT 1;
    
    -- Best Captain Performance
    INSERT INTO user_awards (user_id, award_type, award_name, award_description, value, season)
    SELECT 
        user_id, 
        'best_captain', 
        '👑 Captain Fantastic', 
        'Best captain selection strategy', 
        (competition_points_with_multiplier - competition_points)::INTEGER, 
        p_season
    FROM enhanced_leaderboard 
    WHERE (competition_points_with_multiplier - competition_points) = 
          (SELECT MAX(competition_points_with_multiplier - competition_points) FROM enhanced_leaderboard)
    AND (competition_points_with_multiplier - competition_points) > 0
    LIMIT 1;
    
    -- Return awarded achievements
    RETURN QUERY
    SELECT 
        ua.award_type,
        up.email as winner_email,
        COALESCE(up.first_name || ' ' || up.last_name, up.email) as winner_name,
        ua.value
    FROM user_awards ua
    JOIN user_profiles up ON up.id = ua.user_id
    WHERE ua.season = p_season
    ORDER BY ua.awarded_at;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to update user season stats
CREATE OR REPLACE FUNCTION update_user_season_stats(p_user_id UUID, p_season VARCHAR DEFAULT '2024-25') 
RETURNS VOID AS $$
DECLARE
    stats_record RECORD;
BEGIN
    -- Calculate aggregated stats for the user
    SELECT 
        COALESCE(SUM(utp.total_points), 0) as total_points,
        COALESCE(SUM(utp.competition_points), 0) as competition_points,
        COUNT(utp.id) as gameweeks_played,
        COALESCE(AVG(utp.total_points), 0) as avg_points,
        COALESCE(SUM(utp.goals), 0) as total_goals,
        COALESCE(SUM(utp.assists), 0) as total_assists,
        COALESCE(SUM(utp.clean_sheets), 0) as total_clean_sheets,
        COALESCE(SUM(utp.saves), 0) as total_saves,
        COALESCE(SUM(utp.yellow_cards), 0) as total_yellow_cards,
        COALESCE(SUM(utp.red_cards), 0) as total_red_cards,
        COALESCE(SUM(utp.bonus_points), 0) as total_bonus_points,
        COALESCE(SUM(utp.minutes_played), 0) as total_minutes_played,
        COALESCE(SUM(utp.goals_conceded), 0) as total_goals_conceded,
        COALESCE(SUM(utp.captain_points), 0) as captain_points,
        COALESCE(MAX(utp.total_points), 0) as best_gameweek,
        COALESCE(MIN(utp.total_points), 0) as worst_gameweek,
        COALESCE(MAX(utp.goals), 0) as most_goals_gameweek,
        COALESCE(MAX(utp.assists), 0) as most_assists_gameweek
    INTO stats_record
    FROM user_team_performance utp
    WHERE utp.user_id = p_user_id;
    
    -- Insert or update season stats
    INSERT INTO user_season_stats (
        user_id, season, total_points, competition_points, gameweeks_played,
        average_points_per_gameweek, total_goals, total_assists, total_clean_sheets,
        total_saves, total_yellow_cards, total_red_cards, total_bonus_points,
        total_minutes_played, total_goals_conceded, captain_points,
        best_gameweek_score, worst_gameweek_score, most_goals_in_gameweek,
        most_assists_in_gameweek, last_updated
    )
    VALUES (
        p_user_id, p_season, stats_record.total_points, stats_record.competition_points,
        stats_record.gameweeks_played, stats_record.avg_points, stats_record.total_goals,
        stats_record.total_assists, stats_record.total_clean_sheets, stats_record.total_saves,
        stats_record.total_yellow_cards, stats_record.total_red_cards, stats_record.total_bonus_points,
        stats_record.total_minutes_played, stats_record.total_goals_conceded, stats_record.captain_points,
        stats_record.best_gameweek, stats_record.worst_gameweek, stats_record.most_goals_gameweek,
        stats_record.most_assists_gameweek, NOW()
    )
    ON CONFLICT (user_id, season)
    DO UPDATE SET
        total_points = EXCLUDED.total_points,
        competition_points = EXCLUDED.competition_points,
        gameweeks_played = EXCLUDED.gameweeks_played,
        average_points_per_gameweek = EXCLUDED.average_points_per_gameweek,
        total_goals = EXCLUDED.total_goals,
        total_assists = EXCLUDED.total_assists,
        total_clean_sheets = EXCLUDED.total_clean_sheets,
        total_saves = EXCLUDED.total_saves,
        total_yellow_cards = EXCLUDED.total_yellow_cards,
        total_red_cards = EXCLUDED.total_red_cards,
        total_bonus_points = EXCLUDED.total_bonus_points,
        total_minutes_played = EXCLUDED.total_minutes_played,
        total_goals_conceded = EXCLUDED.total_goals_conceded,
        captain_points = EXCLUDED.captain_points,
        best_gameweek_score = EXCLUDED.best_gameweek_score,
        worst_gameweek_score = EXCLUDED.worst_gameweek_score,
        most_goals_in_gameweek = EXCLUDED.most_goals_in_gameweek,
        most_assists_in_gameweek = EXCLUDED.most_assists_in_gameweek,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_awards_user_season ON user_awards(user_id, season);
CREATE INDEX IF NOT EXISTS idx_user_awards_type ON user_awards(award_type);
CREATE INDEX IF NOT EXISTS idx_user_season_stats_user_season ON user_season_stats(user_id, season);
CREATE INDEX IF NOT EXISTS idx_user_season_stats_points ON user_season_stats(competition_points DESC);

-- 11. Show what we created
SELECT 'Enhanced User Performance System Created' as status,
       'New Tables: user_awards, user_season_stats | Enhanced: user_team_performance | Views: enhanced_leaderboard | Functions: calculate_and_award_achievements, update_user_season_stats' as components;
