-- Minimal setup to get simulation working
-- Run this in Supabase SQL Editor

-- Ensure draft_status table exists with correct structure
DROP TABLE IF EXISTS draft_status CASCADE;

CREATE TABLE draft_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_draft_active BOOLEAN DEFAULT false,
    is_draft_complete BOOLEAN DEFAULT false,
    simulation_mode BOOLEAN DEFAULT false,
    current_turn INTEGER,
    is_paused BOOLEAN DEFAULT false,
    active_gameweek INTEGER DEFAULT 1,
    current_gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default record
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_turn, is_paused, active_gameweek, current_gameweek)
VALUES (1, false, false, false, null, false, 1, 1);

-- Ensure user_teams table exists
CREATE TABLE IF NOT EXISTS user_teams (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT DEFAULT 'Chelsea',
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure draft_picks table exists  
CREATE TABLE IF NOT EXISTS draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT DEFAULT 'Chelsea',
    gameweek INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "draft_status_select_all" ON draft_status;
DROP POLICY IF EXISTS "draft_status_update_admin" ON draft_status;
DROP POLICY IF EXISTS "user_teams_select_all" ON user_teams;
DROP POLICY IF EXISTS "user_teams_insert_admin" ON user_teams;
DROP POLICY IF EXISTS "draft_picks_select_all" ON draft_picks;
DROP POLICY IF EXISTS "draft_picks_insert_admin" ON draft_picks;

-- Create simple RLS policies
CREATE POLICY "draft_status_select_all" ON draft_status FOR SELECT USING (true);
CREATE POLICY "draft_status_update_admin" ON draft_status FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "user_teams_select_all" ON user_teams FOR SELECT USING (true);
CREATE POLICY "user_teams_insert_admin" ON user_teams FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "draft_picks_select_all" ON draft_picks FOR SELECT USING (true);
CREATE POLICY "draft_picks_insert_admin" ON draft_picks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);





