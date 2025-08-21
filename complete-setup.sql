-- Complete setup script for KPG's Chelsea Competition
-- This creates all tables in the correct order with proper dependencies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table first (referenced by other tables)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture TEXT,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT false,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_teams table
CREATE TABLE IF NOT EXISTS public.user_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    active_players INTEGER[] DEFAULT '{}',
    benched_player INTEGER,
    captain INTEGER,
    total_points INTEGER DEFAULT 0,
    gameweek_points INTEGER DEFAULT 0,
    chips JSONB DEFAULT '[]',
    used_chips JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_status table
CREATE TABLE IF NOT EXISTS public.draft_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'waiting',
    current_round INTEGER DEFAULT 1,
    current_turn_user_id UUID REFERENCES public.user_profiles(id),
    time_per_turn INTEGER DEFAULT 60,
    is_simulation_mode BOOLEAN DEFAULT false,
    active_gameweek INTEGER DEFAULT 1,
    current_gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chelsea_players table (now user_profiles exists)
CREATE TABLE IF NOT EXISTS public.chelsea_players (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL,
    team_id INTEGER DEFAULT 7,
    price DECIMAL(5,1),
    total_points INTEGER DEFAULT 0,
    form DECIMAL(4,2),
    is_available BOOLEAN DEFAULT true,
    drafted_by UUID REFERENCES public.user_profiles(id),
    draft_round INTEGER,
    draft_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_queue table
CREATE TABLE IF NOT EXISTS public.draft_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES public.chelsea_players(id),
    queue_position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_activity table
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chip_history table
CREATE TABLE IF NOT EXISTS public.chip_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    chip_name VARCHAR(100) NOT NULL,
    chip_description TEXT,
    rarity VARCHAR(20),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    target_user_id UUID REFERENCES public.user_profiles(id),
    gameweek INTEGER,
    points_earned INTEGER DEFAULT 0
);

-- Create FPL data cache table
CREATE TABLE IF NOT EXISTS public.fpl_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON public.user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_drafted_by ON public.chelsea_players(drafted_by);
CREATE INDEX IF NOT EXISTS idx_draft_queue_user_id ON public.draft_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_fpl_cache_expires_at ON public.fpl_cache(expires_at);

-- Enable RLS (Row Level Security) policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chelsea_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chip_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpl_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for user_teams
CREATE POLICY "Users can view their own team" ON public.user_teams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own team" ON public.user_teams
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for chelsea_players
CREATE POLICY "Users can view all Chelsea players" ON public.chelsea_players
    FOR SELECT USING (true);

CREATE POLICY "Admins can update Chelsea players" ON public.chelsea_players
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for draft_queue
CREATE POLICY "Users can view their own draft queue" ON public.draft_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own draft queue" ON public.draft_queue
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_activity
CREATE POLICY "Users can view their own activity" ON public.user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity" ON public.user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chip_history
CREATE POLICY "Users can view their own chip history" ON public.chip_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chip history" ON public.chip_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for fpl_cache
CREATE POLICY "Anyone can view FPL cache" ON public.fpl_cache
    FOR SELECT USING (true);

-- Insert initial data
INSERT INTO public.draft_status (status, current_round, time_per_turn)
VALUES ('waiting', 1, 60)
ON CONFLICT DO NOTHING;

-- Insert sample Chelsea players with all required columns
INSERT INTO public.chelsea_players (id, name, position, team_id, price, total_points, form, is_available, drafted_by, draft_round, draft_position) VALUES
(1, 'Cole Palmer', 'MID', 7, 5.6, 156, 7.2, true, NULL, NULL, NULL),
(2, 'Nicolas Jackson', 'FWD', 7, 6.8, 89, 6.1, true, NULL, NULL, NULL),
(3, 'Raheem Sterling', 'MID', 7, 7.2, 98, 6.8, true, NULL, NULL, NULL),
(4, 'Enzo Fernández', 'MID', 7, 5.1, 67, 5.9, true, NULL, NULL, NULL),
(5, 'Moises Caicedo', 'MID', 7, 4.9, 45, 5.2, true, NULL, NULL, NULL),
(6, 'Axel Disasi', 'DEF', 7, 4.8, 78, 6.3, true, NULL, NULL, NULL),
(7, 'Thiago Silva', 'DEF', 7, 5.2, 89, 6.7, true, NULL, NULL, NULL),
(8, 'Reece James', 'DEF', 7, 5.4, 67, 6.1, true, NULL, NULL, NULL),
(9, 'Ben Chilwell', 'DEF', 7, 5.1, 56, 5.8, true, NULL, NULL, NULL),
(10, 'Robert Sánchez', 'GKP', 7, 4.5, 89, 6.4, true, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_teams_updated_at BEFORE UPDATE ON public.user_teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chelsea_players_updated_at BEFORE UPDATE ON public.chelsea_players
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;

-- Verify the setup
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
