-- Fix User Allocations - Chelsea Players Table Only
-- This script focuses on chelsea_players.assigned_to_user_id as the single source of truth

-- 1. Check current state of chelsea_players table
SELECT 
  'Current Chelsea Players Schema' as step,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
AND table_schema = 'public'
AND column_name IN ('id', 'name', 'web_name', 'assigned_to_user_id', 'is_captain', 'is_vice_captain', 'is_available')
ORDER BY ordinal_position;

-- 2. Check if assigned_to_user_id column exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chelsea_players' 
        AND column_name = 'assigned_to_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE chelsea_players ADD COLUMN assigned_to_user_id UUID;
        RAISE NOTICE 'Added assigned_to_user_id column to chelsea_players';
    ELSE
        RAISE NOTICE 'assigned_to_user_id column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chelsea_players' 
        AND column_name = 'is_captain'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE chelsea_players ADD COLUMN is_captain BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_captain column to chelsea_players';
    ELSE
        RAISE NOTICE 'is_captain column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chelsea_players' 
        AND column_name = 'is_vice_captain'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE chelsea_players ADD COLUMN is_vice_captain BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_vice_captain column to chelsea_players';
    ELSE
        RAISE NOTICE 'is_vice_captain column already exists';
    END IF;
END $$;

-- 3. Get rupertweiner@gmail.com user ID
WITH user_info AS (
  SELECT id, email FROM user_profiles WHERE email = 'rupertweiner@gmail.com'
)
SELECT 
  'User Info' as step,
  ui.email,
  ui.id as user_id,
  (SELECT COUNT(*) FROM chelsea_players WHERE assigned_to_user_id = ui.id) as currently_assigned_players
FROM user_info ui;

-- 4. Check if user has any allocated players
SELECT 
  'Current Allocations Check' as step,
  COUNT(*) as allocated_players_count,
  string_agg(cp.name, ', ') as player_names
FROM chelsea_players cp
JOIN user_profiles up ON cp.assigned_to_user_id = up.id
WHERE up.email = 'rupertweiner@gmail.com';

-- 5. If no allocations exist, create some strategic ones
DO $$
DECLARE
  user_uuid UUID;
  allocation_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid FROM user_profiles WHERE email = 'rupertweiner@gmail.com';
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User rupertweiner@gmail.com not found in user_profiles';
  END IF;
  
  -- Check current allocations
  SELECT COUNT(*) INTO allocation_count 
  FROM chelsea_players 
  WHERE assigned_to_user_id = user_uuid;
  
  RAISE NOTICE 'User UUID: %, Current allocations: %', user_uuid, allocation_count;
  
  -- If no allocations, create some strategic ones
  IF allocation_count = 0 THEN
    -- Allocate 5 top Chelsea players to the user
    UPDATE chelsea_players 
    SET 
      assigned_to_user_id = user_uuid,
      is_captain = (name = 'Cole Palmer'), -- Make Cole Palmer captain
      is_vice_captain = (name = 'Nicolas Jackson') -- Make Nicolas Jackson vice captain
    WHERE name IN ('Cole Palmer', 'Nicolas Jackson', 'Enzo Fernández', 'Reece James', 'Robert Sánchez')
      AND is_available = true
      AND assigned_to_user_id IS NULL;
      
    -- Get count of actually assigned players
    SELECT COUNT(*) INTO allocation_count 
    FROM chelsea_players 
    WHERE assigned_to_user_id = user_uuid;
      
    RAISE NOTICE 'Allocated % players to user %', allocation_count, user_uuid;
  ELSE
    RAISE NOTICE 'User already has % players allocated', allocation_count;
  END IF;
END $$;

-- 6. Final verification - show what the user now has
SELECT 
  'Final User Allocation' as step,
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

-- 7. Show available players for future allocations
SELECT 
  'Available Players' as step,
  COUNT(*) as total_available,
  string_agg(name, ', ') as sample_players
FROM (
  SELECT name 
  FROM chelsea_players 
  WHERE is_available = true 
    AND assigned_to_user_id IS NULL 
  ORDER BY total_points DESC
  LIMIT 10
) sample;

-- 8. Summary statistics
SELECT 
  'Summary Statistics' as step,
  (SELECT COUNT(*) FROM chelsea_players WHERE assigned_to_user_id IS NOT NULL) as total_assigned_players,
  (SELECT COUNT(*) FROM chelsea_players WHERE is_available = true AND assigned_to_user_id IS NULL) as available_players,
  (SELECT COUNT(*) FROM chelsea_players WHERE assigned_to_user_id = (SELECT id FROM user_profiles WHERE email = 'rupertweiner@gmail.com')) as rupert_players;
