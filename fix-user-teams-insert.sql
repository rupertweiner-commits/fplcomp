-- Fix user teams insert - check what's happening and create teams properly
-- Run this in your Supabase SQL Editor

-- Step 1: Check what users exist
SELECT 'Current users in database:' as info;
SELECT id, email, username, first_name, last_name, is_active 
FROM public.users 
WHERE is_active = true;

-- Step 2: Check what Chelsea players exist
SELECT 'Current Chelsea players:' as info;
SELECT id, name, position, price 
FROM public.chelsea_players 
ORDER BY id;

-- Step 3: Clear any existing user teams (in case of conflicts)
DELETE FROM public.user_teams;

-- Step 4: Create user teams for each active user
-- Give each user the first 5 Chelsea players
INSERT INTO public.user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
SELECT 
  u.id,
  cp.id,
  cp.name,
  cp.position,
  cp.price,
  CASE WHEN cp.id = (SELECT MIN(id) FROM public.chelsea_players) THEN true ELSE false END as is_captain,
  CASE WHEN cp.id = (SELECT MIN(id) + 1 FROM public.chelsea_players) THEN true ELSE false END as is_vice_captain
FROM public.users u
CROSS JOIN public.chelsea_players cp
WHERE u.is_active = true
AND cp.id <= 5;

-- Step 5: Verify user teams were created
SELECT 'User teams created:' as info;
SELECT 
  ut.user_id,
  u.email,
  ut.player_name,
  ut.position,
  ut.price,
  ut.is_captain,
  ut.is_vice_captain
FROM public.user_teams ut
JOIN public.users u ON ut.user_id = u.id
ORDER BY ut.user_id, ut.player_id;

-- Step 6: Count final results
SELECT 'Final counts:' as info;
SELECT 'User teams:' as table_name, COUNT(*) as count FROM public.user_teams
UNION ALL
SELECT 'Chelsea players:' as table_name, COUNT(*) as count FROM public.chelsea_players
UNION ALL
SELECT 'Gameweek results:' as table_name, COUNT(*) as count FROM public.gameweek_results;
