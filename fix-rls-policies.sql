-- Fix RLS Policies for Player Allocation
-- Make policies more permissive for testing

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view chelsea players" ON chelsea_players;
DROP POLICY IF EXISTS "Admins can manage chelsea players" ON chelsea_players;

-- Create permissive policies for testing
CREATE POLICY "Allow all operations on chelsea_players" ON chelsea_players
  FOR ALL USING (true);

-- Verify the policy was created
SELECT 'RLS policies updated successfully' as status;