-- Simple Draft Reset - Essential Only
-- Copy and paste this into Supabase SQL Editor

-- Clear all player allocations (this is the most important part)
UPDATE chelsea_players 
SET 
    assigned_to_user_id = NULL,
    is_captain = false,
    is_vice_captain = false
WHERE assigned_to_user_id IS NOT NULL;

-- Reset draft status if table exists
UPDATE draft_status 
SET 
    is_draft_active = true,
    is_draft_complete = false,
    total_picks = 0,
    updated_at = NOW()
WHERE id = 1;

-- Check results
SELECT 
    'Reset Complete' as status,
    COUNT(*) as total_players,
    COUNT(assigned_to_user_id) as still_allocated
FROM chelsea_players;
