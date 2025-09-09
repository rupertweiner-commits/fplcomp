-- Setup Chelsea players table structure and sync system
-- Run this in Supabase SQL Editor

-- First, ensure the chelsea_players table exists with correct structure
CREATE TABLE IF NOT EXISTS chelsea_players (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(10) NOT NULL,
  price DECIMAL(4,1) DEFAULT 0.0,
  team_id INTEGER DEFAULT 4,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create FPL sync log table
CREATE TABLE IF NOT EXISTS fpl_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'in_progress', 'success', 'error'
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  sync_started_at TIMESTAMP DEFAULT NOW(),
  sync_completed_at TIMESTAMP
);

-- Clear existing data (optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE chelsea_players RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE fpl_sync_log RESTART IDENTITY CASCADE;

-- Enable RLS
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Chelsea players are viewable by everyone" ON chelsea_players;
CREATE POLICY "Chelsea players are viewable by everyone" ON chelsea_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chelsea players are manageable by admins" ON chelsea_players;
CREATE POLICY "Chelsea players are manageable by admins" ON chelsea_players
  FOR ALL USING (auth.jwt() ->> 'email' = 'rupertweiner@gmail.com');

-- Verify data was inserted
SELECT COUNT(*) as total_players, 
       COUNT(CASE WHEN position = 'GK' THEN 1 END) as goalkeepers,
       COUNT(CASE WHEN position = 'DEF' THEN 1 END) as defenders,
       COUNT(CASE WHEN position = 'MID' THEN 1 END) as midfielders,
       COUNT(CASE WHEN position = 'FWD' THEN 1 END) as forwards
FROM chelsea_players;
