-- Create user_teams table for storing user's drafted players
CREATE TABLE IF NOT EXISTS user_teams (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_picks table for storing draft history and gameweek scores
CREATE TABLE IF NOT EXISTS draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT,
    gameweek INTEGER,
    points INTEGER DEFAULT 0,
    pick_number INTEGER,
    round_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_teams_select_all" ON user_teams;
DROP POLICY IF EXISTS "user_teams_insert_admin" ON user_teams;
DROP POLICY IF EXISTS "user_teams_update_admin" ON user_teams;
DROP POLICY IF EXISTS "user_teams_delete_admin" ON user_teams;

DROP POLICY IF EXISTS "draft_picks_select_all" ON draft_picks;
DROP POLICY IF EXISTS "draft_picks_insert_admin" ON draft_picks;
DROP POLICY IF EXISTS "draft_picks_update_admin" ON draft_picks;
DROP POLICY IF EXISTS "draft_picks_delete_admin" ON draft_picks;

-- Create RLS policies for user_teams
CREATE POLICY "user_teams_select_all" ON user_teams
    FOR SELECT USING (true);

CREATE POLICY "user_teams_insert_admin" ON user_teams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "user_teams_update_admin" ON user_teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "user_teams_delete_admin" ON user_teams
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for draft_picks
CREATE POLICY "draft_picks_select_all" ON draft_picks
    FOR SELECT USING (true);

CREATE POLICY "draft_picks_insert_admin" ON draft_picks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "draft_picks_update_admin" ON draft_picks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "draft_picks_delete_admin" ON draft_picks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_player_id ON user_teams(player_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_user_id ON draft_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_gameweek ON draft_picks(gameweek);
CREATE INDEX IF NOT EXISTS idx_draft_picks_player_id ON draft_picks(player_id);













