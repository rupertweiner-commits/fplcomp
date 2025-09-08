-- Create FPL sync system for Chelsea players
-- This will automatically fetch and sync Chelsea players from FPL API

-- Drop and recreate chelsea_players table with proper FPL integration
DROP TABLE IF EXISTS chelsea_players CASCADE;

CREATE TABLE chelsea_players (
    id SERIAL PRIMARY KEY,
    fpl_id INTEGER UNIQUE NOT NULL, -- FPL player ID (required)
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
    price DECIMAL(8,2) DEFAULT 0.0,
    team_id INTEGER, -- FPL team ID (Chelsea = 4)
    is_available BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_draft_active BOOLEAN DEFAULT false,
    is_draft_complete BOOLEAN DEFAULT false,
    simulation_mode BOOLEAN DEFAULT false,
    current_turn INTEGER,
    is_paused BOOLEAN DEFAULT false,
    active_gameweek INTEGER DEFAULT 1,
    current_gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default draft status record if none exists
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_turn, is_paused, active_gameweek, current_gameweek)
SELECT 1, false, false, false, null, false, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM draft_status WHERE id = 1);

-- Create draft_picks table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES chelsea_players(id) ON DELETE CASCADE,
    pick_order INTEGER NOT NULL,
    gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create FPL sync log table
CREATE TABLE IF NOT EXISTS fpl_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'players', 'fixtures', 'gameweek'
    status VARCHAR(20) NOT NULL, -- 'success', 'error', 'partial'
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpl_sync_log ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "draft_status_select_all" ON draft_status;
CREATE POLICY "draft_status_select_all" ON draft_status
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "chelsea_players_select_all" ON chelsea_players;
CREATE POLICY "chelsea_players_select_all" ON chelsea_players
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "draft_picks_select_all" ON draft_picks;
CREATE POLICY "draft_picks_select_all" ON draft_picks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "fpl_sync_log_select_all" ON fpl_sync_log;
CREATE POLICY "fpl_sync_log_select_all" ON fpl_sync_log
    FOR SELECT USING (true);

-- Allow admins to update draft status
DROP POLICY IF EXISTS "draft_status_update_admin" ON draft_status;
CREATE POLICY "draft_status_update_admin" ON draft_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Allow admins to manage players
DROP POLICY IF EXISTS "chelsea_players_admin_all" ON chelsea_players;
CREATE POLICY "chelsea_players_admin_all" ON chelsea_players
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create function to sync Chelsea players from FPL API
CREATE OR REPLACE FUNCTION sync_chelsea_players_from_fpl()
RETURNS JSON AS $$
DECLARE
    sync_log_id INTEGER;
    players_updated INTEGER := 0;
    error_msg TEXT;
BEGIN
    -- Log sync start
    INSERT INTO fpl_sync_log (sync_type, status, sync_started_at)
    VALUES ('players', 'in_progress', NOW())
    RETURNING id INTO sync_log_id;
    
    -- This function will be called by the API endpoint
    -- The actual FPL API call will happen in the Vercel function
    -- This is just the database structure to support it
    
    -- Update sync log as successful (will be updated by API)
    UPDATE fpl_sync_log 
    SET 
        status = 'success',
        records_updated = players_updated,
        sync_completed_at = NOW()
    WHERE id = sync_log_id;
    
    RETURN json_build_object(
        'success', true,
        'sync_log_id', sync_log_id,
        'players_updated', players_updated
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE fpl_sync_log 
    SET 
        status = 'error',
        error_message = SQLERRM,
        sync_completed_at = NOW()
    WHERE id = sync_log_id;
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'sync_log_id', sync_log_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get Chelsea team ID from FPL
CREATE OR REPLACE FUNCTION get_chelsea_team_id()
RETURNS INTEGER AS $$
BEGIN
    -- Chelsea's team ID in FPL is 4
    RETURN 4;
END;
$$ LANGUAGE plpgsql;

SELECT 'FPL sync system created! Tables ready for API integration.' as status;
