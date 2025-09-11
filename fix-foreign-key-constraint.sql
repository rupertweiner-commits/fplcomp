-- Fix Foreign Key Constraint Error
-- This script handles existing data before adding foreign key constraints

-- 1. First, let's see what data exists in draft_picks
SELECT 'Current draft_picks data:' as info;
SELECT player_id, COUNT(*) as count 
FROM draft_picks 
WHERE player_id IS NOT NULL 
GROUP BY player_id 
ORDER BY player_id;

-- 2. Check what player_ids exist in chelsea_players
SELECT 'Available chelsea_players IDs:' as info;
SELECT id, name FROM chelsea_players ORDER BY id;

-- 3. Clean up invalid player_id references in draft_picks
-- Set player_id to NULL for any records that reference non-existent players
UPDATE draft_picks 
SET player_id = NULL 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM chelsea_players);

-- 4. Clean up invalid player_id references in user_teams
UPDATE user_teams 
SET player_id = NULL 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM chelsea_players);

-- 5. Now add the foreign key constraints safely
ALTER TABLE draft_picks 
DROP CONSTRAINT IF EXISTS draft_picks_player_id_fkey;

ALTER TABLE draft_picks 
ADD CONSTRAINT draft_picks_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES chelsea_players(id) ON DELETE SET NULL;

ALTER TABLE user_teams 
DROP CONSTRAINT IF EXISTS user_teams_player_id_fkey;

ALTER TABLE user_teams 
ADD CONSTRAINT user_teams_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES chelsea_players(id) ON DELETE SET NULL;

-- 6. Verify the cleanup worked
SELECT 'Cleanup completed - checking for any remaining invalid references:' as info;
SELECT COUNT(*) as invalid_draft_picks 
FROM draft_picks 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM chelsea_players);

SELECT COUNT(*) as invalid_user_teams 
FROM user_teams 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM chelsea_players);

SELECT 'Foreign key constraints added successfully' as status;
