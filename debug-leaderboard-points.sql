-- Debug why leaderboard isn't showing GW4/5 points

-- 1. Check current draft status and baseline setup
SELECT 
    'Draft Status' as check_type,
    current_gameweek,
    competition_start_date,
    points_start_date,
    is_draft_complete
FROM draft_status 
WHERE id = 1;

-- 2. Check sample of Chelsea players with their points
SELECT 
    'Player Points Sample' as check_type,
    name,
    position,
    total_points,
    baseline_points,
    (total_points - COALESCE(baseline_points, 0)) as competition_points,
    assigned_to_user_id IS NOT NULL as is_assigned,
    is_captain,
    is_vice_captain
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL
ORDER BY total_points DESC
LIMIT 10;

-- 3. Check if users have allocated players
SELECT 
    'User Allocations' as check_type,
    up.first_name as user_name,
    COUNT(cp.id) as allocated_players,
    STRING_AGG(cp.name, ', ' ORDER BY cp.total_points DESC) as top_players
FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name
ORDER BY allocated_players DESC;

-- 4. Check current leaderboard calculation
SELECT 
    'Current Leaderboard' as check_type,
    up.first_name as name,
    COUNT(cp.id) as players,
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
GROUP BY up.id, up.first_name
HAVING COUNT(cp.id) > 0
ORDER BY competition_points_with_multiplier DESC;

-- 5. Check if enhanced_leaderboard view exists and works
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM enhanced_leaderboard LIMIT 1;
        RAISE NOTICE 'enhanced_leaderboard view exists and is accessible';
    EXCEPTION 
        WHEN undefined_table THEN
            RAISE NOTICE 'enhanced_leaderboard view does not exist - this might be the issue!';
        WHEN OTHERS THEN
            RAISE NOTICE 'enhanced_leaderboard view has an error: %', SQLERRM;
    END;
END $$;

-- 6. Show what the enhanced leaderboard should return (if it exists)
DO $$
BEGIN
    BEGIN
        RAISE NOTICE 'Attempting to query enhanced_leaderboard view...';
        -- This will fail if the view doesn't exist
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Cannot query enhanced_leaderboard: %', SQLERRM;
    END;
END $$;

-- 7. Check recent FPL sync activity
SELECT 
    'FPL Sync Check' as check_type,
    'Last updated players' as detail,
    MAX(updated_at) as last_sync,
    COUNT(*) as total_players,
    AVG(total_points) as avg_points
FROM chelsea_players 
WHERE updated_at IS NOT NULL;

-- 8. Manual leaderboard calculation (bypass view)
WITH manual_leaderboard AS (
    SELECT 
        up.id,
        up.first_name,
        up.last_name,
        COUNT(cp.id) as allocated_players,
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
    HAVING COUNT(cp.id) > 0
)
SELECT 
    'Manual Leaderboard' as check_type,
    first_name,
    allocated_players,
    total_fpl_points,
    baseline_points,
    competition_points,
    competition_points_with_multiplier,
    ROW_NUMBER() OVER (ORDER BY competition_points_with_multiplier DESC) as rank
FROM manual_leaderboard
ORDER BY competition_points_with_multiplier DESC;
