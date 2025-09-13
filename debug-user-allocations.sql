-- Debug User Allocations
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

-- 5. Check draft_allocations table if it exists
SELECT 
    da.id,
    da.player_name,
    da.player_position,
    da.allocation_round,
    da.allocation_order,
    up.email as target_user_email
FROM draft_allocations da
JOIN user_profiles up ON da.target_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com'
ORDER BY da.allocation_round, da.allocation_order;

-- 6. Check user_teams table if it exists
SELECT 
    ut.id,
    ut.player_name,
    ut.position,
    ut.price,
    ut.is_captain,
    ut.is_vice_captain,
    up.email
FROM user_teams ut
JOIN user_profiles up ON ut.user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com';

-- 7. Check available players count
SELECT COUNT(*) as available_players
FROM chelsea_players 
WHERE is_available = true AND assigned_to_user_id IS NULL;

-- 8. Check total assigned players count
SELECT COUNT(*) as assigned_players
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;
