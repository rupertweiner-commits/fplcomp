-- Fix draft_status table by adding missing columns
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing columns to existing draft_status table
ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS total_picks INTEGER DEFAULT 0;

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS simulation_mode BOOLEAN DEFAULT false;

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS current_turn UUID REFERENCES auth.users(id);

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS active_gameweek INTEGER DEFAULT 1;

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS current_gameweek INTEGER DEFAULT 1;

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.draft_status 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update existing record with default values if needed
UPDATE public.draft_status 
SET 
  total_picks = COALESCE(total_picks, 0),
  simulation_mode = COALESCE(simulation_mode, false),
  is_paused = COALESCE(is_paused, false),
  active_gameweek = COALESCE(active_gameweek, 1),
  current_gameweek = COALESCE(current_gameweek, 1),
  updated_at = NOW()
WHERE id = 1;

-- Step 3: Verify the table structure
SELECT 'draft_status table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'draft_status' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Check current data
SELECT 'Current draft_status data:' as info;
SELECT * FROM public.draft_status;
