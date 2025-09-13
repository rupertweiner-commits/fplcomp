-- Fix User Allocations Persistence Issue
-- This script syncs data between different allocation systems and ensures persistence

-- 1. First, let's check what data exists in each table for rupertweiner@gmail.com
WITH user_info AS (
  SELECT id, email FROM user_profiles WHERE email = 'rupertweiner@gmail.com'
)
SELECT 
  'Current State Check' as step,
  ui.email,
  ui.id as user_id,
  (SELECT COUNT(*) FROM chelsea_players WHERE assigned_to_user_id = ui.id) as chelsea_players_count,
  (SELECT COUNT(*) FROM draft_allocations WHERE target_user_id = ui.id) as draft_allocations_count,
  (SELECT COUNT(*) FROM user_teams WHERE user_id = ui.id) as user_teams_count
FROM user_info ui;

-- 2. Sync draft_allocations to chelsea_players (if allocations exist in draft_allocations)
UPDATE chelsea_players 
SET 
  assigned_to_user_id = da.target_user_id,
  is_captain = false,
  is_vice_captain = false
FROM draft_allocations da
JOIN user_profiles up ON da.target_user_id = up.id
WHERE chelsea_players.id = da.player_id
  AND up.email = 'rupertweiner@gmail.com'
  AND chelsea_players.assigned_to_user_id IS NULL;

-- 3. Sync chelsea_players to user_teams (ensure user_teams reflects chelsea_players)
INSERT INTO user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
SELECT 
  cp.assigned_to_user_id,
  cp.id,
  cp.web_name,
  cp.position,
  cp.price,
  cp.is_captain,
  cp.is_vice_captain
FROM chelsea_players cp
JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com'
  AND cp.assigned_to_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_teams ut 
    WHERE ut.user_id = cp.assigned_to_user_id 
    AND ut.player_id = cp.id
  );

-- 4. If no allocations exist anywhere, create some test allocations
-- (Only run this if the user has 0 players allocated)
DO $$
DECLARE
  user_uuid UUID;
  allocation_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid FROM user_profiles WHERE email = 'rupertweiner@gmail.com';
  
  -- Check current allocations
  SELECT COUNT(*) INTO allocation_count 
  FROM chelsea_players 
  WHERE assigned_to_user_id = user_uuid;
  
  -- If no allocations, create some test ones
  IF allocation_count = 0 THEN
    -- Allocate 5 strategic players to the user
    UPDATE chelsea_players 
    SET 
      assigned_to_user_id = user_uuid,
      is_captain = (name = 'Cole Palmer'), -- Make Cole Palmer captain
      is_vice_captain = (name = 'Nicolas Jackson') -- Make Nicolas Jackson vice captain
    WHERE name IN ('Cole Palmer', 'Nicolas Jackson', 'Enzo Fernández', 'Reece James', 'Robert Sánchez')
      AND is_available = true
      AND assigned_to_user_id IS NULL;
      
    RAISE NOTICE 'Allocated 5 players to user %', user_uuid;
  ELSE
    RAISE NOTICE 'User already has % players allocated', allocation_count;
  END IF;
END $$;

-- 5. Final verification - show what the user now has
SELECT 
  'Final Allocation State' as step,
  cp.id,
  cp.name,
  cp.web_name,
  cp.position,
  cp.price,
  cp.total_points,
  cp.is_captain,
  cp.is_vice_captain,
  up.email
FROM chelsea_players cp
JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com'
ORDER BY cp.position, cp.name;

-- 6. Verify user_teams table is synced
SELECT 
  'User Teams Sync Check' as step,
  ut.player_name,
  ut.position,
  ut.price,
  ut.is_captain,
  ut.is_vice_captain,
  up.email
FROM user_teams ut
JOIN user_profiles up ON ut.user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com'
ORDER BY ut.position, ut.player_name;
