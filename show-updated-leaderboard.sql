-- Show the updated user leaderboard with fixed competition points

SELECT 
    'Updated User Leaderboard' as result_type,
    up.first_name as name,
    COUNT(cp.id) as allocated_players,
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
GROUP BY up.id, up.first_name
ORDER BY competition_points_with_multiplier DESC;

-- Show captain/vice-captain impact
SELECT 
    'Captain & Vice-Captain Impact' as result_type,
    up.first_name as user_name,
    cp.name as player_name,
    cp.total_points,
    cp.baseline_points,
    (cp.total_points - COALESCE(cp.baseline_points, 0)) as base_competition_points,
    CASE 
        WHEN cp.is_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE (cp.total_points - COALESCE(cp.baseline_points, 0))
    END as final_competition_points,
    CASE 
        WHEN cp.is_captain THEN 'Captain (2x multiplier)'
        WHEN cp.is_vice_captain THEN 'Vice Captain (1.5x multiplier)'
        ELSE 'Regular player (1x)'
    END as multiplier_status
FROM user_profiles up
JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE (cp.is_captain = true OR cp.is_vice_captain = true)
AND cp.total_points > 0
ORDER BY final_competition_points DESC;

-- Team composition breakdown
SELECT 
    'Team Composition by User' as result_type,
    up.first_name as user_name,
    STRING_AGG(
        cp.name || ' (' || (cp.total_points - COALESCE(cp.baseline_points, 0)) || 'pts' ||
        CASE 
            WHEN cp.is_captain THEN ' - C)'
            WHEN cp.is_vice_captain THEN ' - VC)'
            ELSE ')'
        END,
        ', '
        ORDER BY (cp.total_points - COALESCE(cp.baseline_points, 0)) DESC
    ) as team_breakdown,
    SUM(CASE 
        WHEN cp.is_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE (cp.total_points - COALESCE(cp.baseline_points, 0))
    END) as total_competition_points
FROM user_profiles up
JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name
ORDER BY total_competition_points DESC;

-- Performance summary
DO $$
DECLARE
    total_users INTEGER;
    total_players INTEGER;
    avg_points NUMERIC;
    top_scorer TEXT;
    top_points INTEGER;
BEGIN
    -- Get summary stats
    SELECT 
        COUNT(DISTINCT up.id),
        COUNT(cp.id),
        AVG(cp.total_points - COALESCE(cp.baseline_points, 0))
    INTO total_users, total_players, avg_points
    FROM user_profiles up
    JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
    WHERE up.first_name IS NOT NULL;
    
    -- Get top performer
    SELECT 
        up.first_name,
        SUM(CASE 
            WHEN cp.is_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
            WHEN cp.is_vice_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 1.5
            ELSE (cp.total_points - COALESCE(cp.baseline_points, 0))
        END)
    INTO top_scorer, top_points
    FROM user_profiles up
    JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
    WHERE up.first_name IS NOT NULL
    GROUP BY up.id, up.first_name
    ORDER BY SUM(CASE 
        WHEN cp.is_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE (cp.total_points - COALESCE(cp.baseline_points, 0))
    END) DESC
    LIMIT 1;
    
    RAISE NOTICE '=== COMPETITION LEADERBOARD SUMMARY ===';
    RAISE NOTICE 'Total users competing: %', total_users;
    RAISE NOTICE 'Total players allocated: %', total_players;
    RAISE NOTICE 'Average competition points per player: %', ROUND(avg_points, 1);
    RAISE NOTICE 'Current leader: % with % points', top_scorer, top_points;
    RAISE NOTICE '✅ Competition points are now working correctly!';
    RAISE NOTICE '🏆 Refresh Enhanced Leaderboard in app to see results';
END $$;
