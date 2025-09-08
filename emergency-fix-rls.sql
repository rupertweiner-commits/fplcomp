-- EMERGENCY FIX: Completely remove and rebuild RLS policies
-- Run this in your Supabase SQL Editor

-- Step 1: Completely disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (force drop)
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Step 3: Check current user data
SELECT 'Current users in database:' as step;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- Step 4: Make sure your user exists and is admin
UPDATE public.users 
SET 
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com';

-- Step 5: Verify the update
SELECT 'Your user after update:' as step;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

-- Step 6: For now, leave RLS disabled to test
-- We'll re-enable it later with proper policies
SELECT 'RLS disabled for testing. Users table is now accessible.' as status;
