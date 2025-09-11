-- Check user credentials in both auth.users and user_profiles
-- Run this in Supabase SQL Editor

-- Step 1: Check auth.users table
SELECT 
  'auth.users table:' as source,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email LIKE '%rupert%'
ORDER BY created_at DESC;

-- Step 2: Check user_profiles table
SELECT 
  'user_profiles table:' as source,
  id,
  email,
  username,
  is_admin,
  is_active
FROM public.user_profiles 
WHERE email LIKE '%rupert%'
ORDER BY created_at DESC;

-- Step 3: Check for any email variations
SELECT 
  'All rupert emails in auth.users:' as info,
  email
FROM auth.users 
WHERE email ILIKE '%rupert%';

-- Step 4: Check for any email variations in user_profiles
SELECT 
  'All rupert emails in user_profiles:' as info,
  email
FROM public.user_profiles 
WHERE email ILIKE '%rupert%';
