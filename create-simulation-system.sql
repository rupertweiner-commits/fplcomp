-- Comprehensive Simulation System Setup
-- This creates all necessary tables and data for testing the simulation experience

-- 1. Create simulation_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS simulation_status (
  id SERIAL PRIMARY KEY,
  is_simulation_mode BOOLEAN DEFAULT false,
  current_gameweek INTEGER DEFAULT 1,
  is_draft_complete BOOLEAN DEFAULT false,
  total_users INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create gameweek_results table for storing mock performance data
CREATE TABLE IF NOT EXISTS gameweek_results (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  team_id INTEGER DEFAULT 4, -- Chelsea
  position VARCHAR(10) NOT NULL,
  points DECIMAL(4,1) DEFAULT 0.0,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  price DECIMAL(4,1) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create user_gameweek_scores table for tracking user performance
CREATE TABLE IF NOT EXISTS user_gameweek_scores (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  gameweek INTEGER NOT NULL,
  total_points DECIMAL(6,1) DEFAULT 0.0,
  captain_points DECIMAL(6,1) DEFAULT 0.0,
  vice_captain_points DECIMAL(6,1) DEFAULT 0.0,
  bench_points DECIMAL(6,1) DEFAULT 0.0,
  chip_used VARCHAR(50),
  chip_points DECIMAL(6,1) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, gameweek)
);

-- 4. Create user_total_points table for cumulative scoring
CREATE TABLE IF NOT EXISTS user_total_points (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  total_points DECIMAL(8,1) DEFAULT 0.0,
  gameweeks_played INTEGER DEFAULT 0,
  average_points DECIMAL(6,1) DEFAULT 0.0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Create mock performance data for Chelsea players
-- This will be used to simulate realistic gameweek performance

-- First, let's ensure we have Chelsea players
INSERT INTO chelsea_players (fpl_id, name, position, price, team_id, is_available) VALUES
(1, 'Robert Sánchez', 'GK', 4.5, 4, true),
(2, 'Reece James', 'DEF', 5.5, 4, true),
(3, 'Levi Colwill', 'DEF', 4.5, 4, true),
(4, 'Thiago Silva', 'DEF', 5.0, 4, true),
(5, 'Marc Cucurella', 'DEF', 5.0, 4, true),
(6, 'Enzo Fernández', 'MID', 6.5, 4, true),
(7, 'Moisés Caicedo', 'MID', 5.5, 4, true),
(8, 'Conor Gallagher', 'MID', 5.0, 4, true),
(9, 'Cole Palmer', 'MID', 6.0, 4, true),
(10, 'Nicolas Jackson', 'FWD', 7.0, 4, true),
(11, 'Raheem Sterling', 'FWD', 6.5, 4, true),
(12, 'Christopher Nkunku', 'FWD', 7.5, 4, true),
(13, 'Armando Broja', 'FWD', 5.5, 4, true),
(14, 'Mykhailo Mudryk', 'MID', 6.0, 4, true),
(15, 'Noni Madueke', 'MID', 5.5, 4, true)
ON CONFLICT (fpl_id) DO NOTHING;

-- 6. Create sample gameweek results for testing
-- Gameweek 1 results
INSERT INTO gameweek_results (gameweek, player_id, player_name, position, points, goals_scored, assists, clean_sheets, minutes_played, price) VALUES
(1, 1, 'Robert Sánchez', 'GK', 6.0, 0, 0, 1, 90, 4.5),
(1, 2, 'Reece James', 'DEF', 8.0, 1, 0, 1, 90, 5.5),
(1, 3, 'Levi Colwill', 'DEF', 6.0, 0, 0, 1, 90, 4.5),
(1, 4, 'Thiago Silva', 'DEF', 6.0, 0, 0, 1, 90, 5.0),
(1, 5, 'Marc Cucurella', 'DEF', 5.0, 0, 0, 1, 90, 5.0),
(1, 6, 'Enzo Fernández', 'MID', 7.0, 0, 1, 0, 90, 6.5),
(1, 7, 'Moisés Caicedo', 'MID', 6.0, 0, 0, 0, 90, 5.5),
(1, 8, 'Conor Gallagher', 'MID', 8.0, 1, 0, 0, 90, 5.0),
(1, 9, 'Cole Palmer', 'MID', 9.0, 1, 1, 0, 90, 6.0),
(1, 10, 'Nicolas Jackson', 'FWD', 7.0, 1, 0, 0, 90, 7.0),
(1, 11, 'Raheem Sterling', 'FWD', 6.0, 0, 1, 0, 90, 6.5),
(1, 12, 'Christopher Nkunku', 'FWD', 5.0, 0, 0, 0, 90, 7.5),
(1, 13, 'Armando Broja', 'FWD', 4.0, 0, 0, 0, 90, 5.5),
(1, 14, 'Mykhailo Mudryk', 'MID', 5.0, 0, 0, 0, 90, 6.0),
(1, 15, 'Noni Madueke', 'MID', 4.0, 0, 0, 0, 90, 5.5);

-- Gameweek 2 results (different performance)
INSERT INTO gameweek_results (gameweek, player_id, player_name, position, points, goals_scored, assists, clean_sheets, minutes_played, price) VALUES
(2, 1, 'Robert Sánchez', 'GK', 4.0, 0, 0, 0, 90, 4.5),
(2, 2, 'Reece James', 'DEF', 6.0, 0, 1, 0, 90, 5.5),
(2, 3, 'Levi Colwill', 'DEF', 5.0, 0, 0, 0, 90, 4.5),
(2, 4, 'Thiago Silva', 'DEF', 4.0, 0, 0, 0, 90, 5.0),
(2, 5, 'Marc Cucurella', 'DEF', 6.0, 0, 0, 0, 90, 5.0),
(2, 6, 'Enzo Fernández', 'MID', 8.0, 1, 0, 0, 90, 6.5),
(2, 7, 'Moisés Caicedo', 'MID', 7.0, 0, 1, 0, 90, 5.5),
(2, 8, 'Conor Gallagher', 'MID', 5.0, 0, 0, 0, 90, 5.0),
(2, 9, 'Cole Palmer', 'MID', 6.0, 0, 1, 0, 90, 6.0),
(2, 10, 'Nicolas Jackson', 'FWD', 9.0, 2, 0, 0, 90, 7.0),
(2, 11, 'Raheem Sterling', 'FWD', 7.0, 1, 0, 0, 90, 6.5),
(2, 12, 'Christopher Nkunku', 'FWD', 6.0, 0, 1, 0, 90, 7.5),
(2, 13, 'Armando Broja', 'FWD', 5.0, 0, 0, 0, 90, 5.5),
(2, 14, 'Mykhailo Mudryk', 'MID', 7.0, 1, 0, 0, 90, 6.0),
(2, 15, 'Noni Madueke', 'MID', 5.0, 0, 0, 0, 90, 5.5);

-- 7. Enable RLS on all tables
ALTER TABLE simulation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweek_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_total_points ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Simulation status - readable by everyone
DROP POLICY IF EXISTS "Simulation status is viewable by everyone" ON simulation_status;
CREATE POLICY "Simulation status is viewable by everyone" ON simulation_status
  FOR SELECT USING (true);

-- Gameweek results - readable by everyone
DROP POLICY IF EXISTS "Gameweek results are viewable by everyone" ON gameweek_results;
CREATE POLICY "Gameweek results are viewable by everyone" ON gameweek_results
  FOR SELECT USING (true);

-- User gameweek scores - readable by everyone, writable by admins
DROP POLICY IF EXISTS "User gameweek scores are viewable by everyone" ON user_gameweek_scores;
CREATE POLICY "User gameweek scores are viewable by everyone" ON user_gameweek_scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "User gameweek scores are manageable by admins" ON user_gameweek_scores;
CREATE POLICY "User gameweek scores are manageable by admins" ON user_gameweek_scores
  FOR ALL USING (auth.jwt() ->> 'email' = 'rupertweiner@gmail.com');

-- User total points - readable by everyone, writable by admins
DROP POLICY IF EXISTS "User total points are viewable by everyone" ON user_total_points;
CREATE POLICY "User total points are viewable by everyone" ON user_total_points
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "User total points are manageable by admins" ON user_total_points;
CREATE POLICY "User total points are manageable by admins" ON user_total_points
  FOR ALL USING (auth.jwt() ->> 'email' = 'rupertweiner@gmail.com');

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gameweek_results_gameweek ON gameweek_results(gameweek);
CREATE INDEX IF NOT EXISTS idx_gameweek_results_player ON gameweek_results(player_id);
CREATE INDEX IF NOT EXISTS idx_user_gameweek_scores_user_gameweek ON user_gameweek_scores(user_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_user_total_points_user ON user_total_points(user_id);

-- 10. Insert initial simulation status
INSERT INTO simulation_status (is_simulation_mode, current_gameweek, is_draft_complete, total_users, started_at) VALUES
(false, 1, false, 0, NOW())
ON CONFLICT DO NOTHING;

-- 11. Verify setup
SELECT 'Simulation system setup complete!' as status;
SELECT COUNT(*) as chelsea_players_count FROM chelsea_players;
SELECT COUNT(*) as gameweek_1_results FROM gameweek_results WHERE gameweek = 1;
SELECT COUNT(*) as gameweek_2_results FROM gameweek_results WHERE gameweek = 2;
