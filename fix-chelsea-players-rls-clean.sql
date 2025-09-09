-- Fix RLS policies for chelsea_players table
-- Run this in Supabase SQL Editor

-- Drop all existing policies
DROP POLICY IF EXISTS "chelsea_players_select_all" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_insert_admin" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_update_admin" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_delete_admin" ON chelsea_players;
DROP POLICY IF EXISTS "Chelsea players are viewable by everyone" ON chelsea_players;
DROP POLICY IF EXISTS "Chelsea players are manageable by admins" ON chelsea_players;
DROP POLICY IF EXISTS "Anyone can read chelsea players" ON chelsea_players;
DROP POLICY IF EXISTS "Admins can manage chelsea players" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_read_all" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_service_role_all" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_admin_all" ON chelsea_players;

-- Create new policies
CREATE POLICY "chelsea_players_read_all" ON chelsea_players
  FOR SELECT USING (true);

CREATE POLICY "chelsea_players_service_role_all" ON chelsea_players
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "chelsea_players_admin_all" ON chelsea_players
  FOR ALL USING (auth.jwt() ->> 'email' = 'rupertweiner@gmail.com');
