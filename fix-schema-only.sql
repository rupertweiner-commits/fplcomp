-- Fix Database Schema for Player Allocation
-- This script only fixes the schema without adding users

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

-- 6. Verify the setup
SELECT 'Schema fixes completed successfully' as status;
SELECT 'Available Chelsea players:' as info, COUNT(*) as count FROM chelsea_players WHERE is_available = true AND assigned_to_user_id IS NULL;
SELECT 'Active users:' as info, COUNT(*) as count FROM user_profiles WHERE is_active = true;
SELECT 'Assigned players:' as info, COUNT(*) as count FROM chelsea_players WHERE assigned_to_user_id IS NOT NULL;
