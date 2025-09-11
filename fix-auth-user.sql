-- Fix authentication user in auth.users table
-- Run this in Supabase SQL Editor to resolve login issues

-- Step 1: Check what's in auth.users table
SELECT 
  'auth.users table:' as source,
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email LIKE '%rupert%'
ORDER BY created_at DESC;

-- Step 2: Check if rupertweiner@gmail.com exists in auth.users
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'rupertweiner@gmail.com') 
    THEN 'rupertweiner@gmail.com EXISTS in auth.users'
    ELSE 'rupertweiner@gmail.com MISSING from auth.users'
  END as auth_status;

-- Step 3: If the user doesn't exist in auth.users, we need to create them
-- This is a bit tricky since we can't directly insert into auth.users
-- Instead, we'll need to use Supabase's admin API or create a new user

-- Step 4: Check if there are any users with similar emails
SELECT 
  'Similar emails in auth.users:' as info,
  email,
  email_confirmed_at
FROM auth.users 
WHERE email ILIKE '%rupert%' OR email ILIKE '%weiner%';

-- Step 5: Check user_profiles again to confirm the data
SELECT 
  'user_profiles for rupertweiner:' as info,
  id,
  email,
  username,
  is_admin,
  is_active
FROM public.user_profiles 
WHERE email = 'rupertweiner@gmail.com';

-- Step 6: If the user exists in user_profiles but not in auth.users,
-- we need to either:
-- 1. Create a new auth user with the same email
-- 2. Or update the user_profiles to match an existing auth user

-- For now, let's see what we have
SELECT 'Check complete - see results above' as status;
