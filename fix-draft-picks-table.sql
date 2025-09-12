-- Drop and recreate draft_picks table with correct structure
DROP TABLE IF EXISTS draft_picks CASCADE;

-- Create draft_picks table with all necessary columns
CREATE TABLE draft_picks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER,
    player_name TEXT,
    position TEXT,
    team TEXT,
    gameweek INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    pick_number INTEGER,
    round_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create indexes
CREATE INDEX idx_draft_picks_user_id ON draft_picks(user_id);
CREATE INDEX idx_draft_picks_gameweek ON draft_picks(gameweek);
CREATE INDEX idx_draft_picks_player_id ON draft_picks(player_id);












