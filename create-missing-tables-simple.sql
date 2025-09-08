-- Create missing tables for team management (without outdated players)
-- Run this in your Supabase SQL Editor

-- Create draft_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_draft_active BOOLEAN DEFAULT false,
    is_draft_complete BOOLEAN DEFAULT false,
    simulation_mode BOOLEAN DEFAULT false,
    current_turn INTEGER,
    is_paused BOOLEAN DEFAULT false,
    active_gameweek INTEGER DEFAULT 1,
    current_gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default draft status record if none exists
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_turn, is_paused, active_gameweek, current_gameweek)
SELECT 1, false, false, false, null, false, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM draft_status WHERE id = 1);

-- Create chelsea_players table if it doesn't exist (empty for now)
CREATE TABLE IF NOT EXISTS chelsea_players (
    id SERIAL PRIMARY KEY,
    fpl_id INTEGER UNIQUE, -- FPL player ID
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
    price DECIMAL(8,2) DEFAULT 0.0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_picks table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES chelsea_players(id) ON DELETE CASCADE,
    pick_order INTEGER NOT NULL,
    gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "draft_status_select_all" ON draft_status;
CREATE POLICY "draft_status_select_all" ON draft_status
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "chelsea_players_select_all" ON chelsea_players;
CREATE POLICY "chelsea_players_select_all" ON chelsea_players
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "draft_picks_select_all" ON draft_picks;
CREATE POLICY "draft_picks_select_all" ON draft_picks
    FOR SELECT USING (true);

-- Allow admins to update draft status
DROP POLICY IF EXISTS "draft_status_update_admin" ON draft_status;
CREATE POLICY "draft_status_update_admin" ON draft_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

SELECT 'Missing tables created successfully! Run the Chelsea players script next.' as status;
