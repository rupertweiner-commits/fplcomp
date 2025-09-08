-- Fix missing columns in draft_picks table
-- This script adds the missing total_score column that's causing the leaderboard error

-- First, let's check the current structure of draft_picks table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'draft_picks' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add the missing total_score column
ALTER TABLE public.draft_picks 
ADD COLUMN IF NOT EXISTS total_score DECIMAL(6,2) DEFAULT 0.0;

-- Also add any other missing columns that might be needed
ALTER TABLE public.draft_picks 
ADD COLUMN IF NOT EXISTS gameweek_score DECIMAL(6,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vice_captain BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS multiplier INTEGER DEFAULT 1;

-- Update existing records to have default values
UPDATE public.draft_picks 
SET total_score = 0.0 
WHERE total_score IS NULL;

UPDATE public.draft_picks 
SET gameweek_score = 0.0 
WHERE gameweek_score IS NULL;

-- Test the fix by trying to select from draft_picks with total_score
SELECT COUNT(*) as draft_picks_count, 
       AVG(total_score) as avg_total_score 
FROM public.draft_picks;
