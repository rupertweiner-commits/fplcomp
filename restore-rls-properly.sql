-- Restore RLS with proper, non-recursive policies
-- Run this in your Supabase SQL Editor

-- Step 1: Re-enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Create simple, non-recursive policies

-- Allow service role full access (needed for triggers)
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Allow users to read their own profile (simple auth.uid() check)
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile (simple auth.uid() check)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 3: Create admin policies that don't cause recursion
-- We'll use a different approach - check if user is admin by looking at their email
-- This avoids querying the users table from within a policy

-- Allow admins to read all users (check by email, not by querying users table)
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'rupertweiner@gmail.com'
  );

-- Allow admins to update all users (check by email, not by querying users table)
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'rupertweiner@gmail.com'
  );

-- Step 4: Test the policies
SELECT 'Testing RLS policies...' as step;

-- Test 1: Check if we can read users (should work for service role)
SELECT COUNT(*) as user_count FROM public.users;

-- Test 2: Check current users
SELECT 
  id,
  email,
  username,
  is_admin,
  is_active
FROM public.users
ORDER BY created_at DESC;

-- Step 5: Verify your admin status
SELECT 'Your admin status:' as step;
SELECT 
  email,
  is_admin,
  is_active
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

SELECT 'RLS restored with non-recursive policies!' as status;
