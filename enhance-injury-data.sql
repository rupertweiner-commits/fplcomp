-- Enhance Chelsea Players Table with Comprehensive Injury/Availability Data
-- This script adds columns to store detailed injury and availability information

-- Add injury and availability columns to chelsea_players table
ALTER TABLE chelsea_players
ADD COLUMN IF NOT EXISTS status TEXT, -- 'a' = available, 'i' = injured, 's' = suspended, 'u' = unavailable
ADD COLUMN IF NOT EXISTS news TEXT, -- Injury/suspension details and updates
ADD COLUMN IF NOT EXISTS news_added TIMESTAMP, -- When the news was last updated
ADD COLUMN IF NOT EXISTS chance_of_playing_this_round INTEGER, -- Percentage chance for current gameweek
ADD COLUMN IF NOT EXISTS chance_of_playing_next_round INTEGER, -- Percentage chance for next gameweek
ADD COLUMN IF NOT EXISTS injury_type TEXT, -- Type of injury (if any)
ADD COLUMN IF NOT EXISTS expected_return_date DATE, -- Expected return date (if available)
ADD COLUMN IF NOT EXISTS is_injured BOOLEAN DEFAULT false, -- Quick flag for injured players
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false, -- Quick flag for suspended players
ADD COLUMN IF NOT EXISTS is_doubtful BOOLEAN DEFAULT false, -- Quick flag for doubtful players (< 75% chance)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chelsea_players_status ON chelsea_players(status);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_injured ON chelsea_players(is_injured);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_suspended ON chelsea_players(is_suspended);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_doubtful ON chelsea_players(is_doubtful);

-- Create a function to update injury flags based on status and chance data
CREATE OR REPLACE FUNCTION update_injury_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Update injury flags based on status and chance data
  NEW.is_injured = (NEW.status = 'i');
  NEW.is_suspended = (NEW.status = 's');
  NEW.is_doubtful = (NEW.chance_of_playing_this_round < 75 OR NEW.chance_of_playing_next_round < 75);
  
  -- Extract injury type from news if available
  IF NEW.news IS NOT NULL AND NEW.news != '' THEN
    -- Simple extraction of injury type from news
    IF NEW.news ILIKE '%hamstring%' THEN
      NEW.injury_type = 'Hamstring';
    ELSIF NEW.news ILIKE '%knee%' THEN
      NEW.injury_type = 'Knee';
    ELSIF NEW.news ILIKE '%ankle%' THEN
      NEW.injury_type = 'Ankle';
    ELSIF NEW.news ILIKE '%muscle%' THEN
      NEW.injury_type = 'Muscle';
    ELSIF NEW.news ILIKE '%suspension%' OR NEW.news ILIKE '%suspended%' THEN
      NEW.injury_type = 'Suspension';
    ELSIF NEW.news ILIKE '%illness%' OR NEW.news ILIKE '%sick%' THEN
      NEW.injury_type = 'Illness';
    ELSE
      NEW.injury_type = 'Other';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update injury flags
DROP TRIGGER IF EXISTS update_injury_flags_trigger ON chelsea_players;
CREATE TRIGGER update_injury_flags_trigger
  BEFORE INSERT OR UPDATE ON chelsea_players
  FOR EACH ROW
  EXECUTE FUNCTION update_injury_flags();

-- Verify the setup
SELECT 'Injury/availability data enhancement completed successfully!' as status;

-- Show current injury status summary
SELECT 
  'Injury Status Summary:' as info,
  status,
  COUNT(*) as count
FROM chelsea_players 
GROUP BY status
ORDER BY status;

-- Show injury types
SELECT 
  'Injury Types:' as info,
  injury_type,
  COUNT(*) as count
FROM chelsea_players 
WHERE injury_type IS NOT NULL
GROUP BY injury_type
ORDER BY count DESC;
