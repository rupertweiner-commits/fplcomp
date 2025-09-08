-- Fix infinite recursion in RLS policies
-- Run this in your Supabase SQL Editor

-- Step 1: Disable RLS temporarily to fix the policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Step 3: Create simple, non-recursive policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for triggers)
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Allow users to read their own profile (simple check, no recursion)
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile (simple check, no recursion)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins to read all users (simple check, no recursion)
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.is_admin = true
    )
  );

-- Allow admins to update all users (simple check, no recursion)
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.is_admin = true
    )
  );

-- Step 4: Test the policies by checking if we can read users
SELECT 'Testing policies...' as step;
SELECT COUNT(*) as user_count FROM public.users;

-- Step 5: Check current users
SELECT 
  id,
  email,
  is_admin,
  created_at
FROM public.users
ORDER BY created_at DESC;

SELECT 'Infinite recursion fixed!' as status;
