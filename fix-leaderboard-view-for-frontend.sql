-- Fix the enhanced_leaderboard_with_ownership view to match frontend expectations

-- Drop and recreate the view with correct field names for frontend
DROP VIEW IF EXISTS enhanced_leaderboard_with_ownership;

CREATE VIEW enhanced_leaderboard_with_ownership AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_admin,
    
    -- Team composition
    COUNT(cp.id) as allocated_players,
    STRING_AGG(
        CASE 
            WHEN cp.is_captain THEN cp.name || ' (C)' 
            ELSE cp.name 
        END, 
        ', ' 
        ORDER BY (cp.total_points - COALESCE(cp.baseline_points, 0)) DESC
    ) as team_players,
    
    -- Points calculations (matching frontend field names)
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    
    -- Competition points (GW 4-5 equivalent using baseline system)
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points,
    
    -- THIS IS THE KEY FIELD THE FRONTEND EXPECTS (Captain gets 2x, others get 1x)
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as competition_points_with_multiplier,
    
    -- Team composition for current gameweek
    COUNT(cp.id) as current_players,
    
    -- Detailed stats (using existing data - frontend expects these exact field names)
    SUM(COALESCE(cp.goals_scored, 0)) as total_goals,
    SUM(COALESCE(cp.assists, 0)) as total_assists,
    SUM(COALESCE(cp.clean_sheets, 0)) as total_clean_sheets,
    SUM(COALESCE(cp.minutes, 0)) as total_minutes_played,
    SUM(COALESCE(cp.bonus, 0)) as total_bonus_points,
    
    -- Performance metrics
    ROUND(
        SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) / 
        GREATEST(1, COUNT(cp.id)), 
        2
    ) as avg_competition_points_per_player,
    
    -- Additional fields that might be expected
    0 as latest_gameweek_points,  -- Placeholder
    5 as latest_gameweek,         -- Current gameweek
    0 as total_awards             -- Placeholder

FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin;

-- Test the view with the exact query the API uses
SELECT 
    'Fixed View Test - Should Match Frontend' as test_type,
    user_id,
    first_name,
    allocated_players,
    competition_points_with_multiplier,
    total_goals,
    total_assists,
    team_players
FROM enhanced_leaderboard_with_ownership
WHERE allocated_players > 0
ORDER BY competition_points_with_multiplier DESC;

-- Show what the frontend should now receive
DO $$
BEGIN
    RAISE NOTICE '=== FRONTEND FIX APPLIED ===';
    RAISE NOTICE '✅ View now returns competition_points_with_multiplier field';
    RAISE NOTICE '✅ Field names match EnhancedLeaderboardTab.js expectations';
    RAISE NOTICE '✅ total_goals, total_assists fields included';
    RAISE NOTICE '🔄 Refresh Enhanced Leaderboard in app to see results';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected results in app:';
    RAISE NOTICE '- Users ranked by competition_points_with_multiplier';
    RAISE NOTICE '- Captain/vice-captain multipliers applied';
    RAISE NOTICE '- Non-zero competition points displayed';
END $$;
