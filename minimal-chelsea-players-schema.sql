-- Minimal schema update for chelsea_players table
-- Run this in Supabase SQL Editor

-- First, let's see what currently exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
ORDER BY ordinal_position;

-- Drop and recreate the table with minimal required columns
DROP TABLE IF EXISTS chelsea_players CASCADE;

CREATE TABLE chelsea_players (
    id INTEGER PRIMARY KEY,
    web_name TEXT NOT NULL,
    first_name TEXT,
    second_name TEXT,
    element_type INTEGER,
    position_name TEXT,
    team INTEGER DEFAULT 7,
    team_name TEXT DEFAULT 'Chelsea',
    now_cost INTEGER,
    total_points INTEGER DEFAULT 0,
    form TEXT DEFAULT '0.0',
    minutes INTEGER DEFAULT 0,
    goals_scored INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    clean_sheets INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "chelsea_players_public_read" ON chelsea_players
    FOR SELECT USING (true);

CREATE POLICY "chelsea_players_service_role_all" ON chelsea_players
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "chelsea_players_admin_all" ON chelsea_players
    FOR ALL USING (auth.jwt() ->> 'email' = 'rupertweiner@gmail.com');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chelsea_players_team ON chelsea_players(team);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_position ON chelsea_players(element_type);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_total_points ON chelsea_players(total_points);

SELECT 'Minimal chelsea_players table created successfully!' as status;
