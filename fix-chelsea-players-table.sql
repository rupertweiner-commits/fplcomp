-- Fix script for existing chelsea_players table
-- This adds the missing columns that were defined in the schema but not in the original INSERT

-- Add missing columns to existing chelsea_players table
ALTER TABLE public.chelsea_players 
ADD COLUMN IF NOT EXISTS drafted_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS draft_round INTEGER,
ADD COLUMN IF NOT EXISTS draft_position INTEGER,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS team_id INTEGER DEFAULT 7;

-- Update existing records to have proper values for new columns
UPDATE public.chelsea_players 
SET 
    drafted_by = NULL,
    draft_round = NULL,
    draft_position = NULL,
    is_available = true,
    team_id = 7
WHERE drafted_by IS NULL;

-- Create the index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_chelsea_players_drafted_by ON public.chelsea_players(drafted_by);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
ORDER BY ordinal_position;
