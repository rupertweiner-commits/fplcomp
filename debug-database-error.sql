-- Debug "Database error granting user" issue
-- Run this in Supabase SQL Editor to identify the problem

-- Step 1: Check if triggers exist and what they reference
SELECT 
  'Current triggers on auth.users:' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- Step 2: Check if handle_new_user function exists and what it does
SELECT 
  'handle_new_user function:' as info,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- Step 3: Check if there are any other functions that might reference 'users' table
SELECT 
  'Functions that might reference users table:' as info,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%users%'
AND routine_schema = 'public';

-- Step 4: Check if 'users' table still exists (it shouldn't)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
    THEN 'users table STILL EXISTS (this is the problem!)'
    ELSE 'users table does not exist (good)'
  END as users_table_status;

-- Step 5: Check user_profiles table structure
SELECT 
  'user_profiles table structure:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 6: Check if there are any RLS policies causing issues
SELECT 
  'RLS policies on user_profiles:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles'
AND schemaname = 'public';

-- Step 7: Test if we can insert into user_profiles (this might reveal the issue)
-- This will show us if there are any permission or constraint issues
SELECT 'Testing user_profiles insert permissions...' as test;

-- Step 8: Check for any foreign key constraints that might be causing issues
SELECT 
  'Foreign key constraints referencing user_profiles:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'user_profiles';
