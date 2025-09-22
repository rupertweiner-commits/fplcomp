-- Debug leaderboard issues
-- Check if the enhanced_leaderboard_with_ownership view exists

-- 1. Check if the view exists
SELECT 
    schemaname, 
    viewname, 
    definition
FROM pg_views 
WHERE viewname LIKE '%leaderboard%';

-- 2. Check if user_profiles table has data
SELECT COUNT(*) as user_count FROM user_profiles;

-- 3. Check if chelsea_players table has assigned players
SELECT 
    COUNT(*) as total_players,
    COUNT(CASE WHEN assigned_to_user_id IS NOT NULL THEN 1 END) as assigned_players
FROM chelsea_players;

-- 4. Check draft_status table
SELECT * FROM draft_status WHERE id = 1;

-- 5. Check if gameweek_points table has data
SELECT 
    COUNT(*) as total_records,
    MIN(gameweek) as min_gw,
    MAX(gameweek) as max_gw
FROM gameweek_points;

-- 6. Try to query the view if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'enhanced_leaderboard_with_ownership') THEN
        RAISE NOTICE 'enhanced_leaderboard_with_ownership view exists';
        -- Try a simple query
        PERFORM * FROM enhanced_leaderboard_with_ownership LIMIT 1;
        RAISE NOTICE 'View query successful';
    ELSE
        RAISE NOTICE 'enhanced_leaderboard_with_ownership view does NOT exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error querying view: %', SQLERRM;
END $$;
