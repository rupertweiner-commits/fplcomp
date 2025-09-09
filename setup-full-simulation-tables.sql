-- Create comprehensive tables for full FPL simulation testing

-- User transfers table (for transfer mechanism testing)
CREATE TABLE IF NOT EXISTS user_transfers (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    player_out_id INTEGER NOT NULL,
    player_out_name TEXT NOT NULL,
    player_in_id INTEGER NOT NULL,
    player_in_name TEXT NOT NULL,
    transfer_cost INTEGER DEFAULT 0, -- -4 points for extra transfers
    is_free_transfer BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User chips table (for chips mechanism testing)
CREATE TABLE IF NOT EXISTS user_chips (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chip_type TEXT NOT NULL, -- 'wildcard', 'free_hit', 'bench_boost', 'triple_captain'
    gameweek_used INTEGER,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gameweek fixtures table (for realistic simulation)
CREATE TABLE IF NOT EXISTS gameweek_fixtures (
    id SERIAL PRIMARY KEY,
    gameweek INTEGER NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    kickoff_time TIMESTAMP WITH TIME ZONE,
    finished BOOLEAN DEFAULT false,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User gameweek history (for tracking performance)
CREATE TABLE IF NOT EXISTS user_gameweek_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    total_points INTEGER DEFAULT 0,
    gameweek_rank INTEGER,
    overall_rank INTEGER,
    transfers_made INTEGER DEFAULT 0,
    transfer_cost INTEGER DEFAULT 0,
    chip_used TEXT, -- which chip was used this gameweek
    team_value DECIMAL(4,1) DEFAULT 100.0, -- team value in millions
    bank_balance DECIMAL(3,1) DEFAULT 0.0, -- money in bank
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gameweek)
);

-- User team formations (for tactical testing)
CREATE TABLE IF NOT EXISTS user_formations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    formation TEXT DEFAULT '3-4-3', -- e.g., '3-4-3', '4-3-3', '5-3-2'
    captain_id INTEGER,
    vice_captain_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gameweek)
);

-- Update user_teams to include more FPL-like fields
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS is_starting_11 BOOLEAN DEFAULT true;
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false;
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false;
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS gameweek INTEGER DEFAULT 1;
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(3,1);
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS current_price DECIMAL(3,1);

-- Update draft_status to include more simulation fields
ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS total_gameweeks INTEGER DEFAULT 38;
ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS transfer_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS is_transfer_window_open BOOLEAN DEFAULT true;

-- Enable RLS on all new tables
ALTER TABLE user_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweek_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gameweek_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_formations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- User transfers policies
CREATE POLICY IF NOT EXISTS "user_transfers_select_all" ON user_transfers FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_transfers_insert_own" ON user_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_transfers_update_own" ON user_transfers FOR UPDATE USING (auth.uid() = user_id);

-- User chips policies
CREATE POLICY IF NOT EXISTS "user_chips_select_all" ON user_chips FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_chips_insert_admin" ON user_chips FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY IF NOT EXISTS "user_chips_update_own" ON user_chips FOR UPDATE USING (auth.uid() = user_id);

-- Gameweek fixtures policies (read-only for users)
CREATE POLICY IF NOT EXISTS "gameweek_fixtures_select_all" ON gameweek_fixtures FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "gameweek_fixtures_insert_admin" ON gameweek_fixtures FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- User gameweek history policies
CREATE POLICY IF NOT EXISTS "user_gameweek_history_select_all" ON user_gameweek_history FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_gameweek_history_insert_admin" ON user_gameweek_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- User formations policies
CREATE POLICY IF NOT EXISTS "user_formations_select_all" ON user_formations FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_formations_insert_own" ON user_formations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_formations_update_own" ON user_formations FOR UPDATE USING (auth.uid() = user_id);

-- Initialize chips for all existing users
INSERT INTO user_chips (user_id, chip_type, is_available)
SELECT u.id, chip_type, true
FROM users u
CROSS JOIN (
    VALUES ('wildcard'), ('free_hit'), ('bench_boost'), ('triple_captain')
) AS chips(chip_type)
WHERE NOT EXISTS (
    SELECT 1 FROM user_chips uc 
    WHERE uc.user_id = u.id AND uc.chip_type = chips.chip_type
);

-- Create some sample fixtures for testing
INSERT INTO gameweek_fixtures (gameweek, home_team, away_team, kickoff_time, finished)
VALUES 
    (1, 'Chelsea', 'Liverpool', NOW() + INTERVAL '1 day', false),
    (1, 'Manchester City', 'Arsenal', NOW() + INTERVAL '2 days', false),
    (1, 'Manchester United', 'Tottenham', NOW() + INTERVAL '3 days', false),
    (2, 'Chelsea', 'Arsenal', NOW() + INTERVAL '8 days', false),
    (2, 'Liverpool', 'Manchester City', NOW() + INTERVAL '9 days', false),
    (2, 'Tottenham', 'Newcastle', NOW() + INTERVAL '10 days', false)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_transfers_user_gameweek ON user_transfers(user_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_user_chips_user_id ON user_chips(user_id);
CREATE INDEX IF NOT EXISTS idx_gameweek_fixtures_gameweek ON gameweek_fixtures(gameweek);
CREATE INDEX IF NOT EXISTS idx_user_gameweek_history_user_gameweek ON user_gameweek_history(user_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_user_formations_user_gameweek ON user_formations(user_id, gameweek);







