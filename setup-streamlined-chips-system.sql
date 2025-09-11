-- Streamlined Chip System Setup
-- 6 focused chips with poker chip aesthetics and FPL gameweek integration

-- Drop existing tables if they exist
DROP TABLE IF EXISTS chip_effects CASCADE;
DROP TABLE IF EXISTS user_chip_inventory CASCADE;
DROP TABLE IF EXISTS chip_definitions CASCADE;
DROP TABLE IF EXISTS gameweek_status CASCADE;

-- Create chip definitions table
CREATE TABLE chip_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  effect_type VARCHAR(30) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(20) NOT NULL,
  gradient TEXT NOT NULL,
  border_color VARCHAR(20) NOT NULL,
  text_color VARCHAR(20) NOT NULL,
  effect_value VARCHAR(10),
  drop_rate DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user chip inventory table
CREATE TABLE user_chip_inventory (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_def_id INTEGER NOT NULL REFERENCES chip_definitions(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  acquired_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, chip_def_id)
);

-- Create active chip effects table
CREATE TABLE chip_effects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  effect_data JSONB NOT NULL,
  gameweek INTEGER NOT NULL,
  active_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create gameweek status table
CREATE TABLE gameweek_status (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  deadline_time TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create chip cooldowns table
CREATE TABLE chip_cooldowns (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  used_at TIMESTAMP NOT NULL,
  cooldown_until TIMESTAMP NOT NULL,
  UNIQUE(user_id, target_user_id, chip_type)
);

-- Create chip notifications table
CREATE TABLE chip_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert chip definitions
INSERT INTO chip_definitions (name, description, rarity, effect_type, icon, color, gradient, border_color, text_color, effect_value, drop_rate) VALUES
('Player Swap', 'Steal any player from another user for 1 gameweek', 'rare', 'swap', '🔄', 'red', 'linear-gradient(45deg, #ef4444, #f87171)', '#dc2626', '#ffffff', '', 25.00),
('Bench Banish', 'Force another user to bench a specific player for 1 gameweek', 'rare', 'sabotage', '🪑', 'black', 'linear-gradient(45deg, #374151, #6b7280)', '#1f2937', '#ffffff', '', 25.00),
('Shield', 'Block all chip effects targeting you for 1 gameweek', 'rare', 'protection', '🛡️', 'blue', 'linear-gradient(45deg, #3b82f6, #60a5fa)', '#2563eb', '#ffffff', '', 25.00),
('Captain Curse', 'Another user''s captain scores negative points for 1 gameweek', 'legendary', 'targeting', '⚡', 'gold', 'linear-gradient(45deg, #f59e0b, #fbbf24)', '#d97706', '#000000', '', 5.00),
('Triple Captain', 'Your captain scores triple points for 1 gameweek', 'epic', 'self_buff', '3x', 'purple', 'linear-gradient(45deg, #8b5cf6, #a78bfa)', '#7c3aed', '#ffffff', '3x', 15.00),
('Bench Boost', 'Your bench players score points for 1 gameweek', 'epic', 'self_buff', '🚀', 'green', 'linear-gradient(45deg, #10b981, #34d399)', '#059669', '#ffffff', '', 15.00);

-- Create indexes for performance
CREATE INDEX idx_user_chip_inventory_user_id ON user_chip_inventory(user_id);
CREATE INDEX idx_user_chip_inventory_chip_def_id ON user_chip_inventory(chip_def_id);
CREATE INDEX idx_chip_effects_user_id ON chip_effects(user_id);
CREATE INDEX idx_chip_effects_target_user_id ON chip_effects(target_user_id);
CREATE INDEX idx_chip_effects_gameweek ON chip_effects(gameweek);
CREATE INDEX idx_chip_effects_active ON chip_effects(is_active);
CREATE INDEX idx_chip_cooldowns_user_id ON chip_cooldowns(user_id);
CREATE INDEX idx_chip_cooldowns_cooldown_until ON chip_cooldowns(cooldown_until);
CREATE INDEX idx_chip_notifications_user_id ON chip_notifications(user_id);
CREATE INDEX idx_chip_notifications_is_read ON chip_notifications(is_read);

-- Create RLS policies
ALTER TABLE chip_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chip_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweek_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_notifications ENABLE ROW LEVEL SECURITY;

-- Chip definitions - readable by all authenticated users
CREATE POLICY "Chip definitions are viewable by all users" ON chip_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

-- User chip inventory - users can only see their own chips
CREATE POLICY "Users can view their own chip inventory" ON user_chip_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chips" ON user_chip_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chips" ON user_chip_inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- Chip effects - users can see effects targeting them or from them
CREATE POLICY "Users can view chip effects targeting them or from them" ON chip_effects
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create chip effects" ON chip_effects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Gameweek status - readable by all authenticated users
CREATE POLICY "Gameweek status is viewable by all users" ON gameweek_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- Chip cooldowns - users can only see their own cooldowns
CREATE POLICY "Users can view their own cooldowns" ON chip_cooldowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooldowns" ON chip_cooldowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chip notifications - users can see notifications sent to them
CREATE POLICY "Users can view their own notifications" ON chip_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" ON chip_notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own notifications" ON chip_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for chip system
CREATE OR REPLACE FUNCTION get_user_chips(user_uuid UUID)
RETURNS TABLE (
  chip_id INTEGER,
  chip_name VARCHAR(50),
  chip_description TEXT,
  rarity VARCHAR(20),
  icon VARCHAR(10),
  gradient TEXT,
  border_color VARCHAR(20),
  text_color VARCHAR(20),
  effect_value VARCHAR(10),
  quantity INTEGER,
  acquired_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.name,
    cd.description,
    cd.rarity,
    cd.icon,
    cd.gradient,
    cd.border_color,
    cd.text_color,
    cd.effect_value,
    uci.quantity,
    uci.acquired_at
  FROM user_chip_inventory uci
  JOIN chip_definitions cd ON uci.chip_def_id = cd.id
  WHERE uci.user_id = user_uuid AND uci.is_active = true
  ORDER BY cd.rarity DESC, cd.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use chip
CREATE OR REPLACE FUNCTION can_use_chip(
  user_uuid UUID,
  chip_type VARCHAR(50),
  target_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  cooldown_exists BOOLEAN;
  chip_available BOOLEAN;
BEGIN
  -- Check if user has the chip
  SELECT EXISTS(
    SELECT 1 FROM user_chip_inventory uci
    JOIN chip_definitions cd ON uci.chip_def_id = cd.id
    WHERE uci.user_id = user_uuid 
    AND cd.name = chip_type 
    AND uci.quantity > 0 
    AND uci.is_active = true
  ) INTO chip_available;
  
  IF NOT chip_available THEN
    RETURN FALSE;
  END IF;
  
  -- Check cooldowns
  IF target_uuid IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM chip_cooldowns
      WHERE user_id = user_uuid 
      AND target_user_id = target_uuid 
      AND chip_type = chip_type
      AND cooldown_until > NOW()
    ) INTO cooldown_exists;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM chip_cooldowns
      WHERE user_id = user_uuid 
      AND chip_type = chip_type
      AND cooldown_until > NOW()
    ) INTO cooldown_exists;
  END IF;
  
  RETURN NOT cooldown_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to give user a random chip
CREATE OR REPLACE FUNCTION give_user_random_chip(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  random_chip_id INTEGER;
  current_position INTEGER;
  drop_rate DECIMAL(5,2);
  random_number DECIMAL(5,2);
BEGIN
  -- Get user's current position (simplified - you might want to calculate this properly)
  current_position := 1; -- Placeholder - implement proper leaderboard calculation
  
  -- Calculate drop rate based on position
  CASE 
    WHEN current_position <= 3 THEN drop_rate := 25.0; -- Rare
    WHEN current_position <= 6 THEN drop_rate := 30.0; -- Rare
    WHEN current_position <= 10 THEN drop_rate := 35.0; -- Rare
    ELSE drop_rate := 40.0; -- Rare
  END CASE;
  
  -- Get random chip based on drop rate
  SELECT id INTO random_chip_id
  FROM chip_definitions
  WHERE rarity = 'rare' AND drop_rate <= drop_rate
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- If no rare chip, get a common one
  IF random_chip_id IS NULL THEN
    SELECT id INTO random_chip_id
    FROM chip_definitions
    WHERE rarity = 'common'
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;
  
  -- Add chip to user's inventory
  INSERT INTO user_chip_inventory (user_id, chip_def_id, quantity)
  VALUES (user_uuid, random_chip_id, 1)
  ON CONFLICT (user_id, chip_def_id)
  DO UPDATE SET quantity = user_chip_inventory.quantity + 1;
  
  RETURN random_chip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial gameweek status
INSERT INTO gameweek_status (gameweek, is_active, deadline_time) VALUES
(1, false, NOW() + INTERVAL '1 day'),
(2, false, NOW() + INTERVAL '8 days'),
(3, false, NOW() + INTERVAL '15 days');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON chip_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_chip_inventory TO authenticated;
GRANT SELECT, INSERT ON chip_effects TO authenticated;
GRANT SELECT ON gameweek_status TO authenticated;
GRANT SELECT, INSERT ON chip_cooldowns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chip_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_chips(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_use_chip(UUID, VARCHAR(50), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION give_user_random_chip(UUID) TO authenticated;
