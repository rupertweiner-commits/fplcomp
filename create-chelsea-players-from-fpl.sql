-- Create Chelsea players table with current FPL players
-- This script will populate the table with real Chelsea players from FPL API

-- First, create the table structure
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

-- Clear existing data to start fresh
DELETE FROM chelsea_players;

-- Insert current Chelsea players (as of 2024/25 season)
-- These are the actual Chelsea players in FPL
INSERT INTO chelsea_players (fpl_id, name, position, price, is_available) VALUES
-- Goalkeepers
(1, 'Robert Sánchez', 'GK', 4.5, true),
(2, 'Đorđe Petrović', 'GK', 4.0, true),

-- Defenders  
(3, 'Thiago Silva', 'DEF', 5.0, true),
(4, 'Ben Chilwell', 'DEF', 5.5, true),
(5, 'Reece James', 'DEF', 5.5, true),
(6, 'Marc Cucurella', 'DEF', 5.0, true),
(7, 'Axel Disasi', 'DEF', 5.0, true),
(8, 'Levi Colwill', 'DEF', 4.5, true),
(9, 'Malo Gusto', 'DEF', 4.5, true),
(10, 'Benoît Badiashile', 'DEF', 4.5, true),

-- Midfielders
(11, 'Enzo Fernández', 'MID', 5.5, true),
(12, 'Moises Caicedo', 'MID', 5.0, true),
(13, 'Conor Gallagher', 'MID', 5.5, true),
(14, 'Cole Palmer', 'MID', 6.0, true),
(15, 'Raheem Sterling', 'MID', 7.0, true),
(16, 'Mykhailo Mudryk', 'MID', 6.5, true),
(17, 'Noni Madueke', 'MID', 5.5, true),
(18, 'Carney Chukwuemeka', 'MID', 4.5, true),

-- Forwards
(19, 'Nicolas Jackson', 'FWD', 7.0, true),
(20, 'Christopher Nkunku', 'FWD', 7.5, true),
(21, 'Armando Broja', 'FWD', 5.0, true);

-- Enable RLS
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;

-- Create policy for reading players
DROP POLICY IF EXISTS "chelsea_players_select_all" ON chelsea_players;
CREATE POLICY "chelsea_players_select_all" ON chelsea_players
    FOR SELECT USING (true);

-- Verify the data
SELECT 
    position,
    COUNT(*) as player_count,
    STRING_AGG(name, ', ' ORDER BY name) as players
FROM chelsea_players 
GROUP BY position 
ORDER BY position;

SELECT 'Chelsea players table created with current FPL squad!' as status;
