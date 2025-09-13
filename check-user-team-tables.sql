-- Check User Team Performance Tables in Supabase
-- This script checks what tables exist for tracking user team performance

-- 1. Check what tables exist that might track user teams
SELECT 
    'Existing Tables Check' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_teams', 
    'user_teams_weekly', 
    'competition_tracking',
    'gameweek_results',
    'user_gameweek_history',
    'user_total_points',
    'draft_picks'
)
ORDER BY table_name;

-- 2. Check user_teams table structure if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_teams' AND table_schema = 'public') THEN
        RAISE NOTICE 'user_teams table EXISTS';
    ELSE
        RAISE NOTICE 'user_teams table does NOT exist';
    END IF;
END $$;

-- 3. Show user_teams columns if table exists
SELECT 
    'user_teams columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_teams' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check user_teams_weekly table structure if it exists
SELECT 
    'user_teams_weekly columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_teams_weekly' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check gameweek_results table structure if it exists
SELECT 
    'gameweek_results columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gameweek_results' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check what data exists in these tables
DO $$
BEGIN
    -- Check user_teams data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_teams' AND table_schema = 'public') THEN
        RAISE NOTICE 'user_teams has % rows', (SELECT COUNT(*) FROM user_teams);
    END IF;
    
    -- Check user_teams_weekly data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_teams_weekly' AND table_schema = 'public') THEN
        RAISE NOTICE 'user_teams_weekly has % rows', (SELECT COUNT(*) FROM user_teams_weekly);
    END IF;
    
    -- Check gameweek_results data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gameweek_results' AND table_schema = 'public') THEN
        RAISE NOTICE 'gameweek_results has % rows', (SELECT COUNT(*) FROM gameweek_results);
    END IF;
END $$;

-- 7. Check current user allocations in chelsea_players (our main system)
SELECT 
    'Current User Allocations' as info,
    COUNT(*) as total_allocated_players,
    COUNT(DISTINCT assigned_to_user_id) as users_with_players
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;

-- 8. Show user allocation summary (handle missing baseline_points column)
DO $$
DECLARE
    has_baseline_points BOOLEAN;
BEGIN
    -- Check if baseline_points column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chelsea_players' 
        AND column_name = 'baseline_points'
    ) INTO has_baseline_points;
    
    IF has_baseline_points THEN
        -- Query with baseline_points
        RAISE NOTICE 'User Team Summary (with baseline points):';
        PERFORM * FROM (
            SELECT 
                'User Team Summary' as info,
                up.email,
                up.first_name,
                COUNT(cp.id) as allocated_players,
                SUM(cp.total_points) as total_fpl_points,
                SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
                SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points
            FROM user_profiles up
            LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
            GROUP BY up.id, up.email, up.first_name
            HAVING COUNT(cp.id) > 0
            ORDER BY competition_points DESC
        ) summary;
    ELSE
        -- Query without baseline_points
        RAISE NOTICE 'User Team Summary (without baseline points - column does not exist):';
        PERFORM * FROM (
            SELECT 
                'User Team Summary' as info,
                up.email,
                up.first_name,
                COUNT(cp.id) as allocated_players,
                SUM(cp.total_points) as total_fpl_points,
                0 as baseline_points,
                SUM(COALESCE(cp.total_points, 0)) as competition_points
            FROM user_profiles up
            LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
            GROUP BY up.id, up.email, up.first_name
            HAVING COUNT(cp.id) > 0
            ORDER BY competition_points DESC
        ) summary;
    END IF;
END $$;
