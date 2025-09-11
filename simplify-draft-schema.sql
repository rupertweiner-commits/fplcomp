-- Simplify Draft Schema with assigned_to_user_id column
-- This approach is much cleaner - just add a column to chelsea_players table

-- 1. Add missing is_active column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Update existing user_profiles to be active
UPDATE user_profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- 3. Add assigned_to_user_id column to chelsea_players table
ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 4. Update chelsea_players to be available by default
UPDATE chelsea_players 
SET is_available = true 
WHERE is_available IS NULL;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chelsea_players_assigned_to_user ON chelsea_players(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_available ON chelsea_players(is_available);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- 6. Add RLS policies for chelsea_players
DROP POLICY IF EXISTS "Anyone can view chelsea players" ON chelsea_players;
CREATE POLICY "Anyone can view chelsea players" ON chelsea_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage chelsea players" ON chelsea_players;
CREATE POLICY "Admins can manage chelsea players" ON chelsea_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 7. Insert some sample users for testing if none exist
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

-- 8. Verify the setup
SELECT 'Simplified draft schema completed successfully' as status;
SELECT 'Available Chelsea players:' as info, COUNT(*) as count FROM chelsea_players WHERE is_available = true AND assigned_to_user_id IS NULL;
SELECT 'Active users:' as info, COUNT(*) as count FROM user_profiles WHERE is_active = true;
SELECT 'Assigned players:' as info, COUNT(*) as count FROM chelsea_players WHERE assigned_to_user_id IS NOT NULL;
