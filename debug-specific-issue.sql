-- Targeted debug for "Database error granting user" issue
-- Run this in Supabase SQL Editor

-- Step 1: Check if triggers exist on auth.users
SELECT 
  'Triggers on auth.users:' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- Step 2: Check if handle_new_user function exists
SELECT 
  'handle_new_user function exists:' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public')
    THEN 'YES'
    ELSE 'NO'
  END as function_exists;

-- Step 3: Check if 'users' table exists in public schema
SELECT 
  'users table in public schema:' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
    THEN 'EXISTS (this is the problem!)'
    ELSE 'does not exist (good)'
  END as users_table_status;

-- Step 4: Check user_profiles table exists and has correct structure
SELECT 
  'user_profiles table exists:' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') 
    THEN 'YES'
    ELSE 'NO'
  END as table_exists;

-- Step 5: Check user_profiles table structure
SELECT 
  'user_profiles columns:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 6: Check if there are any functions that reference 'users' table
SELECT 
  'Functions referencing users table:' as info,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%public.users%'
AND routine_schema = 'public';

-- Step 7: Check RLS policies on user_profiles
SELECT 
  'RLS policies on user_profiles:' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
AND schemaname = 'public';

-- Step 8: Test if we can select from user_profiles
SELECT 
  'Can select from user_profiles:' as info,
  COUNT(*) as record_count
FROM public.user_profiles;
