-- Add missing statistics columns to chelsea_players table
-- Run this in Supabase SQL Editor

-- Add the missing columns for goals, assists, minutes, etc.
ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS goals_scored INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS own_goals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalties_saved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalties_missed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS starts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS web_name TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS second_name TEXT,
ADD COLUMN IF NOT EXISTS element_type INTEGER,
ADD COLUMN IF NOT EXISTS position_name TEXT,
ADD COLUMN IF NOT EXISTS team INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS team_name TEXT DEFAULT 'Chelsea',
ADD COLUMN IF NOT EXISTS now_cost INTEGER,
ADD COLUMN IF NOT EXISTS event_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS influence TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS creativity TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS threat TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS ict_index TEXT DEFAULT '0.0';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chelsea_players_goals ON chelsea_players(goals_scored);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_assists ON chelsea_players(assists);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_minutes ON chelsea_players(minutes);

SELECT 'Missing statistics columns added successfully!' as status;
