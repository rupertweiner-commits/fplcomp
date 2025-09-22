-- Create comprehensive ownership tracking system for transfers
-- This ensures points are awarded to the correct user for each gameweek

-- 1. Create user_player_ownership table to track who owned which player when
CREATE TABLE IF NOT EXISTS user_player_ownership (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    player_fpl_id INTEGER NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    gameweek INTEGER NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    is_vice_captain BOOLEAN DEFAULT FALSE,
    ownership_start_date TIMESTAMP DEFAULT NOW(),
    ownership_end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_user_ownership FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Ensure unique ownership per user-player-gameweek
    UNIQUE(user_id, player_fpl_id, gameweek)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ownership_user_gameweek ON user_player_ownership(user_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_ownership_player_gameweek ON user_player_ownership(player_fpl_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_ownership_active ON user_player_ownership(is_active, gameweek);

-- Enable RLS
ALTER TABLE user_player_ownership ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view all ownership history" ON user_player_ownership;
CREATE POLICY "Users can view all ownership history" ON user_player_ownership FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own ownership" ON user_player_ownership;
CREATE POLICY "Users can manage their own ownership" ON user_player_ownership 
FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all ownership" ON user_player_ownership;
CREATE POLICY "Admins can manage all ownership" ON user_player_ownership
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 2. Function to initialize current ownership from chelsea_players
CREATE OR REPLACE FUNCTION initialize_current_ownership(start_gameweek INTEGER DEFAULT 4)
RETURNS TABLE(users_processed INTEGER, players_processed INTEGER) AS $$
DECLARE
    user_count INTEGER := 0;
    player_count INTEGER := 0;
BEGIN
    -- Clear existing ownership for the start gameweek and onwards
    DELETE FROM user_player_ownership WHERE gameweek >= start_gameweek;
    
    -- Insert current ownership for each gameweek from start_gameweek onwards
    FOR gameweek_num IN start_gameweek..38 LOOP
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
        
        -- Count unique users
        SELECT COUNT(DISTINCT assigned_to_user_id) INTO user_count
        FROM chelsea_players 
        WHERE assigned_to_user_id IS NOT NULL;
        
        RAISE NOTICE 'Initialized ownership for GW%: % players across % users', gameweek_num, player_count, user_count;
    END LOOP;
    
    RETURN QUERY SELECT user_count, player_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Create view for user points per gameweek (with correct ownership)
CREATE OR REPLACE VIEW user_gameweek_points AS
SELECT 
    upo.user_id,
    up.first_name,
    up.last_name,
    upo.gameweek,
    upo.player_fpl_id,
    upo.player_name,
    upo.is_captain,
    upo.is_vice_captain,
    
    -- Get player's actual points for this gameweek
    COALESCE(gp.points, 0) as player_points,
    
    -- Apply captain/vice-captain multipliers
    CASE 
        WHEN upo.is_captain THEN COALESCE(gp.points, 0) * 2
        WHEN upo.is_vice_captain THEN COALESCE(gp.points, 0) * 1.5
        ELSE COALESCE(gp.points, 0)
    END as points_with_multiplier,
    
    -- Additional stats
    COALESCE(gp.goals_scored, 0) as goals_scored,
    COALESCE(gp.assists, 0) as assists,
    COALESCE(gp.clean_sheets, 0) as clean_sheets,
    COALESCE(gp.minutes, 0) as minutes

FROM user_player_ownership upo
LEFT JOIN user_profiles up ON up.id = upo.user_id
LEFT JOIN gameweek_points gp ON gp.fpl_id = upo.player_fpl_id AND gp.gameweek = upo.gameweek
WHERE upo.is_active = true;

-- 4. Create enhanced leaderboard with proper ownership tracking
CREATE OR REPLACE VIEW enhanced_leaderboard_with_ownership AS
SELECT 
    ugp.user_id,
    ugp.first_name,
    ugp.last_name,
    
    -- Competition points (GW 4-5 with correct ownership)
    SUM(CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.points_with_multiplier ELSE 0 END) as competition_points_gw4_5,
    
    -- All gameweeks from 4 onwards (for future expansion)
    SUM(CASE WHEN ugp.gameweek >= 4 THEN ugp.points_with_multiplier ELSE 0 END) as total_competition_points,
    
    -- Team composition for current gameweek (latest)
    COUNT(DISTINCT CASE WHEN ugp.gameweek = (SELECT MAX(gameweek) FROM user_gameweek_points WHERE user_id = ugp.user_id) THEN ugp.player_fpl_id END) as current_players,
    
    -- Detailed stats (GW 4-5)
    SUM(CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.goals_scored ELSE 0 END) as total_goals_gw4_5,
    SUM(CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.assists ELSE 0 END) as total_assists_gw4_5,
    SUM(CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.clean_sheets ELSE 0 END) as total_clean_sheets_gw4_5,
    SUM(CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.minutes ELSE 0 END) as total_minutes_gw4_5,
    
    -- Performance metrics
    ROUND(
        SUM(CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.points_with_multiplier ELSE 0 END) / 
        GREATEST(1, COUNT(DISTINCT CASE WHEN ugp.gameweek >= 4 AND ugp.gameweek <= 5 THEN ugp.player_fpl_id END)), 
        2
    ) as avg_points_per_player_gw4_5

FROM user_gameweek_points ugp
GROUP BY ugp.user_id, ugp.first_name, ugp.last_name;

-- 5. Function to handle player transfers
CREATE OR REPLACE FUNCTION transfer_player(
    p_player_fpl_id INTEGER,
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_transfer_gameweek INTEGER,
    p_is_captain BOOLEAN DEFAULT FALSE,
    p_is_vice_captain BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
    player_name_var VARCHAR(100);
BEGIN
    -- Get player name
    SELECT name INTO player_name_var FROM chelsea_players WHERE fpl_id = p_player_fpl_id;
    
    IF player_name_var IS NULL THEN
        RAISE EXCEPTION 'Player with FPL ID % not found', p_player_fpl_id;
    END IF;
    
    -- End ownership for the previous user (from transfer gameweek onwards)
    UPDATE user_player_ownership 
    SET 
        is_active = false,
        ownership_end_date = NOW(),
        updated_at = NOW()
    WHERE 
        user_id = p_from_user_id 
        AND player_fpl_id = p_player_fpl_id 
        AND gameweek >= p_transfer_gameweek
        AND is_active = true;
    
    -- Create new ownership for the new user (from transfer gameweek onwards)
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
        p_to_user_id,
        p_player_fpl_id,
        player_name_var,
        generate_series(p_transfer_gameweek, 38),
        p_is_captain,
        p_is_vice_captain,
        NOW(),
        true
    ON CONFLICT (user_id, player_fpl_id, gameweek) 
    DO UPDATE SET
        is_captain = p_is_captain,
        is_vice_captain = p_is_vice_captain,
        ownership_start_date = NOW(),
        is_active = true,
        updated_at = NOW();
    
    -- Update the main chelsea_players table
    UPDATE chelsea_players 
    SET 
        assigned_to_user_id = p_to_user_id,
        is_captain = p_is_captain,
        is_vice_captain = p_is_vice_captain,
        updated_at = NOW()
    WHERE fpl_id = p_player_fpl_id;
    
    RAISE NOTICE 'Transferred % from user % to user % starting GW%', player_name_var, p_from_user_id, p_to_user_id, p_transfer_gameweek;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Success messages
DO $$
BEGIN
    RAISE NOTICE '=== OWNERSHIP TRACKING SYSTEM CREATED ===';
    RAISE NOTICE 'Tables: user_player_ownership';
    RAISE NOTICE 'Views: user_gameweek_points, enhanced_leaderboard_with_ownership';
    RAISE NOTICE 'Functions: initialize_current_ownership(), transfer_player()';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run: SELECT * FROM initialize_current_ownership(4);';
    RAISE NOTICE '2. Use transfer_player() function for future transfers';
    RAISE NOTICE '3. Points will be awarded to correct owner for each gameweek';
    RAISE NOTICE '';
    RAISE NOTICE 'TRANSFER EXAMPLE:';
    RAISE NOTICE 'SELECT transfer_player(123, ''user1-uuid'', ''user2-uuid'', 6, false, false);';
    RAISE NOTICE 'This transfers player 123 from user1 to user2 starting GW6';
    RAISE NOTICE 'User1 keeps GW4-5 points, User2 gets GW6+ points';
END $$;
