-- Test User Allocation System
-- Run this to diagnose why allocated players aren't persisting

-- 1. Get current user details for rupertweiner@gmail.com
WITH current_user_info AS (
  SELECT 
    up.id as profile_id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_admin,
    au.id as auth_id,
    au.email as auth_email
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE up.email = 'rupertweiner@gmail.com'
)
SELECT 
  'User Profile Info' as check_type,
  profile_id,
  email,
  first_name,
  last_name,
  is_admin,
  auth_id,
  auth_email,
  CASE 
    WHEN profile_id = auth_id THEN 'ID MATCH ✅'
    ELSE 'ID MISMATCH ❌'
  END as id_status
FROM current_user_info;

-- 2. Check if there are ANY allocated players at all
SELECT 
  'Total Allocated Players' as check_type,
  COUNT(*) as count,
  string_agg(DISTINCT COALESCE(up.email, 'Unknown User'), ', ') as users_with_allocations
FROM chelsea_players cp
LEFT JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE cp.assigned_to_user_id IS NOT NULL;

-- 3. Check specifically for rupertweiner@gmail.com allocations
SELECT 
  'Rupert Allocations' as check_type,
  COUNT(*) as allocated_count,
  string_agg(cp.name, ', ') as player_names
FROM chelsea_players cp
JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com';

-- 4. Check draft_allocations table for rupertweiner@gmail.com
SELECT 
  'Draft Allocations' as check_type,
  COUNT(*) as count,
  string_agg(da.player_name, ', ') as allocated_players
FROM draft_allocations da
JOIN user_profiles up ON da.target_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com';

-- 5. Check user_teams table for rupertweiner@gmail.com
SELECT 
  'User Teams' as check_type,
  COUNT(*) as count,
  string_agg(ut.player_name, ', ') as team_players
FROM user_teams ut
JOIN user_profiles up ON ut.user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com';

-- 6. Show sample of available players for allocation
SELECT 
  'Available Players Sample' as check_type,
  COUNT(*) as total_available,
  string_agg(name, ', ') as sample_players
FROM (
  SELECT name 
  FROM chelsea_players 
  WHERE is_available = true 
    AND assigned_to_user_id IS NULL 
  LIMIT 5
) sample;

-- 7. Check if there are any RLS policy issues
SELECT 
  'RLS Policy Check' as check_type,
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('chelsea_players', 'user_profiles', 'draft_allocations', 'user_teams')
  AND schemaname = 'public';

-- 8. Test a manual allocation to see if it works
-- (This will only work if run by admin)
-- UPDATE chelsea_players 
-- SET assigned_to_user_id = (
--   SELECT id FROM user_profiles WHERE email = 'rupertweiner@gmail.com'
-- ),
-- is_captain = false,
-- is_vice_captain = false
-- WHERE name = 'Enzo Fernández' 
--   AND assigned_to_user_id IS NULL 
--   AND is_available = true
-- RETURNING id, name, assigned_to_user_id;
