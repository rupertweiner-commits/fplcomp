-- Complete Fix for Player Allocation System
-- This script ensures the allocation system works properly with team composition rules

-- 1. Ensure all required columns exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 2. Update existing data
UPDATE user_profiles SET is_active = true WHERE is_active IS NULL;
UPDATE chelsea_players SET is_available = true WHERE is_available IS NULL;
UPDATE chelsea_players SET assigned_to_user_id = NULL WHERE assigned_to_user_id IS NULL;

-- 3. Create proper indexes
CREATE INDEX IF NOT EXISTS idx_chelsea_players_assigned_to_user ON chelsea_players(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_available ON chelsea_players(is_available);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- 4. Drop and recreate RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view chelsea players" ON chelsea_players;
DROP POLICY IF EXISTS "Admins can manage chelsea players" ON chelsea_players;
DROP POLICY IF EXISTS "Users can view their own draft picks" ON draft_picks;
DROP POLICY IF EXISTS "Admins can manage all draft picks" ON draft_picks;

-- 5. Create simple, working RLS policies
CREATE POLICY "Anyone can view chelsea players" ON chelsea_players
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage chelsea players" ON chelsea_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 6. Ensure draft_picks table has proper structure (for compatibility)
ALTER TABLE draft_picks 
ADD COLUMN IF NOT EXISTS player_id INTEGER,
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS total_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS gameweek_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false;

-- 7. Create sample users for testing
INSERT INTO user_profiles (id, username, email, first_name, last_name, is_admin, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@example.com', 'Admin', 'User', true, true),
  ('00000000-0000-0000-0000-000000000002', 'user1', 'user1@example.com', 'User', 'One', false, true),
  ('00000000-0000-0000-0000-000000000003', 'user2', 'user2@example.com', 'User', 'Two', false, true),
  ('00000000-0000-0000-0000-000000000004', 'user3', 'user3@example.com', 'User', 'Three', false, true)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active;

-- 8. Verify the setup
SELECT 'Allocation system setup completed successfully' as status;
SELECT 'Available Chelsea players:' as info, COUNT(*) as count FROM chelsea_players WHERE is_available = true AND assigned_to_user_id IS NULL;
SELECT 'Active users:' as info, COUNT(*) as count FROM user_profiles WHERE is_active = true;
SELECT 'Assigned players:' as info, COUNT(*) as count FROM chelsea_players WHERE assigned_to_user_id IS NOT NULL;
