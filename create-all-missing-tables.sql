-- Create ALL missing tables for the FPL competition
-- Run this in your Supabase SQL Editor

-- Step 1: Create draft_status table
CREATE TABLE IF NOT EXISTS public.draft_status (
  id SERIAL PRIMARY KEY,
  is_draft_active BOOLEAN DEFAULT false,
  is_draft_complete BOOLEAN DEFAULT false,
  simulation_mode BOOLEAN DEFAULT false,
  current_turn UUID REFERENCES auth.users(id),
  is_paused BOOLEAN DEFAULT false,
  active_gameweek INTEGER DEFAULT 1,
  current_gameweek INTEGER DEFAULT 1,
  total_picks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create chelsea_players table
CREATE TABLE IF NOT EXISTS public.chelsea_players (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  price DECIMAL(4,1) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  team_id INTEGER DEFAULT 4, -- Chelsea's team ID in FPL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create draft_picks table
CREATE TABLE IF NOT EXISTS public.draft_picks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL,
  pick_order INTEGER NOT NULL,
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create simulation_status table
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

-- Step 5: Create gameweek_results table
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

-- Step 6: Create user_teams table for team assignments
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

-- Step 7: Create user_chips table for chip usage
CREATE TABLE IF NOT EXISTS public.user_chips (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chip_type TEXT NOT NULL, -- 'wildcard', 'free_hit', 'bench_boost', 'triple_captain'
  gameweek INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chip_type)
);

-- Step 8: Set up RLS policies for draft_status
ALTER TABLE public.draft_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read draft status" ON public.draft_status;
CREATE POLICY "Anyone can read draft status" ON public.draft_status
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update draft status" ON public.draft_status;
CREATE POLICY "Admins can update draft status" ON public.draft_status
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 9: Set up RLS policies for chelsea_players
ALTER TABLE public.chelsea_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read chelsea players" ON public.chelsea_players;
CREATE POLICY "Anyone can read chelsea players" ON public.chelsea_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage chelsea players" ON public.chelsea_players;
CREATE POLICY "Admins can manage chelsea players" ON public.chelsea_players
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 10: Set up RLS policies for draft_picks
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own picks" ON public.draft_picks;
CREATE POLICY "Users can read their own picks" ON public.draft_picks
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all picks" ON public.draft_picks;
CREATE POLICY "Admins can manage all picks" ON public.draft_picks
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 11: Set up RLS policies for simulation_status
ALTER TABLE public.simulation_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read simulation status" ON public.simulation_status;
CREATE POLICY "Anyone can read simulation status" ON public.simulation_status
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update simulation status" ON public.simulation_status;
CREATE POLICY "Admins can update simulation status" ON public.simulation_status
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 12: Set up RLS policies for gameweek_results
ALTER TABLE public.gameweek_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own results" ON public.gameweek_results;
CREATE POLICY "Users can read their own results" ON public.gameweek_results
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all results" ON public.gameweek_results;
CREATE POLICY "Admins can manage all results" ON public.gameweek_results
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 13: Set up RLS policies for user_teams
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own team" ON public.user_teams;
CREATE POLICY "Users can read their own team" ON public.user_teams
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all teams" ON public.user_teams;
CREATE POLICY "Admins can manage all teams" ON public.user_teams
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 14: Set up RLS policies for user_chips
ALTER TABLE public.user_chips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own chips" ON public.user_chips;
CREATE POLICY "Users can read their own chips" ON public.user_chips
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all chips" ON public.user_chips;
CREATE POLICY "Admins can manage all chips" ON public.user_chips
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 15: Insert initial data
INSERT INTO public.draft_status (
  is_draft_active,
  is_draft_complete,
  simulation_mode,
  current_turn,
  is_paused,
  active_gameweek,
  current_gameweek,
  total_picks
) VALUES (
  false,
  false,
  false,
  null,
  false,
  1,
  1,
  0
) ON CONFLICT DO NOTHING;

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

-- Step 16: Verify all tables were created
SELECT 'All tables created successfully:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'draft_status', 
  'chelsea_players', 
  'draft_picks', 
  'simulation_status', 
  'gameweek_results', 
  'user_teams', 
  'user_chips'
)
ORDER BY table_name;
