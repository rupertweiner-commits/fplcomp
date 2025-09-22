-- Debug what the Enhanced Leaderboard API should be returning

-- 1. Test the exact view that the API uses
SELECT 
    'API View Test - enhanced_leaderboard_with_ownership' as test_type,
    user_id,
    first_name,
    last_name,
    allocated_players,
    total_fpl_points,
    baseline_points,
    competition_points_gw4_5,
    total_competition_points
FROM enhanced_leaderboard_with_ownership
ORDER BY competition_points_gw4_5 DESC;

-- 2. Check if the view exists and has the right structure
SELECT 
    'View Structure Check' as test_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'enhanced_leaderboard_with_ownership'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Manual query that should match what the API expects
SELECT 
    'Manual API Query' as test_type,
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
            WHEN cp.is_vice_captain THEN cp.name || ' (VC)'
            ELSE cp.name 
        END, 
        ', ' 
        ORDER BY (cp.total_points - COALESCE(cp.baseline_points, 0)) DESC
    ) as team_players,
    
    -- Points calculations
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points_gw4_5,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as total_competition_points,
    
    -- Additional stats
    SUM(COALESCE(cp.goals_scored, 0)) as total_goals_gw4_5,
    SUM(COALESCE(cp.assists, 0)) as total_assists_gw4_5,
    SUM(COALESCE(cp.clean_sheets, 0)) as total_clean_sheets_gw4_5,
    SUM(COALESCE(cp.minutes, 0)) as total_minutes_gw4_5,
    
    -- Performance metrics
    ROUND(
        SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) / 
        GREATEST(1, COUNT(cp.id)), 
        2
    ) as avg_points_per_player_gw4_5

FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin
HAVING COUNT(cp.id) > 0
ORDER BY total_competition_points DESC;

-- 4. Check what the API column mapping should be
DO $$
BEGIN
    RAISE NOTICE '=== FRONTEND-API DEBUG INFO ===';
    RAISE NOTICE 'API Endpoint: /api/users?action=get-leaderboard';
    RAISE NOTICE 'Expected Response Fields:';
    RAISE NOTICE '- user_id, first_name, last_name';
    RAISE NOTICE '- allocated_players, team_players';
    RAISE NOTICE '- total_fpl_points, competition_points_gw4_5';
    RAISE NOTICE '- total_goals_gw4_5, total_assists_gw4_5, etc.';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend likely expects:';
    RAISE NOTICE '- competition_points_with_multiplier field';
    RAISE NOTICE '- OR competition_points_gw4_5 field';
    RAISE NOTICE '- Check EnhancedLeaderboardTab.js for exact field names';
END $$;
