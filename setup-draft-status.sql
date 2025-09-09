-- Set up draft status for simulation testing
-- Run this in Supabase SQL Editor

-- Update draft status to show draft is complete with our mock users
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek, total_picks, created_at, updated_at) VALUES
(1, false, true, true, 1, 6, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
is_draft_active = false,
is_draft_complete = true,
simulation_mode = true,
current_gameweek = 1,
total_picks = 6,
updated_at = NOW();

-- Create a simple draft order for our mock users
UPDATE draft_status SET 
draft_order = '[
  {"user_id": "11111111-1111-1111-1111-111111111111", "username": "alex_manager", "order": 1},
  {"user_id": "22222222-2222-2222-2222-222222222222", "username": "sarah_coach", "order": 2},
  {"user_id": "33333333-3333-3333-3333-333333333333", "username": "mike_tactician", "order": 3}
]'::jsonb,
completed_picks = '[
  {"user_id": "11111111-1111-1111-1111-111111111111", "player_id": 235, "player_name": "Palmer", "round": 1, "pick": 1},
  {"user_id": "22222222-2222-2222-2222-222222222222", "player_id": 237, "player_name": "Enzo", "round": 1, "pick": 2},
  {"user_id": "33333333-3333-3333-3333-333333333333", "player_id": 220, "player_name": "Sánchez", "round": 1, "pick": 3},
  {"user_id": "11111111-1111-1111-1111-111111111111", "player_id": 249, "player_name": "João Pedro", "round": 2, "pick": 4},
  {"user_id": "22222222-2222-2222-2222-222222222222", "player_id": 226, "player_name": "Chalobah", "round": 2, "pick": 5},
  {"user_id": "33333333-3333-3333-3333-333333333333", "player_id": 224, "player_name": "Cucurella", "round": 2, "pick": 6}
]'::jsonb
WHERE id = 1;

SELECT 'Draft status configured for simulation testing!' as status;
