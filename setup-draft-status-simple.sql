-- Step 1: Drop the table if it exists to start fresh
DROP TABLE IF EXISTS draft_status CASCADE;

-- Step 2: Create draft_status table with correct structure
CREATE TABLE draft_status (
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

-- Step 3: Insert the default record
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_turn, is_paused, active_gameweek, current_gameweek)
VALUES (1, false, false, false, null, false, 1, 1);

-- Step 4: Enable RLS
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "draft_status_select_all" ON draft_status;
DROP POLICY IF EXISTS "draft_status_update_admin" ON draft_status;
DROP POLICY IF EXISTS "draft_status_insert_admin" ON draft_status;

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















