-- Final clean database fix for all missing tables and RLS issues
-- Run this in your Supabase SQL Editor

-- Step 1: Drop ALL existing policies to avoid conflicts
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

-- Step 2: Add missing columns to existing draft_status table
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

-- Step 3: Add missing columns to existing tables first
ALTER TABLE public.user_teams 
ADD COLUMN IF NOT EXISTS price DECIMAL(4,1) DEFAULT 0.0;

-- Step 4: Create all missing tables
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

-- Step 5: Enable RLS on all tables
ALTER TABLE public.draft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chelsea_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweek_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chips ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple, non-recursive RLS policies
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

-- Step 7: Insert/update initial data
INSERT INTO public.draft_status (
  id,
  is_draft_active,
  is_draft_complete,
  simulation_mode,
  current_turn,
  is_paused,
  active_gameweek,
  current_gameweek,
  total_picks
) VALUES (
  1,
  false,
  false,
  false,
  null,
  false,
  1,
  1,
  0
) ON CONFLICT (id) DO UPDATE SET
  total_picks = COALESCE(draft_status.total_picks, 0),
  simulation_mode = COALESCE(draft_status.simulation_mode, false),
  is_paused = COALESCE(draft_status.is_paused, false),
  active_gameweek = COALESCE(draft_status.active_gameweek, 1),
  current_gameweek = COALESCE(draft_status.current_gameweek, 1),
  updated_at = NOW();

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

-- Step 8: Ensure your user exists and is admin
INSERT INTO public.users (
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1),
  'rupertweiner@gmail.com',
  'rupertweiner',
  'Rupert',
  'Weiner',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 9: Create sample Chelsea players
INSERT INTO public.chelsea_players (fpl_id, name, position, price, is_available) VALUES
(1001, 'Reece James', 'DEF', 5.5, true),
(1002, 'Thiago Silva', 'DEF', 5.0, true),
(1003, 'Ben Chilwell', 'DEF', 5.5, true),
(1004, 'Marc Cucurella', 'DEF', 5.0, true),
(1005, 'Wesley Fofana', 'DEF', 4.5, true),
(1006, 'Enzo Fernández', 'MID', 6.5, true),
(1007, 'Moises Caicedo', 'MID', 6.0, true),
(1008, 'Conor Gallagher', 'MID', 5.5, true),
(1009, 'Carney Chukwuemeka', 'MID', 5.0, true),
(1010, 'Mykhailo Mudryk', 'MID', 6.0, true),
(1011, 'Raheem Sterling', 'FWD', 7.0, true),
(1012, 'Nicolas Jackson', 'FWD', 6.5, true),
(1013, 'Christopher Nkunku', 'FWD', 7.5, true),
(1014, 'Armando Broja', 'FWD', 5.5, true),
(1015, 'Cole Palmer', 'FWD', 6.0, true);

-- Step 10: Create sample gameweek results
INSERT INTO public.gameweek_results (user_id, gameweek, total_points, captain_points, bench_points)
SELECT 
  u.id,
  1,
  0,
  0,
  0
FROM public.users u
WHERE u.is_active = true;

-- Step 11: Create sample user teams
INSERT INTO public.user_teams (user_id, player_id, player_name, position, price, is_captain, is_vice_captain)
SELECT 
  u.id,
  cp.id,
  cp.name,
  cp.position,
  cp.price,
  false,
  false
FROM public.users u
CROSS JOIN public.chelsea_players cp
WHERE u.is_active = true
AND cp.id <= 5;

-- Step 12: Verify everything was created successfully
SELECT 'Database setup completed successfully!' as status;

SELECT 'Tables created:' as info;
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

SELECT 'Your user status:' as info;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active
FROM public.users 
WHERE email = 'rupertweiner@gmail.com';

SELECT 'Sample data created:' as info;
SELECT 'Chelsea players:' as table_name, COUNT(*) as count FROM public.chelsea_players
UNION ALL
SELECT 'Gameweek results:' as table_name, COUNT(*) as count FROM public.gameweek_results
UNION ALL
SELECT 'User teams:' as table_name, COUNT(*) as count FROM public.user_teams;
