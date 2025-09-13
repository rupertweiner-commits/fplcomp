-- Setup Draft Competition Starting Today
-- This script configures the system to only count points from today onwards

-- 1. First, add the required columns if they don't exist
DO $$
BEGIN
    -- Add competition start date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'draft_status' 
        AND column_name = 'competition_start_date'
    ) THEN
        ALTER TABLE draft_status ADD COLUMN competition_start_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added competition_start_date column';
    END IF;
    
    -- Add points start date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'draft_status' 
        AND column_name = 'points_start_date'
    ) THEN
        ALTER TABLE draft_status ADD COLUMN points_start_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added points_start_date column';
    END IF;
    
    -- Add baseline_points column to track pre-competition points
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chelsea_players' 
        AND column_name = 'baseline_points'
    ) THEN
        ALTER TABLE chelsea_players ADD COLUMN baseline_points INTEGER DEFAULT 0;
        RAISE NOTICE 'Added baseline_points column to chelsea_players';
    END IF;
END $$;

-- 2. Now set the competition start date to today
DO $$
DECLARE
    today_date DATE := CURRENT_DATE;
    competition_start_gameweek INTEGER := 1; -- Adjust if needed
BEGIN
    -- Update or create draft status with today as start date
    INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek, competition_start_date, points_start_date)
    VALUES (1, true, false, false, competition_start_gameweek, today_date, today_date)
    ON CONFLICT (id) 
    DO UPDATE SET 
        is_draft_active = true,
        is_draft_complete = false,
        competition_start_date = today_date,
        points_start_date = today_date,
        current_gameweek = competition_start_gameweek,
        updated_at = NOW();
        
    RAISE NOTICE 'Competition start date set to: %', today_date;
END $$;

-- 3. Set baseline points for all Chelsea players (their current total_points)
-- This preserves their current FPL points as the "starting point" for competition
UPDATE chelsea_players 
SET baseline_points = COALESCE(total_points, 0)
WHERE baseline_points IS NULL OR baseline_points = 0;

-- 4. Create a VIEW for competition points (doesn't modify actual data)
-- This calculates competition points on-the-fly without changing player data
CREATE OR REPLACE VIEW player_competition_stats AS
SELECT 
    cp.*,
    GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) as competition_points,
    CASE 
        WHEN cp.assigned_to_user_id IS NOT NULL THEN
            CASE 
                WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
                ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
            END
        ELSE 0
    END as competition_points_with_multiplier
FROM chelsea_players cp;

-- 5. Reset all user team scores to zero for fair start
UPDATE user_teams 
SET total_score = 0, 
    gameweek_score = 0
WHERE total_score IS NOT NULL;

-- 6. Clear any existing gameweek results to start fresh
DELETE FROM gameweek_results WHERE gameweek >= (
    SELECT current_gameweek FROM draft_status WHERE id = 1
);

-- 7. Create competition tracking table
CREATE TABLE IF NOT EXISTS competition_tracking (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    gameweek INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0,
    total_competition_points INTEGER DEFAULT 0,
    captain_points INTEGER DEFAULT 0,
    vice_captain_points INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gameweek)
);

-- 8. Enable RLS for competition tracking
ALTER TABLE competition_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all competition tracking" ON competition_tracking
    FOR SELECT USING (true);

CREATE POLICY "System can manage competition tracking" ON competition_tracking
    FOR ALL USING (true);

-- 9. Show current competition setup
SELECT 
    'Competition Setup' as info,
    is_draft_active,
    is_draft_complete,
    current_gameweek,
    competition_start_date,
    points_start_date,
    'Points will only count from: ' || points_start_date as note
FROM draft_status 
WHERE id = 1;

-- 10. Show baseline points summary
SELECT 
    'Baseline Points Summary' as info,
    COUNT(*) as total_players,
    SUM(baseline_points) as total_baseline_points,
    AVG(baseline_points) as avg_baseline_points,
    MAX(baseline_points) as max_baseline_points
FROM chelsea_players;

-- 11. Show competition points (should all be 0 initially)
SELECT 
    'Competition Points Check' as info,
    name,
    total_points,
    baseline_points,
    competition_points,
    assigned_to_user_id IS NOT NULL as is_allocated
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL
ORDER BY name;

-- 12. Verify user allocations are ready
SELECT 
    'User Allocations Status' as info,
    up.email,
    up.first_name,
    COUNT(cp.id) as allocated_players,
    SUM(cp.competition_points) as current_competition_points
FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name
HAVING COUNT(cp.id) > 0
ORDER BY up.email;
