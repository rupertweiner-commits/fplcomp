-- Debug User Allocations (Fixed - handles missing tables)
-- Run this in Supabase SQL Editor to check user allocation status

-- 1. Check if chelsea_players table has assigned_to_user_id column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
AND column_name IN ('assigned_to_user_id', 'is_captain', 'is_vice_captain');

-- 2. Check current user (rupertweiner@gmail.com) details
SELECT id, email, first_name, last_name, is_admin
FROM user_profiles 
WHERE email = 'rupertweiner@gmail.com';

-- 3. Check all assigned players (any user)
SELECT 
    cp.id,
    cp.name,
    cp.position,
    cp.assigned_to_user_id,
    cp.is_captain,
    cp.is_vice_captain,
    up.first_name,
    up.last_name,
    up.email
FROM chelsea_players cp
LEFT JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE cp.assigned_to_user_id IS NOT NULL
ORDER BY up.email, cp.position;

-- 4. Check specifically for rupertweiner@gmail.com's allocated players
SELECT 
    cp.id,
    cp.name,
    cp.web_name,
    cp.position,
    cp.price,
    cp.total_points,
    cp.is_captain,
    cp.is_vice_captain,
    cp.assigned_to_user_id
FROM chelsea_players cp
JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com';

-- 5. Check what tables actually exist in the database
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('draft_allocations', 'user_teams', 'chelsea_players', 'user_profiles')
ORDER BY table_name;

-- 6. Check draft_allocations table only if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'draft_allocations' AND table_schema = 'public') THEN
        RAISE NOTICE 'draft_allocations table exists - checking data';
        PERFORM 1; -- We'll add the query here if table exists
    ELSE
        RAISE NOTICE 'draft_allocations table does NOT exist';
    END IF;
END $$;

-- 7. Check user_teams table only if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_teams' AND table_schema = 'public') THEN
        RAISE NOTICE 'user_teams table exists - checking data';
        -- Check user_teams for rupertweiner@gmail.com
        RAISE NOTICE 'User teams count: %', (
            SELECT COUNT(*) 
            FROM user_teams ut
            JOIN user_profiles up ON ut.user_id = up.id
            WHERE up.email = 'rupertweiner@gmail.com'
        );
    ELSE
        RAISE NOTICE 'user_teams table does NOT exist';
    END IF;
END $$;

-- 8. Check available players count
SELECT COUNT(*) as available_players
FROM chelsea_players 
WHERE is_available = true AND assigned_to_user_id IS NULL;

-- 9. Check total assigned players count
SELECT COUNT(*) as assigned_players
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;

-- 10. Show all columns in chelsea_players table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
AND table_schema = 'public'
ORDER BY ordinal_position;
