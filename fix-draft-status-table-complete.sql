-- Fix draft_status table for complete draft functionality
-- Run this in Supabase SQL Editor

-- Create draft_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_draft_active BOOLEAN DEFAULT false,
    is_draft_complete BOOLEAN DEFAULT false,
    simulation_mode BOOLEAN DEFAULT false,
    current_gameweek INTEGER DEFAULT 1,
    total_picks INTEGER DEFAULT 0,
    competition_start_date DATE,
    points_start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default record if none exists
INSERT INTO draft_status (id, is_draft_active, is_draft_complete, simulation_mode, current_gameweek, total_picks)
VALUES (1, true, false, false, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Ensure the record exists and is properly set up for draft
UPDATE draft_status 
SET 
    is_draft_active = true,
    is_draft_complete = false,
    updated_at = NOW()
WHERE id = 1;

-- Add RLS policy if needed
DROP POLICY IF EXISTS "Allow all operations on draft_status" ON draft_status;
CREATE POLICY "Allow all operations on draft_status" ON draft_status
    FOR ALL USING (true);

-- Enable RLS
ALTER TABLE draft_status ENABLE ROW LEVEL SECURITY;

-- Verify the table and data
SELECT * FROM draft_status WHERE id = 1;
