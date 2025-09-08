-- Check what tables exist in the database
-- Run this in your Supabase SQL Editor

-- Check if key tables exist
SELECT 'Checking table existence...' as step;

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 
  'draft_status', 
  'player_ownership', 
  'chelsea_players',
  'user_teams_weekly',
  'player_transfers'
)
ORDER BY table_name;

-- Check if users table has the right structure
SELECT 'Checking users table structure...' as step;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current users
SELECT 'Current users in database...' as step;
SELECT 
  id,
  username,
  email,
  is_admin,
  created_at
FROM users
ORDER BY created_at;
