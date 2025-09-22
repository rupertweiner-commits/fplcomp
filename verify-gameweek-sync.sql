-- Verify that gameweek sync worked and data is in Supabase tables

-- 1. Check if gameweek_points table has data
SELECT 
    'Gameweek Points Data' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT fpl_id) as unique_players,
    COUNT(DISTINCT gameweek) as gameweeks_covered,
    MIN(gameweek) as min_gameweek,
    MAX(gameweek) as max_gameweek,
    SUM(points) as total_points_synced
FROM gameweek_points;

-- 2. Show sample gameweek data for key players
SELECT 
    'Sample Player Gameweek Data' as check_type,
    player_name,
    gameweek,
    points,
    goals_scored,
    assists,
    minutes,
    bonus
FROM gameweek_points 
WHERE player_name ILIKE ANY(ARRAY['%Palmer%', '%Jackson%', '%Chalobah%', '%Fernandez%'])
ORDER BY player_name, gameweek;

-- 3. Check if user_gameweek_points view works
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM user_gameweek_points LIMIT 1;
        RAISE NOTICE 'user_gameweek_points view exists and is accessible';
    EXCEPTION 
        WHEN undefined_table THEN
            RAISE NOTICE 'user_gameweek_points view does not exist - need to run full ownership system';
        WHEN OTHERS THEN
            RAISE NOTICE 'user_gameweek_points view has an error: %', SQLERRM;
    END;
END $$;

-- 4. Show user points with gameweek breakdown (if view exists)
SELECT 
    'User Gameweek Breakdown' as check_type,
    ugp.first_name as user_name,
    ugp.gameweek,
    COUNT(ugp.player_fpl_id) as players,
    SUM(ugp.player_points) as total_points,
    SUM(ugp.points_with_multiplier) as points_with_multiplier
FROM user_gameweek_points ugp
WHERE ugp.gameweek IN (4, 5)
GROUP BY ugp.user_id, ugp.first_name, ugp.gameweek
ORDER BY ugp.first_name, ugp.gameweek;

-- 5. Updated leaderboard using gameweek data
SELECT 
    'Updated Leaderboard with Gameweek Data' as check_type,
    up.first_name as name,
    
    -- Total competition points from gameweek data
    COALESCE(SUM(CASE 
        WHEN gp.gameweek >= 4 AND gp.gameweek <= 5 THEN 
            CASE 
                WHEN cp.is_captain THEN gp.points * 2
                WHEN cp.is_vice_captain THEN gp.points * 1.5
                ELSE gp.points
            END
        ELSE 0 
    END), 0) as gameweek_competition_points,
    
    -- Fallback to baseline system if no gameweek data
    COALESCE(SUM(GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))), 0) as baseline_competition_points,
    
    -- Team composition
    COUNT(cp.id) as allocated_players,
    STRING_AGG(cp.name, ', ' ORDER BY cp.total_points DESC) as top_players

FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
LEFT JOIN gameweek_points gp ON gp.fpl_id = cp.fpl_id AND gp.gameweek IN (4, 5)
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name
HAVING COUNT(cp.id) > 0
ORDER BY gameweek_competition_points DESC;

-- 6. Show Chalobah's specific GW4/GW5 data (example from your request)
SELECT 
    'Chalobah Example (GW4=3pts, GW5=8pts)' as check_type,
    player_name,
    gameweek,
    points,
    goals_scored,
    assists,
    clean_sheets,
    minutes,
    'Expected: GW4=3pts, GW5=8pts' as expected_result
FROM gameweek_points 
WHERE player_name ILIKE '%Chalobah%'
AND gameweek IN (4, 5)
ORDER BY gameweek;

-- 7. Summary of sync status
DO $$
DECLARE
    gw_count INTEGER;
    player_count INTEGER;
    total_points INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(DISTINCT fpl_id), SUM(points) 
    INTO gw_count, player_count, total_points
    FROM gameweek_points 
    WHERE gameweek IN (4, 5);
    
    RAISE NOTICE '=== GAMEWEEK SYNC VERIFICATION ===';
    RAISE NOTICE 'Total gameweek records: %', gw_count;
    RAISE NOTICE 'Unique players synced: %', player_count;
    RAISE NOTICE 'Total points in GW4-5: %', total_points;
    
    IF gw_count > 0 THEN
        RAISE NOTICE '✅ Gameweek sync appears successful';
        RAISE NOTICE '🏆 Leaderboard should show individual GW4-5 points';
    ELSE
        RAISE NOTICE '❌ No gameweek data found - sync may have failed';
        RAISE NOTICE '🔄 Try running the sync again from Admin Dashboard';
    END IF;
END $$;
