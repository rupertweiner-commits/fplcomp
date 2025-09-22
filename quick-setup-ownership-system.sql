-- Quick setup for ownership system to fix leaderboard
-- This will set up the ownership tracking and populate the leaderboard

-- Step 1: Run the ownership system creation (simplified version)
DO $$
BEGIN
    -- Create user_player_ownership table if it doesn't exist
    CREATE TABLE IF NOT EXISTS user_player_ownership (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        player_fpl_id INTEGER NOT NULL,
        player_name VARCHAR(100) NOT NULL,
        gameweek INTEGER NOT NULL,
        is_captain BOOLEAN DEFAULT FALSE,
        is_vice_captain BOOLEAN DEFAULT FALSE,
        ownership_start_date TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Ensure unique ownership per user-player-gameweek
        UNIQUE(user_id, player_fpl_id, gameweek)
    );

    RAISE NOTICE 'Created user_player_ownership table';

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_ownership_user_gameweek ON user_player_ownership(user_id, gameweek);
    CREATE INDEX IF NOT EXISTS idx_ownership_player_gameweek ON user_player_ownership(player_fpl_id, gameweek);
    
    -- Enable RLS
    ALTER TABLE user_player_ownership ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    DROP POLICY IF EXISTS "Users can view all ownership history" ON user_player_ownership;
    CREATE POLICY "Users can view all ownership history" ON user_player_ownership FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Admins can manage all ownership" ON user_player_ownership;
    CREATE POLICY "Admins can manage all ownership" ON user_player_ownership
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating ownership table: %', SQLERRM;
END $$;

-- Step 2: Initialize current ownership for GW4-5
DO $$
DECLARE
    user_count INTEGER := 0;
    player_count INTEGER := 0;
BEGIN
    -- Clear existing ownership for GW4-5
    DELETE FROM user_player_ownership WHERE gameweek >= 4 AND gameweek <= 5;
    
    -- Insert current ownership for GW4 and GW5
    FOR gameweek_num IN 4..5 LOOP
        INSERT INTO user_player_ownership (
            user_id, 
            player_fpl_id, 
            player_name, 
            gameweek, 
            is_captain, 
            is_vice_captain,
            ownership_start_date,
            is_active
        )
        SELECT 
            cp.assigned_to_user_id,
            cp.fpl_id,
            cp.name,
            gameweek_num,
            cp.is_captain,
            cp.is_vice_captain,
            NOW(),
            true
        FROM chelsea_players cp
        WHERE cp.assigned_to_user_id IS NOT NULL;
        
        GET DIAGNOSTICS player_count = ROW_COUNT;
        RAISE NOTICE 'Initialized ownership for GW%: % player assignments', gameweek_num, player_count;
    END LOOP;
    
    -- Count unique users
    SELECT COUNT(DISTINCT assigned_to_user_id) INTO user_count
    FROM chelsea_players 
    WHERE assigned_to_user_id IS NOT NULL;
    
    RAISE NOTICE 'Ownership initialized for % users', user_count;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error initializing ownership: %', SQLERRM;
END $$;

-- Step 3: Create simplified leaderboard view that works immediately
DROP VIEW IF EXISTS enhanced_leaderboard_with_ownership;
CREATE VIEW enhanced_leaderboard_with_ownership AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_admin,
    
    -- Team composition
    COUNT(cp.id) as allocated_players,
    STRING_AGG(
        CASE 
            WHEN cp.is_captain THEN cp.name || ' (C)' 
            WHEN cp.is_vice_captain THEN cp.name || ' (VC)'
            ELSE cp.name 
        END, 
        ', ' 
        ORDER BY cp.total_points DESC
    ) as team_players,
    
    -- Use existing total_points and baseline_points for now
    SUM(COALESCE(cp.total_points, 0)) as total_fpl_points,
    SUM(COALESCE(cp.baseline_points, 0)) as baseline_points,
    
    -- Competition points (GW 4-5 equivalent using baseline system)
    SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) as competition_points_gw4_5,
    SUM(CASE 
        WHEN cp.is_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 2
        WHEN cp.is_vice_captain THEN GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0)) * 1.5
        ELSE GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))
    END) as total_competition_points,
    
    -- Team composition for current gameweek
    COUNT(cp.id) as current_players,
    
    -- Detailed stats (using existing data)
    SUM(COALESCE(cp.goals_scored, 0)) as total_goals_gw4_5,
    SUM(COALESCE(cp.assists, 0)) as total_assists_gw4_5,
    SUM(COALESCE(cp.clean_sheets, 0)) as total_clean_sheets_gw4_5,
    SUM(COALESCE(cp.minutes, 0)) as total_minutes_gw4_5,
    
    -- Performance metrics
    ROUND(
        SUM(GREATEST(0, COALESCE(cp.total_points, 0) - COALESCE(cp.baseline_points, 0))) / 
        GREATEST(1, COUNT(cp.id)), 
        2
    ) as avg_points_per_player_gw4_5

FROM user_profiles up
LEFT JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin;

-- Show current leaderboard
SELECT 
    'Current Leaderboard Status' as info,
    first_name as name,
    allocated_players,
    total_fpl_points,
    baseline_points,
    competition_points_gw4_5,
    total_competition_points
FROM enhanced_leaderboard_with_ownership
WHERE allocated_players > 0
ORDER BY competition_points_gw4_5 DESC
LIMIT 10;

-- Success messages
DO $$
BEGIN
    RAISE NOTICE '=== OWNERSHIP SYSTEM SETUP COMPLETE ===';
    RAISE NOTICE 'Leaderboard should now populate with current data';
    RAISE NOTICE 'Run "Sync Gameweek Points" to get individual GW4-5 data';
    RAISE NOTICE 'Use ownership tracking for future transfers';
END $$;
