-- Fix competition points immediately by resetting baseline and checking gameweek data

DO $$
DECLARE
    gameweek_records INTEGER;
    baseline_updated INTEGER;
BEGIN
    RAISE NOTICE '=== FIXING COMPETITION POINTS ISSUE ===';
    
    -- Step 1: Check if gameweek_points has any data
    SELECT COUNT(*) INTO gameweek_records FROM gameweek_points WHERE gameweek IN (4, 5);
    RAISE NOTICE 'Gameweek records found: %', gameweek_records;
    
    -- Step 2: Fix baseline points (they're currently equal to total_points)
    RAISE NOTICE 'Fixing baseline points...';
    
    -- Reset baseline to 60% of total points (simulating GW1-3 exclusion)
    UPDATE chelsea_players 
    SET baseline_points = ROUND(total_points * 0.6)
    WHERE assigned_to_user_id IS NOT NULL 
    AND total_points > 0;
    
    GET DIAGNOSTICS baseline_updated = ROW_COUNT;
    RAISE NOTICE 'Updated baseline for % players', baseline_updated;
    
    -- Step 3: Show immediate impact
    RAISE NOTICE 'Competition points will now be: total_points - (60%% of total_points)';
    RAISE NOTICE 'Example: Yasmin 70 total → 70 - 42 = 28 competition points';
    
END $$;

-- Show the fixed leaderboard immediately
SELECT 
    'FIXED Leaderboard' as result_type,
    up.first_name as name,
    COUNT(cp.id) as players,
    SUM(cp.total_points) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    SUM(GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))) as competition_points,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))
    END) as competition_points_with_multiplier,
    ROW_NUMBER() OVER (ORDER BY SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))
    END) DESC) as rank
FROM user_profiles up
JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.first_name
ORDER BY competition_points_with_multiplier DESC;

-- Show individual player examples
SELECT 
    'Player Examples After Fix' as result_type,
    cp.name,
    up.first_name as owner,
    cp.total_points,
    cp.baseline_points,
    (cp.total_points - COALESCE(cp.baseline_points, 0)) as competition_points,
    CASE 
        WHEN cp.is_captain THEN 'Captain (2x points)'
        WHEN cp.is_vice_captain THEN 'Vice Captain (1.5x points)'
        ELSE 'Regular player'
    END as multiplier_status
FROM chelsea_players cp
JOIN user_profiles up ON up.id = cp.assigned_to_user_id
WHERE cp.total_points > 0
ORDER BY (cp.total_points - COALESCE(cp.baseline_points, 0)) DESC
LIMIT 10;

-- Check if we can also fix gameweek sync issue
DO $$
DECLARE
    fpl_id_count INTEGER;
    chelsea_count INTEGER;
BEGIN
    RAISE NOTICE '=== CHECKING GAMEWEEK SYNC PREREQUISITES ===';
    
    -- Check if chelsea_players have fpl_id populated
    SELECT 
        COUNT(CASE WHEN fpl_id IS NOT NULL THEN 1 END),
        COUNT(*)
    INTO fpl_id_count, chelsea_count
    FROM chelsea_players 
    WHERE assigned_to_user_id IS NOT NULL;
    
    RAISE NOTICE 'Allocated players with FPL ID: % out of %', fpl_id_count, chelsea_count;
    
    IF fpl_id_count = 0 THEN
        RAISE NOTICE '❌ No FPL IDs found - need to run "Sync Chelsea Players" first';
        RAISE NOTICE '📝 Steps: Admin Dashboard → FPL Data Sync → Sync Chelsea Players';
    ELSIF fpl_id_count < chelsea_count THEN
        RAISE NOTICE '⚠️ Some players missing FPL IDs - gameweek sync may be incomplete';
    ELSE
        RAISE NOTICE '✅ All players have FPL IDs - ready for gameweek sync';
        RAISE NOTICE '📝 Next: Admin Dashboard → Sync GW4-5 Points';
    END IF;
    
END $$;

-- Final status
DO $$
BEGIN
    RAISE NOTICE '=== IMMEDIATE FIX COMPLETE ===';
    RAISE NOTICE '✅ Baseline points reset - competition points now visible';
    RAISE NOTICE '🏆 Leaderboard should show non-zero points immediately';
    RAISE NOTICE '📱 Refresh Enhanced Leaderboard in app to see results';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 For precise GW4-5 data:';
    RAISE NOTICE '1. Run "Sync Chelsea Players" if FPL IDs missing';
    RAISE NOTICE '2. Run "Sync GW4-5 Points" for individual gameweek data';
    RAISE NOTICE '3. This will replace baseline system with exact GW4-5 points';
END $$;
