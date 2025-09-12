-- Add availability columns to chelsea_players table
-- This will allow us to track player availability status and reasons

-- Add new columns for availability tracking
ALTER TABLE chelsea_players 
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'Available',
ADD COLUMN IF NOT EXISTS availability_reason TEXT,
ADD COLUMN IF NOT EXISTS chance_of_playing_this_round INTEGER,
ADD COLUMN IF NOT EXISTS chance_of_playing_next_round INTEGER,
ADD COLUMN IF NOT EXISTS selected_by_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS news_added TIMESTAMPTZ;

-- Update existing records to have proper availability status
UPDATE chelsea_players 
SET availability_status = 'Available' 
WHERE availability_status IS NULL;

-- Verify the changes
SELECT 
    name, 
    position, 
    is_available, 
    availability_status, 
    availability_reason,
    chance_of_playing_this_round,
    selected_by_percent
FROM chelsea_players 
ORDER BY total_points DESC 
LIMIT 10;
