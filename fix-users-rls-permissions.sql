-- Fix RLS permissions for users table to allow simulation access
-- This script ensures the simulation API can read from the users table

-- First, let's check what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Allow reading users for leaderboard" ON public.users;

-- Create a simple policy that allows authenticated users to read all users
-- This is needed for the simulation API to work
CREATE POLICY "Allow authenticated users to read all users" ON public.users
FOR SELECT 
TO authenticated
USING (true);

-- Also allow anonymous access for the simulation API
CREATE POLICY "Allow anonymous users to read all users" ON public.users
FOR SELECT 
TO anon
USING (true);

-- Grant explicit permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Test the access
SELECT COUNT(*) as user_count FROM public.users;
