-- Production Supabase Schema for FPL Competition
-- Run this in your Supabase SQL Editor

-- 1. Create draft_status table
CREATE TABLE IF NOT EXISTS draft_status (
  id SERIAL PRIMARY KEY,
  is_active BOOLEAN DEFAULT false,
  current_round INTEGER DEFAULT 1,
  current_pick INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 5,
  time_per_pick INTEGER DEFAULT 120, -- seconds
  is_paused BOOLEAN DEFAULT false,
  current_player_id INTEGER,
  draft_order JSONB DEFAULT '[]',
  completed_picks JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create chelsea_players table
CREATE TABLE IF NOT EXISTS chelsea_players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(10) NOT NULL, -- GK, DEF, MID, FWD
  price DECIMAL(4,1) NOT NULL,
  team VARCHAR(100) DEFAULT 'Chelsea',
  web_name VARCHAR(255),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_teams table (for team management)
CREATE TABLE IF NOT EXISTS user_teams (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES chelsea_players(id),
  position VARCHAR(10) NOT NULL,
  is_captain BOOLEAN DEFAULT false,
  is_vice_captain BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, player_id)
);

-- 4. Create draft_picks table
CREATE TABLE IF NOT EXISTS draft_picks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES chelsea_players(id),
  round_number INTEGER NOT NULL,
  pick_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert sample Chelsea players
INSERT INTO chelsea_players (name, position, price, web_name) VALUES
('Kepa Arrizabalaga', 'GK', 5.0, 'Kepa'),
('Robert Sánchez', 'GK', 4.5, 'Sanchez'),
('Thiago Silva', 'DEF', 5.5, 'Thiago Silva'),
('Reece James', 'DEF', 6.0, 'Reece James'),
('Ben Chilwell', 'DEF', 5.5, 'Chilwell'),
('Levi Colwill', 'DEF', 4.5, 'Colwill'),
('Enzo Fernández', 'MID', 7.0, 'Enzo'),
('Cole Palmer', 'MID', 6.5, 'Palmer'),
('Conor Gallagher', 'MID', 5.5, 'Gallagher'),
('Moises Caicedo', 'MID', 6.0, 'Caicedo'),
('Nicolas Jackson', 'FWD', 7.5, 'Jackson'),
('Christopher Nkunku', 'FWD', 7.0, 'Nkunku')
ON CONFLICT DO NOTHING;

-- 6. Insert initial draft status
INSERT INTO draft_status (is_active, current_round, current_pick, total_rounds) 
VALUES (false, 1, 1, 5)
ON CONFLICT DO NOTHING;

-- 7. Enable RLS on all tables
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Draft status - readable by all authenticated users
CREATE POLICY "Draft status is viewable by authenticated users" ON draft_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- Chelsea players - readable by all authenticated users
CREATE POLICY "Chelsea players are viewable by authenticated users" ON chelsea_players
  FOR SELECT USING (auth.role() = 'authenticated');

-- User teams - users can only see their own team
CREATE POLICY "Users can view own team" ON user_teams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own team" ON user_teams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own team" ON user_teams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own team" ON user_teams
  FOR DELETE USING (auth.uid() = user_id);

-- Draft picks - readable by all authenticated users
CREATE POLICY "Draft picks are viewable by authenticated users" ON draft_picks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert draft picks" ON draft_picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_player_id ON user_teams(player_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_user_id ON draft_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_round ON draft_picks(round_number);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_position ON chelsea_players(position);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_available ON chelsea_players(is_available);

-- 10. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_draft_status_updated_at
    BEFORE UPDATE ON draft_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chelsea_players_updated_at
    BEFORE UPDATE ON chelsea_players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_teams_updated_at
    BEFORE UPDATE ON user_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 'Production schema setup complete!' as status;
