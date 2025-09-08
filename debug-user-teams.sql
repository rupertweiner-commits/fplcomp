-- Debug user teams issue - step by step diagnosis
-- Run this in your Supabase SQL Editor

-- Step 1: Check what users exist
SELECT 'Step 1 - Current users in database:' as info;
SELECT id, email, username, first_name, last_name, is_active 
FROM public.users;

-- Step 2: Check what Chelsea players exist
SELECT 'Step 2 - Current Chelsea players:' as info;
SELECT id, name, position, price 
FROM public.chelsea_players 
ORDER BY id;

-- Step 3: Check if user_teams table exists and its structure
SELECT 'Step 3 - user_teams table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_teams' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Check current user_teams data
SELECT 'Step 4 - Current user_teams data:' as info;
SELECT * FROM public.user_teams;

-- Step 5: Test if we can insert a single record manually
SELECT 'Step 5 - Testing manual insert:' as info;
INSERT INTO public.user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
VALUES (
  (SELECT id FROM public.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1),
  1,
  'Test Player',
  'DEF',
  5.0,
  true,
  false
);

-- Step 6: Check if the manual insert worked
SELECT 'Step 6 - After manual insert:' as info;
SELECT * FROM public.user_teams;

-- Step 7: Try to insert more records
SELECT 'Step 7 - Inserting more records:' as info;
INSERT INTO public.user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
SELECT 
  (SELECT id FROM public.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1),
  cp.id,
  cp.name,
  cp.position,
  cp.price,
  false,
  false
FROM public.chelsea_players cp
WHERE cp.id BETWEEN 2 AND 5;

-- Step 8: Final check
SELECT 'Step 8 - Final user_teams count:' as info;
SELECT COUNT(*) as user_teams_count FROM public.user_teams;

-- Step 9: Show all user teams
SELECT 'Step 9 - All user teams:' as info;
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
