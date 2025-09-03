-- Fix Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor to resolve the "infinite recursion detected in policy" error

-- Step 1: Check current policies that might be causing recursion
SELECT 
  'Current policies:' as info,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Drop ALL existing policies to eliminate recursion
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Step 3: Create simple, non-recursive policies
-- Policy for users to read their own profile (no recursion)
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile (no recursion)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy for users to insert their own profile (no recursion)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 4: Test the policies work without recursion
SELECT 
  'Policy test - should work without recursion:' as info,
  auth.uid() as current_auth_id;

-- Step 5: Verify the user profile can be accessed
SELECT 
  'User profile access test:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active
FROM users
WHERE email = 'rupertweiner@gmail.com';

-- Step 6: Check if RLS is enabled and working
SELECT 
  'RLS status:' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';

-- Step 7: Test a simple query to ensure no recursion
SELECT 
  'Simple query test:' as info,
  COUNT(*) as user_count
FROM users;

-- Step 8: Verify the policies are now simple and non-recursive
SELECT 
  'New policies (should be simple):' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
