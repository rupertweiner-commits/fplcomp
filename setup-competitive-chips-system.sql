-- Competitive Chips System - Player vs Player
-- This script creates the competitive chips system where players can affect each other

-- 1. Create chip effects table to track active effects
CREATE TABLE IF NOT EXISTS chip_effects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  effect_data JSONB NOT NULL,
  active_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 2. Create chip notifications table
CREATE TABLE IF NOT EXISTS chip_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  effect_data JSONB,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create chip cooldowns table for targeting restrictions
CREATE TABLE IF NOT EXISTS chip_cooldowns (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  chip_type VARCHAR(50) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW(),
  cooldown_until TIMESTAMP NOT NULL
);

-- 4. Update chip definitions with competitive chips
INSERT INTO chip_definitions (name, description, rarity, effect_type, effect_value, base_drop_rate, icon) VALUES
-- SWAP CHIPS
('Player Swap', 'Choose any player from another user to swap with one of yours', 'rare', 'player_swap', '{"duration": 1, "permanent": false}', 25.0, 'refresh-cw'),
('Captain Swap', 'Force swap captains with another user', 'epic', 'captain_swap', '{"duration": 1}', 12.0, 'crown'),
('Position Swap', 'Swap any two players of the same position between teams', 'common', 'position_swap', '{"duration": 1}', 60.0, 'users'),

-- SABOTAGE CHIPS
('Bench Banish', 'Force another user\'s chosen player to the bench for 1 gameweek', 'rare', 'bench_banish', '{"duration": 1}', 25.0, 'ban'),
('Points Steal', 'Steal 50% of another user\'s points from one gameweek', 'epic', 'points_steal', '{"percentage": 0.5, "duration": 1}', 12.0, 'zap'),
('Transfer Block', 'Prevent another user from making transfers for 1 gameweek', 'common', 'transfer_block', '{"duration": 1}', 60.0, 'lock'),

-- PROTECTION CHIPS
('Shield', 'Protect your team from all chip effects for 1 gameweek', 'rare', 'shield', '{"duration": 1}', 25.0, 'shield'),
('Counter Attack', 'When someone uses a chip on you, it backfires and affects them instead', 'epic', 'counter_attack', '{"duration": 1}', 12.0, 'rotate-ccw'),

-- TARGETING CHIPS
('Captain Curse', 'Another user\'s captain scores negative points for 1 gameweek', 'legendary', 'captain_curse', '{"duration": 1, "points": -10}', 3.0, 'skull'),
('Team Chaos', 'Randomly shuffle another user\'s entire team formation', 'legendary', 'team_chaos', '{"duration": 1}', 3.0, 'shuffle'),

-- CLASSIC FPL CHIPS (Self-Buff)
('Triple Captain', 'Your captain scores triple points for 1 gameweek', 'epic', 'triple_captain', '{"multiplier": 3, "duration": 1}', 12.0, 'crown'),
('Bench Boost', 'Your bench players score points for 1 gameweek', 'epic', 'bench_boost', '{"duration": 1}', 12.0, 'shield'),
('Wildcard', 'Make unlimited transfers for 1 gameweek', 'epic', 'wildcard', '{"duration": 1}', 12.0, 'refresh-cw'),
('Free Hit', 'Make unlimited transfers for 1 gameweek (temporary)', 'rare', 'free_hit', '{"duration": 1, "temporary": true}', 25.0, 'zap')
ON CONFLICT DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chip_effects_user_id ON chip_effects(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_effects_target_user_id ON chip_effects(target_user_id);
CREATE INDEX IF NOT EXISTS idx_chip_effects_active ON chip_effects(is_active);
CREATE INDEX IF NOT EXISTS idx_chip_effects_active_until ON chip_effects(active_until);
CREATE INDEX IF NOT EXISTS idx_chip_notifications_user_id ON chip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_notifications_read_at ON chip_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_chip_cooldowns_user_id ON chip_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_cooldowns_target_user_id ON chip_cooldowns(target_user_id);

-- 6. Create RLS policies
ALTER TABLE chip_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_cooldowns ENABLE ROW LEVEL SECURITY;

-- Chip effects - users can view effects affecting them
CREATE POLICY "Users can view effects affecting them" ON chip_effects
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

-- Users can create effects (when using chips)
CREATE POLICY "Users can create chip effects" ON chip_effects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can manage all effects
CREATE POLICY "Admins can manage all chip effects" ON chip_effects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Notifications - users can view their own
CREATE POLICY "Users can view their own notifications" ON chip_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON chip_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can create notifications (when using chips)
CREATE POLICY "Users can create notifications" ON chip_notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Cooldowns - users can view their own
CREATE POLICY "Users can view their own cooldowns" ON chip_cooldowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create cooldowns" ON chip_cooldowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Create function to use competitive chip
CREATE OR REPLACE FUNCTION use_competitive_chip(
  p_user_id UUID,
  p_chip_definition_id INTEGER,
  p_target_user_id UUID,
  p_effect_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_chip RECORD;
  v_effect_data JSONB;
  v_cooldown_check RECORD;
  v_position_check RECORD;
  v_notification_message TEXT;
BEGIN
  -- Get chip definition
  SELECT * INTO v_chip FROM chip_definitions WHERE id = p_chip_definition_id;
  
  IF v_chip IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chip not found');
  END IF;
  
  -- Check if user has this chip
  IF NOT EXISTS (
    SELECT 1 FROM user_chip_inventory 
    WHERE user_id = p_user_id AND chip_definition_id = p_chip_definition_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chip not available');
  END IF;
  
  -- Check cooldown (can't target same user within 48 hours)
  SELECT * INTO v_cooldown_check FROM chip_cooldowns 
  WHERE user_id = p_user_id AND target_user_id = p_target_user_id 
  AND cooldown_until > NOW();
  
  IF v_cooldown_check IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target is on cooldown');
  END IF;
  
  -- Check if target has shield active
  IF EXISTS (
    SELECT 1 FROM chip_effects 
    WHERE target_user_id = p_user_id AND chip_type = 'shield' AND is_active = true AND active_until > NOW()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target is protected by shield');
  END IF;
  
  -- Prepare effect data
  v_effect_data := v_chip.effect_value || p_effect_data;
  v_effect_data := v_effect_data || jsonb_build_object('chip_name', v_chip.name);
  
  -- Create chip effect
  INSERT INTO chip_effects (user_id, target_user_id, chip_type, effect_data, active_until)
  VALUES (
    p_user_id, 
    p_target_user_id, 
    v_chip.effect_type, 
    v_effect_data,
    NOW() + INTERVAL '1 week'
  );
  
  -- Create notification for target
  v_notification_message := 'Someone used ' || v_chip.name || ' on you!';
  
  INSERT INTO chip_notifications (user_id, from_user_id, chip_type, message, effect_data)
  VALUES (p_target_user_id, p_user_id, v_chip.effect_type, v_notification_message, v_effect_data);
  
  -- Create cooldown
  INSERT INTO chip_cooldowns (user_id, target_user_id, chip_type, cooldown_until)
  VALUES (p_user_id, p_target_user_id, v_chip.effect_type, NOW() + INTERVAL '48 hours');
  
  -- Remove chip from inventory
  UPDATE user_chip_inventory 
  SET is_active = false, used_at = NOW()
  WHERE user_id = p_user_id AND chip_definition_id = p_chip_definition_id AND is_active = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Chip used successfully',
    'effect_data', v_effect_data
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get active effects on user
CREATE OR REPLACE FUNCTION get_user_effects(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_effects JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'chip_type', chip_type,
      'effect_data', effect_data,
      'active_until', active_until,
      'from_user', (
        SELECT jsonb_build_object('username', username, 'first_name', first_name, 'last_name', last_name)
        FROM user_profiles WHERE id = user_id
      )
    )
  ) INTO v_effects
  FROM chip_effects
  WHERE target_user_id = p_user_id AND is_active = true AND active_until > NOW();
  
  RETURN COALESCE(v_effects, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to get available targets (users within 3 positions)
CREATE OR REPLACE FUNCTION get_available_targets(p_user_id UUID, p_leaderboard_position INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_targets JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', up.id,
      'username', up.username,
      'first_name', up.first_name,
      'last_name', up.last_name,
      'position', lb.position,
      'points', lb.points,
      'can_target', ABS(lb.position - p_leaderboard_position) > 3
    )
  ) INTO v_targets
  FROM user_profiles up
  LEFT JOIN (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) as position,
      total_points as points
    FROM chelsea_players 
    WHERE assigned_to_user_id IS NOT NULL
    GROUP BY assigned_to_user_id, total_points
  ) lb ON up.id = lb.user_id
  WHERE up.id != p_user_id AND up.is_active = true;
  
  RETURN COALESCE(v_targets, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 10. Verify the setup
SELECT 'Competitive chips system setup completed successfully!' as status;

-- Show sample chip definitions
SELECT 
  name,
  rarity,
  description,
  base_drop_rate
FROM chip_definitions
WHERE effect_type LIKE '%swap%' OR effect_type LIKE '%steal%' OR effect_type LIKE '%curse%'
ORDER BY rarity, name;
