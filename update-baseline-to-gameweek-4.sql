-- Update baseline points to start counting from Gameweek 4 onwards
-- This will exclude gameweeks 1-3 from the leaderboard calculations

DO $$ 
BEGIN
    RAISE NOTICE 'Starting baseline update to exclude gameweeks 1-3...';
    
    -- Update draft_status to reflect that competition starts from GW4
    UPDATE draft_status 
    SET 
        current_gameweek = 4,
        competition_start_date = CURRENT_DATE,
        points_start_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = 1;
    
    RAISE NOTICE 'Draft status updated to start from GW4';
    
    -- Update baseline_points for all Chelsea players to their current total_points
    -- This effectively sets their "competition starting point" to after GW3
    UPDATE chelsea_players 
    SET baseline_points = COALESCE(total_points, 0)
    WHERE total_points IS NOT NULL;
    
    RAISE NOTICE 'Updated baseline_points for % players', 
        (SELECT COUNT(*) FROM chelsea_players WHERE total_points IS NOT NULL);
    
    -- For any players without total_points, set baseline to 0
    UPDATE chelsea_players 
    SET baseline_points = 0
    WHERE total_points IS NULL OR baseline_points IS NULL;
    
    RAISE NOTICE 'Set baseline_points to 0 for players without total_points';
    
    -- Reset user_teams scores to 0 (they'll be recalculated based on new baseline)
    UPDATE user_teams 
    SET 
        total_score = 0,
        gameweek_score = 0
    WHERE total_score IS NOT NULL OR gameweek_score IS NOT NULL;
    
    RAISE NOTICE 'Reset user_teams scores to 0';
    
    -- Reset gameweek_results to 0 for future gameweeks
    UPDATE gameweek_results 
    SET 
        points = 0,
        captain_points = 0,
        vice_captain_points = 0
    WHERE gameweek >= 4;
    
    RAISE NOTICE 'Reset gameweek_results for GW4+';
    
    -- Update user_team_performance to reset competition points
    UPDATE user_team_performance 
    SET 
        total_points = 0,
        competition_points = 0
    WHERE gameweek >= 4;
    
    RAISE NOTICE 'Reset user_team_performance for GW4+';
    
    -- Show summary of changes
    RAISE NOTICE '=== BASELINE UPDATE SUMMARY ===';
    RAISE NOTICE 'Competition now starts from Gameweek 4';
    RAISE NOTICE 'Gameweeks 1-3 points are excluded from leaderboard';
    RAISE NOTICE 'All users start with 0 competition points';
    RAISE NOTICE 'Player FPL data remains unchanged';
    
END $$;

-- Verify the changes
SELECT 
    'Draft Status' as table_name,
    current_gameweek,
    competition_start_date::date,
    points_start_date::date
FROM draft_status 
WHERE id = 1

UNION ALL

SELECT 
    'Chelsea Players Sample' as table_name,
    COUNT(*)::text as current_gameweek,
    AVG(COALESCE(total_points, 0))::text as competition_start_date,
    AVG(COALESCE(baseline_points, 0))::text as points_start_date
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL

UNION ALL

SELECT 
    'User Teams' as table_name,
    COUNT(*)::text as current_gameweek,
    SUM(COALESCE(total_score, 0))::text as competition_start_date,
    SUM(COALESCE(gameweek_score, 0))::text as points_start_date
FROM user_teams;

-- Show current leaderboard after baseline update
SELECT 
    up.first_name || ' ' || COALESCE(up.last_name, '') as name,
    COUNT(cp.id) as players_allocated,
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as competition_points_with_multiplier
FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name, up.last_name
ORDER BY competition_points_with_multiplier DESC;
