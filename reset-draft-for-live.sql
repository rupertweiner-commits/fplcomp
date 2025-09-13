-- Reset Draft Allocations for Live Draft
-- Run this in Supabase SQL Editor to clear all test allocations

-- 1. Clear all player allocations (reset ownership) - ESSENTIAL
UPDATE chelsea_players 
SET 
    assigned_to_user_id = NULL,
    is_captain = false,
    is_vice_captain = false
WHERE assigned_to_user_id IS NOT NULL;

-- 2. Reset draft status to active (ready for new draft) - if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'draft_status') THEN
        UPDATE draft_status 
        SET 
            is_draft_active = true,
            is_draft_complete = false,
            total_picks = 0,
            updated_at = NOW()
        WHERE id = 1;
    END IF;
END $$;

-- 3. Clear user team records - if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_teams') THEN
        DELETE FROM user_teams WHERE user_id IS NOT NULL;
    END IF;
END $$;

-- 4. Clear draft picks records - if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'draft_picks') THEN
        DELETE FROM draft_picks WHERE user_id IS NOT NULL;
    END IF;
END $$;

-- 5. Reset user chips - if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_chips') THEN
        UPDATE user_chips 
        SET 
            used = false,
            used_in_gameweek = NULL,
            used_at = NULL
        WHERE used = true;
    END IF;
END $$;

-- 6. Clear performance tracking - if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_team_performance') THEN
        DELETE FROM user_team_performance WHERE user_id IS NOT NULL;
    END IF;
END $$;

-- Verification queries - check that everything is reset
SELECT 'Players Reset Check' as check_type, 
       COUNT(*) as total_players,
       COUNT(assigned_to_user_id) as allocated_players,
       COUNT(CASE WHEN is_captain THEN 1 END) as captains,
       COUNT(CASE WHEN is_vice_captain THEN 1 END) as vice_captains
FROM chelsea_players;

SELECT 'Draft Status Check' as check_type,
       is_draft_active,
       is_draft_complete,
       total_picks,
       updated_at
FROM draft_status 
WHERE id = 1;

SELECT 'User Summary' as check_type,
       COUNT(*) as total_users,
       STRING_AGG(first_name, ', ' ORDER BY first_name) as user_names
FROM user_profiles;
