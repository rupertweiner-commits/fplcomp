-- Fix RLS policies for chelsea_players table to allow service role access
-- Run this in Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "chelsea_players_select_all" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_insert_admin" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_update_admin" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_delete_admin" ON chelsea_players;
DROP POLICY IF EXISTS "Chelsea players are viewable by everyone" ON chelsea_players;
DROP POLICY IF EXISTS "Chelsea players are manageable by admins" ON chelsea_players;
DROP POLICY IF EXISTS "Anyone can read chelsea players" ON chelsea_players;
DROP POLICY IF EXISTS "Admins can manage chelsea players" ON chelsea_players;

-- Create simple, non-recursive policies
-- Allow anyone to read chelsea_players
CREATE POLICY "chelsea_players_read_all" ON chelsea_players
  FOR SELECT USING (true);

-- Allow service role to manage chelsea_players (for API sync)
CREATE POLICY "chelsea_players_service_role_all" ON chelsea_players
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Allow admin users to manage chelsea_players
CREATE POLICY "chelsea_players_admin_all" ON chelsea_players
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'rupertweiner@gmail.com'
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'chelsea_players';
