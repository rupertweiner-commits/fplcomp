-- Update baseline points to start counting from Gameweek 4 onwards
-- This will exclude gameweeks 1-3 from the leaderboard calculations
-- FIXED VERSION: Adds missing columns first

DO $$ 
BEGIN
    RAISE NOTICE 'Starting baseline update to exclude gameweeks 1-3...';
    
    -- First, ensure draft_status table has all required columns
    BEGIN
        ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS competition_start_date DATE;
        RAISE NOTICE 'Added competition_start_date column to draft_status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'competition_start_date column already exists or error: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS points_start_date DATE;
        RAISE NOTICE 'Added points_start_date column to draft_status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'points_start_date column already exists or error: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE draft_status ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to draft_status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'updated_at column already exists or error: %', SQLERRM;
    END;
    
    -- Ensure baseline_points column exists in chelsea_players
    BEGIN
        ALTER TABLE chelsea_players ADD COLUMN IF NOT EXISTS baseline_points NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added baseline_points column to chelsea_players';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'baseline_points column already exists or error: %', SQLERRM;
    END;
    
    -- Ensure draft_status has at least one record
    INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek)
    VALUES (1, false, false, false, 1)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Ensured draft_status record exists';
    
    -- Now update draft_status to reflect that competition starts from GW4
    UPDATE draft_status 
    SET 
        current_gameweek = 4,
        competition_start_date = CURRENT_DATE,
        points_start_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = 1;
    
    RAISE NOTICE 'Draft status updated to start from GW4';
    
    -- Update baseline_points for all Chelsea players to their current total_points
    -- This effectively sets their "competition starting point" to after GW3
    UPDATE chelsea_players 
    SET baseline_points = COALESCE(total_points, 0)
    WHERE total_points IS NOT NULL;
    
    RAISE NOTICE 'Updated baseline_points for % players', 
        (SELECT COUNT(*) FROM chelsea_players WHERE total_points IS NOT NULL);
    
    -- For any players without total_points, set baseline to 0
    UPDATE chelsea_players 
    SET baseline_points = 0
    WHERE total_points IS NULL OR baseline_points IS NULL;
    
    RAISE NOTICE 'Set baseline_points to 0 for players without total_points';
    
    -- Reset user_teams scores to 0 (they'll be recalculated based on new baseline)
    -- Only if the table exists and has the columns
    BEGIN
        UPDATE user_teams 
        SET 
            total_score = 0,
            gameweek_score = 0
        WHERE total_score IS NOT NULL OR gameweek_score IS NOT NULL;
        
        RAISE NOTICE 'Reset user_teams scores to 0';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'user_teams table does not exist, skipping';
    WHEN undefined_column THEN
        RAISE NOTICE 'user_teams missing score columns, skipping';
    END;
    
    -- Reset gameweek_results to 0 for future gameweeks
    -- Only if the table exists
    BEGIN
        UPDATE gameweek_results 
        SET 
            points = 0,
            captain_points = 0,
            vice_captain_points = 0
        WHERE gameweek >= 4;
        
        RAISE NOTICE 'Reset gameweek_results for GW4+';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'gameweek_results table does not exist, skipping';
    WHEN undefined_column THEN
        RAISE NOTICE 'gameweek_results missing columns, skipping';
    END;
    
    -- Update user_team_performance to reset competition points
    -- Only if the table exists
    BEGIN
        UPDATE user_team_performance 
        SET 
            total_points = 0,
            competition_points = 0
        WHERE gameweek >= 4;
        
        RAISE NOTICE 'Reset user_team_performance for GW4+';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'user_team_performance table does not exist, skipping';
    WHEN undefined_column THEN
        RAISE NOTICE 'user_team_performance missing columns, skipping';
    END;
    
    -- Show summary of changes
    RAISE NOTICE '=== BASELINE UPDATE SUMMARY ===';
    RAISE NOTICE 'Competition now starts from Gameweek 4';
    RAISE NOTICE 'Gameweeks 1-3 points are excluded from leaderboard';
    RAISE NOTICE 'All users start with 0 competition points';
    RAISE NOTICE 'Player FPL data remains unchanged';
    
END $$;

-- Verify the changes
DO $$
BEGIN
    -- Check if draft_status exists and show its content
    BEGIN
        RAISE NOTICE '=== VERIFICATION RESULTS ===';
        PERFORM 1 FROM draft_status WHERE id = 1;
        RAISE NOTICE 'Draft status record exists';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'draft_status table does not exist';
        RETURN;
    END;
END $$;

-- Show current status
SELECT 
    'Draft Status' as info_type,
    current_gameweek::text as value1,
    competition_start_date::text as value2,
    points_start_date::text as value3
FROM draft_status 
WHERE id = 1;

-- Show baseline points summary
SELECT 
    'Baseline Points' as info_type,
    COUNT(*)::text as total_players,
    AVG(COALESCE(total_points, 0))::text as avg_total_points,
    AVG(COALESCE(baseline_points, 0))::text as avg_baseline_points
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;

-- Show current leaderboard after baseline update (simplified)
SELECT 
    COALESCE(up.first_name, 'Unknown') || ' ' || COALESCE(up.last_name, '') as name,
    COUNT(cp.id) as players_allocated,
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points
FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name, up.last_name
HAVING COUNT(cp.id) > 0
ORDER BY competition_points DESC;
