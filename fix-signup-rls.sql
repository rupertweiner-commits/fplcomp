-- Fix RLS policies for user signup
-- Run this in your Supabase SQL Editor

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user signup" ON users;

-- Create a more permissive insert policy for signup
CREATE POLICY "Allow user signup" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Verify the policies
SELECT 'RLS policies updated for signup!' as status;
