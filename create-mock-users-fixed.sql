-- Create 3 mock users for testing the FPL competition simulation
-- Run this in Supabase SQL Editor
-- This version works with the correct table structure

-- First, let's check what user tables exist and create the appropriate entries
-- We'll create entries in both systems to be safe

-- Create entries in user_profiles table (new system)
INSERT INTO user_profiles (id, username, email, first_name, last_name, is_admin, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 'alex@test.com', 'Alex', 'Manager', false, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 'sarah@test.com', 'Sarah', 'Coach', false, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 'mike@test.com', 'Mike', 'Tactician', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
username = EXCLUDED.username,
email = EXCLUDED.email,
first_name = EXCLUDED.first_name,
last_name = EXCLUDED.last_name,
updated_at = NOW();

-- Create entries in users table (old system) if it exists
-- This will only work if the users table exists and uses integer IDs
INSERT INTO users (username, email, is_admin, created_at, updated_at) VALUES
('alex_manager', 'alex@test.com', false, NOW(), NOW()),
('sarah_coach', 'sarah@test.com', false, NOW(), NOW()),
('mike_tactician', 'mike@test.com', false, NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
email = EXCLUDED.email,
is_admin = EXCLUDED.is_admin,
updated_at = NOW();

-- Create user activity entries for the mock users
INSERT INTO user_activity (user_id, username, action_type, action_details, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW());

-- Set up simulation status (draft NOT complete yet)
INSERT INTO simulation_status (id, is_simulation_mode, current_gameweek, is_draft_complete) VALUES
(1, false, 1, false)
ON CONFLICT (id) DO UPDATE SET
is_simulation_mode = false,
current_gameweek = 1,
is_draft_complete = false;

-- Set up draft status (draft NOT complete yet)
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek, total_picks, created_at, updated_at) VALUES
(1, false, false, false, 1, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
is_draft_active = false,
is_draft_complete = false,
simulation_mode = false,
current_gameweek = 1,
total_picks = 0,
updated_at = NOW();

-- Create draft order for the 3 mock users
UPDATE draft_status SET 
draft_order = '[
  {"user_id": "11111111-1111-1111-1111-111111111111", "username": "alex_manager", "order": 1},
  {"user_id": "22222222-2222-2222-2222-222222222222", "username": "sarah_coach", "order": 2},
  {"user_id": "33333333-3333-3333-3333-333333333333", "username": "mike_tactician", "order": 3}
]'::jsonb,
completed_picks = '[]'::jsonb
WHERE id = 1;

SELECT 'Mock users created successfully! Ready for draft process.' as status;
