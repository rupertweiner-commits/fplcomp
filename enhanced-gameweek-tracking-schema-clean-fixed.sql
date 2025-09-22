-- Enhanced Gameweek Tracking Schema - FIXED VERSION
-- Handles existing policies gracefully

-- Drop existing policies first to prevent conflicts
DO $$ 
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Public read access" ON public.player_gameweek_performance;
    DROP POLICY IF EXISTS "Public read access" ON public.user_gameweek_scores;
    DROP POLICY IF EXISTS "Public read access" ON public.user_total_points;
    DROP POLICY IF EXISTS "Public read access" ON public.gameweek_rankings;
    DROP POLICY IF EXISTS "Public read access" ON public.season_overview;
    
    -- Drop admin policies if they exist
    DROP POLICY IF EXISTS "Admin full access" ON public.player_gameweek_performance;
    DROP POLICY IF EXISTS "Admin full access" ON public.user_gameweek_scores;
    DROP POLICY IF EXISTS "Admin full access" ON public.user_total_points;
    DROP POLICY IF EXISTS "Admin full access" ON public.gameweek_rankings;
    DROP POLICY IF EXISTS "Admin full access" ON public.season_overview;
    
    RAISE NOTICE 'Dropped existing policies';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
END $$;

-- Now run the original schema but only the essential parts
-- (Copy the relevant parts from enhanced-gameweek-tracking-schema-clean.sql)

-- Enable RLS on tables
ALTER TABLE IF EXISTS public.player_gameweek_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_total_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gameweek_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.season_overview ENABLE ROW LEVEL SECURITY;

-- Create policies (now safe to create)
CREATE POLICY "Public read access" ON public.player_gameweek_performance FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.user_gameweek_scores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.user_total_points FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.gameweek_rankings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.season_overview FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admin full access" ON public.player_gameweek_performance FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin full access" ON public.user_gameweek_scores FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin full access" ON public.user_total_points FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin full access" ON public.gameweek_rankings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin full access" ON public.season_overview FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Insert current season overview if it doesn't exist
INSERT INTO public.season_overview (season, is_active, current_gameweek, total_gameweeks, season_start)
VALUES ('2024-25', true, 4, 38, CURRENT_DATE)
ON CONFLICT (season) DO UPDATE SET
    current_gameweek = 4,
    season_start = CURRENT_DATE;

RAISE NOTICE 'Enhanced gameweek tracking schema updated successfully';
RAISE NOTICE 'Current season set to gameweek 4 (excluding GW 1-3)';
