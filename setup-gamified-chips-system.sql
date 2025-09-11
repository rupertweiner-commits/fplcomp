-- Gamified Chips System - Mario Kart Style
-- This script creates the complete loot box and chips system

-- 1. Create chip definitions table
CREATE TABLE IF NOT EXISTS chip_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  effect_type VARCHAR(50) NOT NULL,
  effect_value JSONB NOT NULL,
  base_drop_rate DECIMAL(5,2) NOT NULL,
  max_uses INTEGER DEFAULT 1,
  icon VARCHAR(50) DEFAULT 'gift',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create user chip inventory table
CREATE TABLE IF NOT EXISTS user_chip_inventory (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_definition_id INTEGER NOT NULL REFERENCES chip_definitions(id),
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- 3. Create drop history table
CREATE TABLE IF NOT EXISTS chip_drops (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_definition_id INTEGER NOT NULL REFERENCES chip_definitions(id),
  leaderboard_position INTEGER NOT NULL,
  drop_rate_modifier DECIMAL(5,2) NOT NULL,
  dropped_at TIMESTAMP DEFAULT NOW(),
  box_number INTEGER NOT NULL
);

-- 4. Create loot box cooldowns table
CREATE TABLE IF NOT EXISTS loot_box_cooldowns (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_opened_at TIMESTAMP NOT NULL,
  next_available_at TIMESTAMP NOT NULL,
  streak_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Insert chip definitions
INSERT INTO chip_definitions (name, description, rarity, effect_type, effect_value, base_drop_rate, icon) VALUES
-- Common Chips
('Transfer Boost', '1 extra transfer this week', 'common', 'transfer_boost', '{"transfers": 1}', 60.0, 'refresh-cw'),
('Form Boost', '+10% points for one player next gameweek', 'common', 'points_multiplier', '{"multiplier": 1.1, "target": "single"}', 60.0, 'target'),
('Captain Insurance', 'If captain scores 0, get 5 points instead', 'common', 'captain_insurance', '{"points": 5}', 60.0, 'shield'),
('Bench Safety', 'If any starter doesn\'t play, bench player auto-substitutes', 'common', 'auto_substitute', '{"enabled": true}', 60.0, 'users'),

-- Rare Chips
('Double Captain', 'Captain scores double points (not triple)', 'rare', 'captain_multiplier', '{"multiplier": 2}', 25.0, 'crown'),
('Form Surge', 'All players get +15% points next gameweek', 'rare', 'points_multiplier', '{"multiplier": 1.15, "target": "all"}', 25.0, 'zap'),
('Transfer Frenzy', '3 extra transfers this week', 'rare', 'transfer_boost', '{"transfers": 3}', 25.0, 'refresh-cw'),
('Lucky Break', 'One random player gets +20 points', 'rare', 'points_boost', '{"points": 20, "target": "random"}', 25.0, 'star'),

-- Epic Chips
('Wildcard', 'Unlimited transfers for one gameweek', 'epic', 'unlimited_transfers', '{"duration": 1}', 12.0, 'refresh-cw'),
('Captain\'s Shield', 'Captain can\'t score negative points', 'epic', 'captain_protection', '{"min_points": 0}', 12.0, 'shield'),
('Team Boost', 'All players get +25% points next gameweek', 'epic', 'points_multiplier', '{"multiplier": 1.25, "target": "all"}', 12.0, 'zap'),
('Transfer Master', '5 extra transfers this week', 'epic', 'transfer_boost', '{"transfers": 5}', 12.0, 'refresh-cw'),

-- Legendary Chips
('Time Rewind', 'Undo your last transfer', 'legendary', 'undo_transfer', '{"enabled": true}', 3.0, 'rotate-ccw'),
('Perfect Storm', 'All players get +50% points next gameweek', 'legendary', 'points_multiplier', '{"multiplier": 1.5, "target": "all"}', 3.0, 'zap'),
('Transfer God', 'Unlimited transfers for 2 gameweeks', 'legendary', 'unlimited_transfers', '{"duration": 2}', 3.0, 'refresh-cw'),
('Captain\'s Crown', 'Captain scores quadruple points', 'legendary', 'captain_multiplier', '{"multiplier": 4}', 3.0, 'crown')
ON CONFLICT DO NOTHING;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_chip_inventory_user_id ON user_chip_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chip_inventory_chip_id ON user_chip_inventory(chip_definition_id);
CREATE INDEX IF NOT EXISTS idx_user_chip_inventory_active ON user_chip_inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_chip_drops_user_id ON chip_drops(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_drops_dropped_at ON chip_drops(dropped_at);
CREATE INDEX IF NOT EXISTS idx_loot_box_cooldowns_user_id ON loot_box_cooldowns(user_id);

-- 7. Create RLS policies
ALTER TABLE chip_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chip_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_box_cooldowns ENABLE ROW LEVEL SECURITY;

-- Chip definitions - everyone can read
CREATE POLICY "Anyone can view chip definitions" ON chip_definitions
  FOR SELECT USING (true);

-- User chip inventory - users can view their own
CREATE POLICY "Users can view their own chips" ON user_chip_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chips" ON user_chip_inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can manage all chips
CREATE POLICY "Admins can manage all chips" ON user_chip_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Drop history - users can view their own
CREATE POLICY "Users can view their own drops" ON chip_drops
  FOR SELECT USING (auth.uid() = user_id);

-- Loot box cooldowns - users can view their own
CREATE POLICY "Users can view their own cooldowns" ON loot_box_cooldowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooldowns" ON loot_box_cooldowns
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. Create function to calculate drop rates based on leaderboard position
CREATE OR REPLACE FUNCTION get_drop_rates(position INTEGER)
RETURNS JSONB AS $$
BEGIN
  CASE 
    WHEN position <= 1 THEN
      RETURN '{"common": 50, "rare": 30, "epic": 15, "legendary": 5}'::jsonb;
    WHEN position <= 3 THEN
      RETURN '{"common": 55, "rare": 28, "epic": 14, "legendary": 3}'::jsonb;
    WHEN position <= 6 THEN
      RETURN '{"common": 60, "rare": 25, "epic": 12, "legendary": 3}'::jsonb;
    WHEN position <= 10 THEN
      RETURN '{"common": 65, "rare": 22, "epic": 10, "legendary": 3}'::jsonb;
    WHEN position <= 15 THEN
      RETURN '{"common": 70, "rare": 20, "epic": 8, "legendary": 2}'::jsonb;
    ELSE
      RETURN '{"common": 75, "rare": 18, "epic": 6, "legendary": 1}'::jsonb;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to open loot box
CREATE OR REPLACE FUNCTION open_loot_box(
  p_user_id UUID,
  p_leaderboard_position INTEGER,
  p_box_number INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_drop_rates JSONB;
  v_random DECIMAL;
  v_cumulative DECIMAL := 0;
  v_selected_chip RECORD;
  v_chip_id INTEGER;
  v_cooldown RECORD;
BEGIN
  -- Check if user can open loot box
  SELECT * INTO v_cooldown FROM loot_box_cooldowns WHERE user_id = p_user_id;
  
  IF v_cooldown IS NOT NULL AND v_cooldown.next_available_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loot box not available yet');
  END IF;
  
  -- Get drop rates for position
  v_drop_rates := get_drop_rates(p_leaderboard_position);
  
  -- Generate random number
  v_random := random() * 100;
  
  -- Select chip based on weighted random
  SELECT cd.* INTO v_selected_chip
  FROM chip_definitions cd
  WHERE cd.rarity = (
    CASE 
      WHEN v_random <= (v_drop_rates->>'common')::DECIMAL THEN 'common'
      WHEN v_random <= (v_drop_rates->>'common')::DECIMAL + (v_drop_rates->>'rare')::DECIMAL THEN 'rare'
      WHEN v_random <= (v_drop_rates->>'common')::DECIMAL + (v_drop_rates->>'rare')::DECIMAL + (v_drop_rates->>'epic')::DECIMAL THEN 'epic'
      ELSE 'legendary'
    END
  )
  ORDER BY random()
  LIMIT 1;
  
  -- Add chip to user inventory
  INSERT INTO user_chip_inventory (user_id, chip_definition_id, quantity)
  VALUES (p_user_id, v_selected_chip.id, 1);
  
  -- Record drop
  INSERT INTO chip_drops (user_id, chip_definition_id, leaderboard_position, drop_rate_modifier, box_number)
  VALUES (p_user_id, v_selected_chip.id, p_leaderboard_position, 1.0, p_box_number);
  
  -- Update or create cooldown
  IF v_cooldown IS NOT NULL THEN
    UPDATE loot_box_cooldowns 
    SET last_opened_at = NOW(), 
        next_available_at = NOW() + INTERVAL '24 hours',
        streak_count = streak_count + 1
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO loot_box_cooldowns (user_id, last_opened_at, next_available_at, streak_count)
    VALUES (p_user_id, NOW(), NOW() + INTERVAL '24 hours', 1);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'chip', to_jsonb(v_selected_chip),
    'next_available', NOW() + INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Verify the setup
SELECT 'Gamified chips system setup completed successfully!' as status;

-- Show sample drop rates
SELECT 
  position,
  get_drop_rates(position) as drop_rates
FROM generate_series(1, 20) as position
ORDER BY position;
