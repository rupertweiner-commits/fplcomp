-- Update Chelsea players table to include FPL API fields
-- Run this in your Supabase SQL Editor

-- Add FPL-specific columns to chelsea_players table
ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS fpl_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS form DECIMAL(3,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS selected_by_percent DECIMAL(4,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS news TEXT,
ADD COLUMN IF NOT EXISTS news_added TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS chance_of_playing_this_round INTEGER,
ADD COLUMN IF NOT EXISTS chance_of_playing_next_round INTEGER;

-- Create index on fpl_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_chelsea_players_fpl_id ON chelsea_players(fpl_id);

-- Create index on total_points for sorting
CREATE INDEX IF NOT EXISTS idx_chelsea_players_total_points ON chelsea_players(total_points);

-- Update the existing players to have fpl_id (if they exist)
-- This will be handled by the sync function

SELECT 'FPL schema update complete!' as status;
