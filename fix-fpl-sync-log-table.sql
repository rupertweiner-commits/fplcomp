-- Fix FPL Sync Log Table
-- This table is needed for the fpl-sync API to work properly

-- Drop and recreate fpl_sync_log table to ensure correct structure
DROP TABLE IF EXISTS fpl_sync_log;

CREATE TABLE fpl_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    players_created INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE fpl_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read sync logs
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read sync logs" ON fpl_sync_log
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert/update sync logs
CREATE POLICY IF NOT EXISTS "Allow service role to manage sync logs" ON fpl_sync_log
    FOR ALL USING (auth.role() = 'service_role');

-- Insert a sample sync log entry
INSERT INTO fpl_sync_log (sync_type, status, sync_started_at, sync_completed_at, players_created)
VALUES ('chelsea_players', 'completed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', 22)
ON CONFLICT DO NOTHING;

-- Verify the table exists and has data
SELECT * FROM fpl_sync_log ORDER BY created_at DESC LIMIT 5;
