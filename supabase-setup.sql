-- KPG's Annual Chelsea Competition - Supabase Database Setup
-- This script creates all necessary tables, functions, and API endpoints

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_picture TEXT,
    notification_preferences JSONB DEFAULT '{
        "deadlineReminders": true,
        "deadlineSummaries": true,
        "transferNotifications": true,
        "chipNotifications": true,
        "liveScoreUpdates": false,
        "weeklyReports": true,
        "emailNotifications": true,
        "pushNotifications": true
    }',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draft_status table
CREATE TABLE IF NOT EXISTS public.draft_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'completed')),
    current_round INTEGER DEFAULT 1,
    current_turn_user_id UUID,
    time_per_turn INTEGER DEFAULT 60,
    is_simulation_mode BOOLEAN DEFAULT false,
    active_gameweek INTEGER DEFAULT 1,
    current_gameweek INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_teams table
CREATE TABLE IF NOT EXISTS public.user_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    team_name VARCHAR(100),
    active_players JSONB DEFAULT '[]',
    benched_player JSONB,
    captain UUID,
    chips JSONB DEFAULT '[]',
    used_chips JSONB DEFAULT '[]',
    total_points INTEGER DEFAULT 0,
    gameweek_points JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chelsea_players table
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

-- Create RLS (Row Level Security) policies
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

CREATE POLICY "Everyone can view all teams" ON public.user_teams
    FOR SELECT USING (true);

-- RLS Policies for chelsea_players
CREATE POLICY "Everyone can view Chelsea players" ON public.chelsea_players
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

CREATE POLICY "Admins can view all activity" ON public.user_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for chip_history
CREATE POLICY "Users can view their own chip history" ON public.chip_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view chip history" ON public.chip_history
    FOR SELECT USING (true);

-- RLS Policies for fpl_cache
CREATE POLICY "Everyone can read FPL cache" ON public.fpl_cache
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage FPL cache" ON public.fpl_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create functions for common operations

-- Function to get or create user profile
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile(
    p_username VARCHAR(50),
    p_email VARCHAR(255)
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.user_profiles;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Try to get existing profile
    SELECT * INTO v_profile 
    FROM public.user_profiles 
    WHERE id = v_user_id;
    
    -- If profile doesn't exist, create it
    IF v_profile IS NULL THEN
        INSERT INTO public.user_profiles (id, username, email)
        VALUES (v_user_id, p_username, p_email)
        RETURNING * INTO v_profile;
    END IF;
    
    RETURN v_profile;
END;
$$;

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_action_type VARCHAR(100),
    p_action_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_username VARCHAR(50);
    v_activity_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get username
    SELECT username INTO v_username 
    FROM public.user_profiles 
    WHERE id = v_user_id;
    
    -- Log activity
    INSERT INTO public.user_activity (
        user_id, username, action_type, action_details, 
        ip_address, user_agent, session_id
    )
    VALUES (
        v_user_id, v_username, p_action_type, p_action_details,
        p_ip_address, p_user_agent, p_session_id
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$;

-- Function to get draft status
CREATE OR REPLACE FUNCTION public.get_draft_status()
RETURNS TABLE (
    id UUID,
    status VARCHAR(50),
    current_round INTEGER,
    current_turn_user_id UUID,
    time_per_turn INTEGER,
    is_simulation_mode BOOLEAN,
    active_gameweek INTEGER,
    current_gameweek INTEGER,
    users JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.status,
        ds.current_round,
        ds.current_turn_user_id,
        ds.time_per_turn,
        ds.is_simulation_mode,
        ds.active_gameweek,
        ds.current_gameweek,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', up.id,
                    'username', up.username,
                    'profilePicture', up.profile_picture,
                    'team', ut.active_players,
                    'benchedPlayer', ut.benched_player,
                    'captain', ut.captain,
                    'totalPoints', ut.total_points,
                    'gameweekPoints', ut.gameweek_points
                )
            ) FILTER (WHERE up.id IS NOT NULL),
            '[]'::jsonb
        ) as users
    FROM public.draft_status ds
    LEFT JOIN public.user_profiles up ON true
    LEFT JOIN public.user_teams ut ON ut.user_id = up.id
    GROUP BY ds.id, ds.status, ds.current_round, ds.current_turn_user_id, 
             ds.time_per_turn, ds.is_simulation_mode, ds.active_gameweek, ds.current_gameweek;
END;
$$;

-- Insert initial data
INSERT INTO public.draft_status (status, current_round, time_per_turn)
VALUES ('waiting', 1, 60)
ON CONFLICT DO NOTHING;

-- Insert some sample Chelsea players (you can expand this list)
INSERT INTO public.chelsea_players (id, name, position, price, total_points, form) VALUES
(1, 'Cole Palmer', 'MID', 5.6, 156, 7.2),
(2, 'Nicolas Jackson', 'FWD', 6.8, 89, 6.1),
(3, 'Raheem Sterling', 'MID', 7.2, 98, 6.8),
(4, 'Enzo Fernández', 'MID', 5.1, 67, 5.9),
(5, 'Moises Caicedo', 'MID', 4.9, 45, 5.2),
(6, 'Axel Disasi', 'DEF', 4.8, 78, 6.3),
(7, 'Thiago Silva', 'DEF', 5.2, 89, 6.7),
(8, 'Reece James', 'DEF', 5.4, 67, 6.1),
(9, 'Ben Chilwell', 'DEF', 5.1, 56, 5.8),
(10, 'Robert Sánchez', 'GKP', 4.5, 89, 6.4)
ON CONFLICT (id) DO NOTHING;

-- Create admin user (you'll need to replace this with your actual user ID after first login)
-- This will be created automatically when you first log in

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
