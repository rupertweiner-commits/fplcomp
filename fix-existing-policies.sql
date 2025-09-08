-- Fix existing policies and create missing tables
-- Run this in your Supabase SQL Editor

-- Step 1: Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read simulation status" ON public.simulation_status;
DROP POLICY IF EXISTS "Admins can update simulation status" ON public.simulation_status;
DROP POLICY IF EXISTS "Anyone can read draft status" ON public.draft_status;
DROP POLICY IF EXISTS "Admins can update draft status" ON public.draft_status;
DROP POLICY IF EXISTS "Anyone can read chelsea players" ON public.chelsea_players;
DROP POLICY IF EXISTS "Admins can manage chelsea players" ON public.chelsea_players;
DROP POLICY IF EXISTS "Users can read their own picks" ON public.draft_picks;
DROP POLICY IF EXISTS "Admins can manage all picks" ON public.draft_picks;
DROP POLICY IF EXISTS "Users can read their own results" ON public.gameweek_results;
DROP POLICY IF EXISTS "Admins can manage all results" ON public.gameweek_results;
DROP POLICY IF EXISTS "Users can read their own team" ON public.user_teams;
DROP POLICY IF EXISTS "Admins can manage all teams" ON public.user_teams;
DROP POLICY IF EXISTS "Users can read their own chips" ON public.user_chips;
DROP POLICY IF EXISTS "Admins can manage all chips" ON public.user_chips;

-- Step 2: Create tables if they don't exist
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

CREATE TABLE IF NOT EXISTS public.chelsea_players (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  price DECIMAL(4,1) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  team_id INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.draft_picks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL,
  pick_order INTEGER NOT NULL,
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.user_chips (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chip_type TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chip_type)
);

-- Step 3: Enable RLS on all tables
ALTER TABLE public.draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chelsea_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweek_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chips ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies (now that we've dropped all existing ones)
CREATE POLICY "Anyone can read draft status" ON public.draft_status
  FOR SELECT USING (true);

CREATE POLICY "Admins can update draft status" ON public.draft_status
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Anyone can read chelsea players" ON public.chelsea_players
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage chelsea players" ON public.chelsea_players
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Users can read their own picks" ON public.draft_picks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all picks" ON public.draft_picks
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Anyone can read simulation status" ON public.simulation_status
  FOR SELECT USING (true);

CREATE POLICY "Admins can update simulation status" ON public.simulation_status
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Users can read their own results" ON public.gameweek_results
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all results" ON public.gameweek_results
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Users can read their own team" ON public.user_teams
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all teams" ON public.user_teams
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Users can read their own chips" ON public.user_chips
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all chips" ON public.user_chips
  FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 5: Insert initial data
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

-- Step 6: Verify tables were created
SELECT 'All tables and policies created successfully!' as status;
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
