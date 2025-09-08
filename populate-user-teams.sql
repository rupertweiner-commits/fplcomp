-- Populate user teams with actual Chelsea players
-- Run this in your Supabase SQL Editor

-- Step 1: Clear existing test data
DELETE FROM public.user_teams WHERE player_name = 'Test Player';

-- Step 2: Insert Chelsea players for rupertweiner@gmail.com
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

-- Step 3: Insert Chelsea players for any other active users
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
AND u.email != 'rupertweiner@gmail.com'
AND cp.id <= 5;

-- Step 4: Verify user teams were created
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

-- Step 5: Count final results
SELECT 'Final counts:' as info;
SELECT 'User teams:' as table_name, COUNT(*) as count FROM public.user_teams
UNION ALL
SELECT 'Chelsea players:' as table_name, COUNT(*) as count FROM public.chelsea_players
UNION ALL
SELECT 'Gameweek results:' as table_name, COUNT(*) as count FROM public.gameweek_results;
