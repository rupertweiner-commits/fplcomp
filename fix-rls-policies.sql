-- Fix RLS Policies for User Profile Access
-- Run this in Supabase SQL Editor to ensure RLS policies work correctly

-- Step 1: Check current RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Step 3: Create new, more permissive policies for testing
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Step 4: Test the policies by checking if RLS is working
-- This should show if the current user can access their profile
SELECT 
  'RLS Test - Current user can access profile:' as info,
  auth.uid() as current_auth_id,
  id as profile_id,
  email,
  first_name,
  last_name,
  is_admin
FROM users
WHERE id = auth.uid();

-- Step 5: Check if there are any issues with the auth.uid() function
SELECT 
  'Auth function test:' as info,
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- Step 6: Verify the policies are active
SELECT 
  'Active policies:' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
