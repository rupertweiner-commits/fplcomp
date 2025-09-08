-- Fix users table permissions for leaderboard access
-- This script ensures users can read from the users table for leaderboard functionality

-- First, let's check if the users table exists and has the right structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can read active users for leaderboard" ON public.users;

-- Create a simple policy that allows reading users for leaderboard
-- This is needed for the leaderboard functionality to work
CREATE POLICY "Allow reading users for leaderboard" ON public.users
    FOR SELECT
    USING (true);

-- Also ensure the user has the right permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Test the policy by trying to read from users table
SELECT COUNT(*) as user_count FROM public.users;
