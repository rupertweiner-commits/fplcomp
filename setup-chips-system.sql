-- Setup Chips System for Team Management
-- This script creates the necessary tables and data for the chips system

-- 1. Create user_chips table
CREATE TABLE IF NOT EXISTS user_chips (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  description TEXT,
  used BOOLEAN DEFAULT false,
  used_in_gameweek INTEGER,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_chips_user_id ON user_chips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chips_chip_type ON user_chips(chip_type);
CREATE INDEX IF NOT EXISTS idx_user_chips_used ON user_chips(used);

-- 3. Insert default chips for all existing users
INSERT INTO user_chips (user_id, chip_type, description)
SELECT 
  id as user_id,
  'WILDCARD' as chip_type,
  'Make unlimited transfers for one gameweek' as description
FROM user_profiles
WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO user_chips (user_id, chip_type, description)
SELECT 
  id as user_id,
  'FREE_HIT' as chip_type,
  'Make unlimited transfers for one gameweek (temporary)' as description
FROM user_profiles
WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO user_chips (user_id, chip_type, description)
SELECT 
  id as user_id,
  'TRIPLE_CAPTAIN' as chip_type,
  'Your captain scores triple points for one gameweek' as description
FROM user_profiles
WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO user_chips (user_id, chip_type, description)
SELECT 
  id as user_id,
  'BENCH_BOOST' as chip_type,
  'Your bench players score points for one gameweek' as description
FROM user_profiles
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- 4. Create RLS policies
ALTER TABLE user_chips ENABLE ROW LEVEL SECURITY;

-- Users can view their own chips
CREATE POLICY "Users can view their own chips" ON user_chips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own chips (for using them)
CREATE POLICY "Users can update their own chips" ON user_chips
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can manage all chips
CREATE POLICY "Admins can manage all chips" ON user_chips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 5. Verify the setup
SELECT 'Chips system setup completed successfully!' as status;

-- Show chips for each user
SELECT 
  up.username,
  up.email,
  COUNT(uc.id) as total_chips,
  COUNT(CASE WHEN uc.used = false THEN 1 END) as available_chips,
  COUNT(CASE WHEN uc.used = true THEN 1 END) as used_chips
FROM user_profiles up
LEFT JOIN user_chips uc ON up.id = uc.user_id
WHERE up.is_active = true
GROUP BY up.id, up.username, up.email
ORDER BY up.username;
