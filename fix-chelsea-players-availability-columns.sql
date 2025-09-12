-- Fix chelsea_players table by adding missing availability columns
-- This resolves the FPL sync error: "Could not find the 'availability_reason' column"

-- Add missing availability columns
ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS availability_reason TEXT,
ADD COLUMN IF NOT EXISTS chance_of_playing_this_round INTEGER,
ADD COLUMN IF NOT EXISTS chance_of_playing_next_round INTEGER,
ADD COLUMN IF NOT EXISTS selected_by_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS news_added TIMESTAMP WITH TIME ZONE;

-- Set default values for existing records
UPDATE chelsea_players 
SET availability_status = 'Available' 
WHERE availability_status IS NULL;

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
AND column_name IN (
  'availability_status', 
  'availability_reason', 
  'chance_of_playing_this_round', 
  'chance_of_playing_next_round', 
  'selected_by_percent', 
  'news_added'
)
ORDER BY column_name;
