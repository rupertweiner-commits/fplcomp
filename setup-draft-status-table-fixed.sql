-- Create draft_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_status (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT false,
    is_draft_active BOOLEAN DEFAULT false,
    is_draft_complete BOOLEAN DEFAULT false,
    simulation_mode BOOLEAN DEFAULT false,
    current_turn INTEGER,
    current_round INTEGER DEFAULT 1,
    current_pick INTEGER DEFAULT 1,
    total_rounds INTEGER DEFAULT 5,
    time_per_pick INTEGER DEFAULT 60,
    is_paused BOOLEAN DEFAULT false,
    current_player_id INTEGER,
    active_gameweek INTEGER DEFAULT 1,
    current_gameweek INTEGER DEFAULT 1,
    draft_order JSONB DEFAULT '[]',
    completed_picks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default draft status record if none exists
INSERT INTO draft_status (id, is_active, is_draft_active, is_draft_complete, simulation_mode)
SELECT 1, false, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM draft_status WHERE id = 1);

-- Enable RLS on draft_status table
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "draft_status_select_all" ON draft_status;
DROP POLICY IF EXISTS "draft_status_update_admin" ON draft_status;
DROP POLICY IF EXISTS "draft_status_insert_admin" ON draft_status;

-- Create RLS policies for draft_status
-- Allow all authenticated users to read draft status
CREATE POLICY "draft_status_select_all" ON draft_status
    FOR SELECT USING (true);

-- Allow admins to update draft status
CREATE POLICY "draft_status_update_admin" ON draft_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Allow admins to insert draft status
CREATE POLICY "draft_status_insert_admin" ON draft_status
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create function for updating timestamp
CREATE OR REPLACE FUNCTION update_draft_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS draft_status_updated_at ON draft_status;

-- Create trigger for updating timestamp
CREATE TRIGGER draft_status_updated_at
    BEFORE UPDATE ON draft_status
    FOR EACH ROW
    EXECUTE FUNCTION update_draft_status_updated_at();







