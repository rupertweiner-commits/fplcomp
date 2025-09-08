-- Clean user teams fix - no ON CONFLICT clauses
-- Run this in your Supabase SQL Editor

-- Step 1: Check what users exist
SELECT 'Current users in database:' as info;
SELECT id, email, username, first_name, last_name, is_active 
FROM public.users;

-- Step 2: Check what Chelsea players exist
SELECT 'Current Chelsea players:' as info;
SELECT id, name, position, price 
FROM public.chelsea_players 
ORDER BY id;

-- Step 3: Clear any existing user teams
DELETE FROM public.user_teams;

-- Step 4: Create user teams manually for each user
-- First approach: CROSS JOIN
INSERT INTO public.user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
SELECT 
  u.id,
  cp.id,
  cp.name,
  cp.position,
  cp.price,
  CASE WHEN cp.id = 1 THEN true ELSE false END as is_captain,
  CASE WHEN cp.id = 2 THEN true ELSE false END as is_vice_captain
FROM public.users u
CROSS JOIN public.chelsea_players cp
WHERE u.is_active = true
AND cp.id <= 5;

-- Step 5: If that didn't work, create teams for specific users
-- Create teams for rupertweiner@gmail.com
INSERT INTO public.user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
SELECT 
  (SELECT id FROM public.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1),
  cp.id,
  cp.name,
  cp.position,
  cp.price,
  CASE WHEN cp.id = 1 THEN true ELSE false END as is_captain,
  CASE WHEN cp.id = 2 THEN true ELSE false END as is_vice_captain
FROM public.chelsea_players cp
WHERE cp.id <= 5;

-- Step 6: Verify user teams were created
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

-- Step 7: Count final results
SELECT 'Final counts:' as info;
SELECT 'User teams:' as table_name, COUNT(*) as count FROM public.user_teams
UNION ALL
SELECT 'Chelsea players:' as table_name, COUNT(*) as count FROM public.chelsea_players
UNION ALL
SELECT 'Gameweek results:' as table_name, COUNT(*) as count FROM public.gameweek_results;
