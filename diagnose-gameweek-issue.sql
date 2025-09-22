-- Diagnose why gameweek points aren't showing in leaderboard

-- 1. Check if gameweek_points table has any data at all
SELECT 
    'Gameweek Points Table Check' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT fpl_id) as unique_players,
    MIN(gameweek) as min_gameweek,
    MAX(gameweek) as max_gameweek,
    SUM(points) as total_points
FROM gameweek_points;

-- 2. Check specific gameweeks 4-5
SELECT 
    'GW4-5 Data Check' as check_type,
    gameweek,
    COUNT(*) as records,
    COUNT(DISTINCT fpl_id) as players,
    SUM(points) as total_points,
    AVG(points) as avg_points
FROM gameweek_points 
WHERE gameweek IN (4, 5)
GROUP BY gameweek
ORDER BY gameweek;

-- 3. Show raw gameweek data for a few players
SELECT 
    'Raw Gameweek Data Sample' as check_type,
    player_name,
    fpl_id,
    gameweek,
    points,
    goals_scored,
    assists,
    minutes
FROM gameweek_points 
WHERE gameweek IN (4, 5)
ORDER BY points DESC
LIMIT 10;

-- 4. Check if chelsea_players have fpl_id populated
SELECT 
    'Chelsea Players FPL ID Check' as check_type,
    COUNT(*) as total_players,
    COUNT(fpl_id) as players_with_fpl_id,
    COUNT(assigned_to_user_id) as allocated_players,
    COUNT(CASE WHEN fpl_id IS NOT NULL AND assigned_to_user_id IS NOT NULL THEN 1 END) as allocated_with_fpl_id
FROM chelsea_players;

-- 5. Check the JOIN between chelsea_players and gameweek_points
SELECT 
    'Player-Gameweek JOIN Check' as check_type,
    cp.name as player_name,
    cp.fpl_id,
    cp.assigned_to_user_id IS NOT NULL as is_allocated,
    up.first_name as owner,
    gp.gameweek,
    gp.points,
    'JOIN SUCCESS' as status
FROM chelsea_players cp
LEFT JOIN user_profiles up ON up.id = cp.assigned_to_user_id
LEFT JOIN gameweek_points gp ON gp.fpl_id = cp.fpl_id AND gp.gameweek IN (4, 5)
WHERE cp.assigned_to_user_id IS NOT NULL
AND gp.points IS NOT NULL
ORDER BY gp.points DESC
LIMIT 10;

-- 6. Check if the issue is NULL fpl_ids
SELECT 
    'NULL FPL ID Issues' as check_type,
    cp.name,
    cp.fpl_id,
    up.first_name as owner,
    'Missing FPL ID' as issue
FROM chelsea_players cp
LEFT JOIN user_profiles up ON up.id = cp.assigned_to_user_id
WHERE cp.assigned_to_user_id IS NOT NULL 
AND cp.fpl_id IS NULL
ORDER BY cp.name;

-- 7. Manual calculation to see what SHOULD be the result
WITH manual_calculation AS (
    SELECT 
        up.first_name,
        cp.name as player_name,
        cp.fpl_id,
        gp.gameweek,
        gp.points,
        CASE 
            WHEN cp.is_captain THEN gp.points * 2
            WHEN cp.is_vice_captain THEN gp.points * 1.5
            ELSE gp.points
        END as points_with_multiplier
    FROM user_profiles up
    JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
    LEFT JOIN gameweek_points gp ON gp.fpl_id = cp.fpl_id AND gp.gameweek IN (4, 5)
    WHERE up.first_name IS NOT NULL
    AND gp.points IS NOT NULL
)
SELECT 
    'Manual Leaderboard Calculation' as check_type,
    first_name,
    COUNT(*) as gameweek_records,
    SUM(points) as total_raw_points,
    SUM(points_with_multiplier) as total_with_multiplier
FROM manual_calculation
GROUP BY first_name
ORDER BY total_with_multiplier DESC;

-- 8. Check if sync actually ran by looking for recent data
SELECT 
    'Sync Timestamp Check' as check_type,
    MAX(created_at) as latest_record,
    MAX(updated_at) as latest_update,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_records
FROM gameweek_points;

-- 9. If no gameweek data, show what we can do with baseline
SELECT 
    'Baseline Fallback Check' as check_type,
    up.first_name,
    COUNT(cp.id) as players,
    SUM(cp.total_points) as total_fpl,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline,
    SUM(GREATEST(0, cp.total_points - COALESCE(cp.baseline_points, 0))) as competition_points
FROM user_profiles up
JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.first_name
ORDER BY competition_points DESC;
