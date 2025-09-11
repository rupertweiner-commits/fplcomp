-- Reset Draft and Update Mock Users
-- This script resets all player assignments and cleans up the user list

-- 1. Reset all player assignments
-- Set assigned_to_user_id to NULL for all players
-- Reset is_captain and is_vice_captain flags
UPDATE chelsea_players
SET
  assigned_to_user_id = NULL,
  is_captain = FALSE,
  is_vice_captain = FALSE;

-- 2. Delete existing mock users (keeping only essential ones)
-- Remove all the test users we created
DELETE FROM user_profiles
WHERE username IN (
  'admin', 'user1', 'user2', 'sarah_coach', 'mike_tactician', 
  'alex_manager', 'yasmin', 'rupert'
) OR email IN (
  'admin@example.com', 'user1@example.com', 'user2@example.com',
  'sarah@example.com', 'mike@example.com', 'alex@example.com',
  'yasmin@example.com', 'rupert@example.com'
);

-- 3. Insert clean mock users (Rupert, Yasmin, and two others)
-- Using specific UUIDs for consistency
INSERT INTO user_profiles (id, username, email, first_name, last_name, is_admin, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'rupert', 'rupert@example.com', 'Rupert', 'Weiner', true, true),
  ('00000000-0000-0000-0000-000000000002', 'yasmin', 'yasmin@example.com', 'Yasmin', 'Cherry', false, true),
  ('00000000-0000-0000-0000-000000000003', 'alex', 'alex@example.com', 'Alex', 'Manager', false, true),
  ('00000000-0000-0000-0000-000000000004', 'sarah', 'sarah@example.com', 'Sarah', 'Coach', false, true)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active;

-- 4. Verify the changes
SELECT 'Draft reset and users cleaned up successfully!' as status;

-- Show current users
SELECT 'Current users:' as info;
SELECT id, username, email, first_name, last_name, is_admin, is_active 
FROM user_profiles 
ORDER BY username;

-- Show unassigned players count
SELECT 'Available players:' as info, COUNT(*) as count 
FROM chelsea_players 
WHERE assigned_to_user_id IS NULL AND is_available = true;

-- Show assigned players (should be 0)
SELECT 'Assigned players:' as info, COUNT(*) as count 
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;
