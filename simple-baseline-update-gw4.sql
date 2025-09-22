-- Simple Baseline Update for Gameweek 4 Start
-- This script ONLY updates baseline points, nothing else

DO $$ 
BEGIN
    RAISE NOTICE 'Starting simple baseline update for GW4...';
    
    -- Add baseline_points column if it doesn't exist
    BEGIN
        ALTER TABLE chelsea_players ADD COLUMN IF NOT EXISTS baseline_points NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added baseline_points column to chelsea_players';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'baseline_points column handling: %', SQLERRM;
    END;
    
    -- Add competition tracking columns to draft_status if they don't exist
    BEGIN
        ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS competition_start_date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS points_start_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added competition tracking columns to draft_status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'draft_status column handling: %', SQLERRM;
    END;
    
    -- Ensure draft_status record exists
    INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek)
    VALUES (1, false, false, false, 4)
    ON CONFLICT (id) DO UPDATE SET current_gameweek = 4;
    
    -- THE KEY UPDATE: Set baseline_points to current total_points
    -- This makes all competition calculations start from 0
    UPDATE chelsea_players 
    SET baseline_points = COALESCE(total_points, 0);
    
    GET DIAGNOSTICS updated_players = ROW_COUNT;
    RAISE NOTICE 'Updated baseline_points for % players', updated_players;
    
    -- Update draft_status with competition start info
    UPDATE draft_status 
    SET 
        competition_start_date = CURRENT_DATE,
        points_start_date = CURRENT_DATE,
        current_gameweek = 4
    WHERE id = 1;
    
    RAISE NOTICE 'Competition now starts from Gameweek 4';
    RAISE NOTICE 'All users will have 0 competition points';
    RAISE NOTICE 'Gameweeks 1-3 are excluded from leaderboard';
    
END $$;

-- Show results
SELECT 
    'Players Updated' as metric,
    COUNT(*) as count,
    AVG(total_points) as avg_total_points,
    AVG(baseline_points) as avg_baseline_points,
    AVG(total_points - baseline_points) as avg_competition_points
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;

-- Show current leaderboard (should all be 0 competition points)
SELECT 
    up.first_name as name,
    COUNT(cp.id) as players,
    SUM(cp.total_points) as total_fpl_points,
    SUM(cp.baseline_points) as baseline_points,
    SUM(cp.total_points - cp.baseline_points) as competition_points
FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name
HAVING COUNT(cp.id) > 0
ORDER BY competition_points DESC;
