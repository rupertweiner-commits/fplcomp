-- Create 3 mock users for testing the FPL competition simulation
-- Run this in Supabase SQL Editor AFTER running consolidated-database-schema.sql
-- This version works with the consolidated schema

-- ============================================================================
-- STEP 1: CREATE MOCK USERS IN AUTH.USERS (if they don't exist)
-- ============================================================================

-- Note: In a real scenario, these would be created through Supabase Auth
-- For testing purposes, we'll create them directly in auth.users
-- This is only for testing - in production, users sign up through the app

-- ============================================================================
-- STEP 2: CREATE USER PROFILES
-- ============================================================================

-- Create user profiles for the mock users
INSERT INTO public.user_profiles (id, username, email, first_name, last_name, is_admin, is_active, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 'alex@test.com', 'Alex', 'Manager', false, true, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 'sarah@test.com', 'Sarah', 'Coach', false, true, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 'mike@test.com', 'Mike', 'Tactician', false, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
username = EXCLUDED.username,
email = EXCLUDED.email,
first_name = EXCLUDED.first_name,
last_name = EXCLUDED.last_name,
is_admin = EXCLUDED.is_admin,
is_active = EXCLUDED.is_active,
updated_at = NOW();

-- ============================================================================
-- STEP 3: CREATE USER ACTIVITY
-- ============================================================================

-- Create user activity entries for the mock users
INSERT INTO public.user_activity (user_id, username, action_type, action_details, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW());

-- ============================================================================
-- STEP 4: SET UP DRAFT STATUS
-- ============================================================================

-- Set up draft status (draft NOT complete yet)
INSERT INTO public.draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek, total_picks, created_at, updated_at) VALUES
(1, false, false, false, 1, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
is_draft_active = false,
is_draft_complete = false,
simulation_mode = false,
current_gameweek = 1,
total_picks = 0,
updated_at = NOW();

-- Create draft order for the 3 mock users
UPDATE public.draft_status SET 
draft_order = '[
  {"user_id": "11111111-1111-1111-1111-111111111111", "username": "alex_manager", "order": 1},
  {"user_id": "22222222-2222-2222-2222-222222222222", "username": "sarah_coach", "order": 2},
  {"user_id": "33333333-3333-3333-3333-333333333333", "username": "mike_tactician", "order": 3}
]'::jsonb,
completed_picks = '[]'::jsonb
WHERE id = 1;

-- ============================================================================
-- STEP 5: SET UP SIMULATION STATUS
-- ============================================================================

-- Set up simulation status (draft NOT complete yet)
INSERT INTO public.simulation_status (id, is_simulation_mode, current_gameweek, is_draft_complete, total_gameweeks, created_at, updated_at) VALUES
(1, false, 1, false, 38, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
is_simulation_mode = false,
current_gameweek = 1,
is_draft_complete = false,
total_gameweeks = 38,
updated_at = NOW();

-- ============================================================================
-- STEP 6: CREATE USER TOTAL POINTS ENTRIES
-- ============================================================================

-- Create user total points entries (all starting at 0)
INSERT INTO public.user_total_points (user_id, username, total_points, gameweeks_played, average_points, last_updated) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 0, 0, 0.0, NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 0, 0, 0.0, NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 0, 0, 0.0, NOW())
ON CONFLICT (user_id) DO UPDATE SET
username = EXCLUDED.username,
total_points = EXCLUDED.total_points,
gameweeks_played = EXCLUDED.gameweeks_played,
average_points = EXCLUDED.average_points,
last_updated = NOW();

-- ============================================================================
-- STEP 7: VERIFY SETUP
-- ============================================================================

-- Verify the setup
SELECT 
    'Mock users created successfully!' as status,
    (SELECT COUNT(*) FROM public.user_profiles WHERE username IN ('alex_manager', 'sarah_coach', 'mike_tactician')) as user_count,
    (SELECT COUNT(*) FROM public.user_activity WHERE username IN ('alex_manager', 'sarah_coach', 'mike_tactician')) as activity_count,
    (SELECT is_draft_complete FROM public.draft_status WHERE id = 1) as draft_complete,
    (SELECT is_simulation_mode FROM public.simulation_status WHERE id = 1) as simulation_mode;
