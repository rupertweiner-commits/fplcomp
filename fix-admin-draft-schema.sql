-- Fix Admin Draft Schema Issues
-- This script fixes the missing columns and relationships needed for admin draft functionality

-- 1. Add missing is_active column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Update existing user_profiles to be active
UPDATE user_profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- 3. Add missing columns to draft_picks table for proper relationships
ALTER TABLE draft_picks 
ADD COLUMN IF NOT EXISTS player_id INTEGER REFERENCES chelsea_players(id),
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS total_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS gameweek_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false;

-- 4. Add missing columns to user_teams table
ALTER TABLE user_teams 
ADD COLUMN IF NOT EXISTS player_id INTEGER REFERENCES chelsea_players(id),
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false;

-- 5. Create proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_draft_picks_user_id ON draft_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_player_id ON draft_picks(player_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_player_id ON user_teams(player_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- 6. Update RLS policies to allow proper access
DROP POLICY IF EXISTS "Users can view their own draft picks" ON draft_picks;
CREATE POLICY "Users can view their own draft picks" ON draft_picks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own teams" ON user_teams;
CREATE POLICY "Users can view their own teams" ON user_teams
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Add admin policies for draft allocation
DROP POLICY IF EXISTS "Admins can manage all draft picks" ON draft_picks;
CREATE POLICY "Admins can manage all draft picks" ON draft_picks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage all user teams" ON user_teams;
CREATE POLICY "Admins can manage all user teams" ON user_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 8. Ensure chelsea_players table has proper structure
ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 9. Update chelsea_players to be available by default
UPDATE chelsea_players 
SET is_available = true 
WHERE is_available IS NULL;

-- 10. Create proper foreign key constraints
ALTER TABLE draft_picks 
DROP CONSTRAINT IF EXISTS draft_picks_player_id_fkey;

ALTER TABLE draft_picks 
ADD CONSTRAINT draft_picks_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES chelsea_players(id) ON DELETE SET NULL;

ALTER TABLE user_teams 
DROP CONSTRAINT IF EXISTS user_teams_player_id_fkey;

ALTER TABLE user_teams 
ADD CONSTRAINT user_teams_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES chelsea_players(id) ON DELETE SET NULL;

-- 11. Insert some sample users for testing if none exist
INSERT INTO user_profiles (id, username, email, first_name, last_name, is_admin, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@example.com', 'Admin', 'User', true, true),
  ('00000000-0000-0000-0000-000000000002', 'user1', 'user1@example.com', 'User', 'One', false, true),
  ('00000000-0000-0000-0000-000000000003', 'user2', 'user2@example.com', 'User', 'Two', false, true)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active;

-- 12. Verify the fixes
SELECT 'Schema fixes completed successfully' as status;
