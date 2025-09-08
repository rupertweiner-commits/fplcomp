-- Create simulation tables for the FPL competition
-- Run this in your Supabase SQL Editor

-- Step 1: Create simulation_status table
CREATE TABLE IF NOT EXISTS public.simulation_status (
  id SERIAL PRIMARY KEY,
  is_simulation_mode BOOLEAN DEFAULT false,
  current_gameweek INTEGER DEFAULT 1,
  is_draft_complete BOOLEAN DEFAULT false,
  total_users INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create gameweek_results table
CREATE TABLE IF NOT EXISTS public.gameweek_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gameweek INTEGER NOT NULL,
  total_points INTEGER DEFAULT 0,
  captain_points INTEGER DEFAULT 0,
  bench_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gameweek)
);

-- Step 3: Create user_teams table for team assignments
CREATE TABLE IF NOT EXISTS public.user_teams (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  price DECIMAL(4,1) NOT NULL,
  is_captain BOOLEAN DEFAULT false,
  is_vice_captain BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, player_id)
);

-- Step 4: Create user_chips table for chip usage
CREATE TABLE IF NOT EXISTS public.user_chips (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chip_type TEXT NOT NULL, -- 'wildcard', 'free_hit', 'bench_boost', 'triple_captain'
  gameweek INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chip_type)
);

-- Step 5: Set up RLS policies for simulation_status
ALTER TABLE public.simulation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read simulation status" ON public.simulation_status
  FOR SELECT USING (true);

CREATE POLICY "Admins can update simulation status" ON public.simulation_status
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 6: Set up RLS policies for gameweek_results
ALTER TABLE public.gameweek_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own results" ON public.gameweek_results
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all results" ON public.gameweek_results
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 7: Set up RLS policies for user_teams
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own team" ON public.user_teams
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all teams" ON public.user_teams
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 8: Set up RLS policies for user_chips
ALTER TABLE public.user_chips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own chips" ON public.user_chips
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all chips" ON public.user_chips
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 9: Insert initial simulation status
INSERT INTO public.simulation_status (
  is_simulation_mode,
  current_gameweek,
  is_draft_complete,
  total_users
) VALUES (
  false,
  1,
  false,
  0
) ON CONFLICT DO NOTHING;

-- Step 10: Verify tables were created
SELECT 'Tables created successfully:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('simulation_status', 'gameweek_results', 'user_teams', 'user_chips')
ORDER BY table_name;
