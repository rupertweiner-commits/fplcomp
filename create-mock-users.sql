-- Create 3 mock users for testing the FPL competition simulation
-- Run this in Supabase SQL Editor

-- First, let's create the mock users in the auth.users table (if they don't exist)
-- Note: These will be created in the auth schema, but we'll also create profiles

-- Create user profiles for the mock users
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

-- Create user activity entries for the mock users
INSERT INTO user_activity (user_id, username, action_type, action_details, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 'login', '{"source": "web", "ip": "127.0.0.1"}', NOW());

-- Create some sample draft picks for testing (assigning some top players to different users)
-- Let's assign some of the best Chelsea players to different users

-- Alex gets Cole Palmer (235) and João Pedro (249)
INSERT INTO draft_picks (user_id, player_id, player_name, total_score, gameweek_score, is_captain, is_vice_captain, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 235, 'Palmer', 3, 3, true, false, NOW()),
('11111111-1111-1111-1111-111111111111', 249, 'João Pedro', 26, 26, false, true, NOW());

-- Sarah gets Enzo Fernández (237) and Chalobah (226)
INSERT INTO draft_picks (user_id, player_id, player_name, total_score, gameweek_score, is_captain, is_vice_captain, created_at) VALUES
('22222222-2222-2222-2222-222222222222', 237, 'Enzo', 25, 25, true, false, NOW()),
('22222222-2222-2222-2222-222222222222', 226, 'Chalobah', 27, 27, false, true, NOW());

-- Mike gets Sánchez (220) and Cucurella (224)
INSERT INTO draft_picks (user_id, player_id, player_name, total_score, gameweek_score, is_captain, is_vice_captain, created_at) VALUES
('33333333-3333-3333-3333-333333333333', 220, 'Sánchez', 17, 17, true, false, NOW()),
('33333333-3333-3333-3333-333333333333', 224, 'Cucurella', 19, 19, false, true, NOW());

-- Create user teams entries
INSERT INTO user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain, created_at, updated_at) VALUES
-- Alex's team
('11111111-1111-1111-1111-111111111111', 235, 'Palmer', 'MID', 10.4, true, false, NOW(), NOW()),
('11111111-1111-1111-1111-111111111111', 249, 'João Pedro', 'FWD', 7.7, false, true, NOW(), NOW()),
-- Sarah's team  
('22222222-2222-2222-2222-222222222222', 237, 'Enzo', 'MID', 6.6, true, false, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 226, 'Chalobah', 'DEF', 5.1, false, true, NOW(), NOW()),
-- Mike's team
('33333333-3333-3333-3333-333333333333', 220, 'Sánchez', 'GK', 5.0, true, false, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 224, 'Cucurella', 'DEF', 6.1, false, true, NOW(), NOW());

-- Create user total points entries
INSERT INTO user_total_points (user_id, username, total_points, gameweeks_played, average_points, last_updated) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 29, 1, 29.0, NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 52, 1, 52.0, NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 36, 1, 36.0, NOW())
ON CONFLICT (user_id) DO UPDATE SET
username = EXCLUDED.username,
total_points = EXCLUDED.total_points,
gameweeks_played = EXCLUDED.gameweeks_played,
average_points = EXCLUDED.average_points,
last_updated = NOW();

-- Set up simulation status
INSERT INTO simulation_status (id, is_simulation_mode, current_gameweek, is_draft_complete) VALUES
(1, true, 1, true)
ON CONFLICT (id) DO UPDATE SET
is_simulation_mode = true,
current_gameweek = 1,
is_draft_complete = true;

-- Create some sample gameweek results for testing
INSERT INTO gameweek_results (gameweek, player_id, player_name, position, points, goals_scored, assists, clean_sheets, minutes_played, price) VALUES
-- Gameweek 1 results
(1, 235, 'Palmer', 'MID', 3, 0, 0, 0, 90, 10.4),
(1, 249, 'João Pedro', 'FWD', 26, 2, 1, 0, 90, 7.7),
(1, 237, 'Enzo', 'MID', 25, 1, 2, 0, 90, 6.6),
(1, 226, 'Chalobah', 'DEF', 27, 0, 0, 1, 90, 5.1),
(1, 220, 'Sánchez', 'GK', 17, 0, 0, 1, 90, 5.0),
(1, 224, 'Cucurella', 'DEF', 19, 0, 1, 1, 90, 6.1);

-- Create user gameweek scores
INSERT INTO user_gameweek_scores (user_id, username, gameweek, total_points, captain_points, vice_captain_points, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'alex_manager', 1, 29, 6, 26, NOW()),
('22222222-2222-2222-2222-222222222222', 'sarah_coach', 1, 52, 50, 27, NOW()),
('33333333-3333-3333-3333-333333333333', 'mike_tactician', 1, 36, 34, 19, NOW())
ON CONFLICT (user_id, gameweek) DO UPDATE SET
username = EXCLUDED.username,
total_points = EXCLUDED.total_points,
captain_points = EXCLUDED.captain_points,
vice_captain_points = EXCLUDED.vice_captain_points,
created_at = NOW();

SELECT 'Mock users and simulation data created successfully!' as status;
