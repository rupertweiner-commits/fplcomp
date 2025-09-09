-- Fix all simulation database errors
-- Run this in Supabase SQL Editor

-- First, drop all existing simulation tables to start fresh
DROP TABLE IF EXISTS draft_picks CASCADE;
DROP TABLE IF EXISTS user_teams CASCADE;
DROP TABLE IF EXISTS user_gameweek_history CASCADE;
DROP TABLE IF EXISTS draft_queue CASCADE;
DROP TABLE IF EXISTS draft_status CASCADE;

-- Create draft_status table (main control table)
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
INSERT INTO draft_status (id) VALUES (1);

-- Create user_teams table (stores user's current team)
CREATE TABLE user_teams (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT DEFAULT 'Chelsea',
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create draft_picks table (stores gameweek scoring history)
CREATE TABLE draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT DEFAULT 'Chelsea',
    gameweek INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create draft_queue table (for draft order management)
CREATE TABLE draft_queue (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    queue_position INTEGER,
    is_current_turn BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create user_gameweek_history table (for performance tracking)
CREATE TABLE user_gameweek_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    gameweek INTEGER NOT NULL,
    total_points INTEGER DEFAULT 0,
    transfers_made INTEGER DEFAULT 0,
    transfer_cost INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(user_id, gameweek)
);

-- Enable RLS on all tables
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gameweek_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (everyone can read, admins can modify)
CREATE POLICY "draft_status_select_all" ON draft_status FOR SELECT USING (true);
CREATE POLICY "draft_status_update_admin" ON draft_status FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "user_teams_select_all" ON user_teams FOR SELECT USING (true);
CREATE POLICY "user_teams_insert_admin" ON user_teams FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "user_teams_update_admin" ON user_teams FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "user_teams_delete_admin" ON user_teams FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "draft_picks_select_all" ON draft_picks FOR SELECT USING (true);
CREATE POLICY "draft_picks_insert_admin" ON draft_picks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "draft_queue_select_all" ON draft_queue FOR SELECT USING (true);
CREATE POLICY "draft_queue_insert_admin" ON draft_queue FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "user_gameweek_history_select_all" ON user_gameweek_history FOR SELECT USING (true);
CREATE POLICY "user_gameweek_history_insert_admin" ON user_gameweek_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- Create indexes for better performance
CREATE INDEX idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX idx_draft_picks_user_id ON draft_picks(user_id);
CREATE INDEX idx_draft_picks_gameweek ON draft_picks(gameweek);
CREATE INDEX idx_draft_queue_user_id ON draft_queue(user_id);
CREATE INDEX idx_user_gameweek_history_user_gameweek ON user_gameweek_history(user_id, gameweek);







