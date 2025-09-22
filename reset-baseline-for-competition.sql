-- Reset baseline points to show competition points from GW4-5
-- This will make the leaderboard show non-zero competition points

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE 'Resetting baseline points to enable competition scoring...';
    
    -- Option 1: Set baseline to a lower value to simulate GW1-3 points
    -- This assumes players had roughly 60-80% of their current points before GW4
    UPDATE chelsea_players 
    SET baseline_points = ROUND(total_points * 0.7)  -- Assume 70% of points were from GW1-3
    WHERE assigned_to_user_id IS NOT NULL 
    AND total_points > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated baseline for % players to 70%% of total points', updated_count;
    
    -- Alternative Option 2: Set baseline to zero (uncomment if you prefer this)
    /*
    UPDATE chelsea_players 
    SET baseline_points = 0
    WHERE assigned_to_user_id IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Reset baseline to 0 for % players - all points count as competition points', updated_count;
    */
    
    -- Show the impact
    RAISE NOTICE 'Competition points calculation: total_points - baseline_points';
    RAISE NOTICE 'Example: If Palmer has 45 total points, baseline is now ~31, competition points = 14';
    
END $$;

-- Show updated leaderboard with competition points
SELECT 
    'Updated Competition Leaderboard' as info,
    up.first_name as name,
    COUNT(cp.id) as players,
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as competition_points_with_multiplier,
    ROW_NUMBER() OVER (ORDER BY SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) DESC) as rank
FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name
HAVING COUNT(cp.id) > 0
ORDER BY competition_points_with_multiplier DESC;

-- Show some example players to verify the calculation
SELECT 
    'Player Examples' as info,
    name,
    total_points,
    baseline_points,
    (total_points - COALESCE(baseline_points, 0)) as competition_points,
    CASE 
        WHEN is_captain THEN 'Captain (2x)'
        WHEN is_vice_captain THEN 'Vice Captain (1.5x)'
        ELSE 'Regular'
    END as multiplier_status
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL 
AND total_points > 0
ORDER BY (total_points - COALESCE(baseline_points, 0)) DESC
LIMIT 10;
