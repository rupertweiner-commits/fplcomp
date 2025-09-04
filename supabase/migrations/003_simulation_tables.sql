-- Create simulation_status table
CREATE TABLE IF NOT EXISTS simulation_status (
    id SERIAL PRIMARY KEY,
    current_gameweek INTEGER NOT NULL DEFAULT 1,
    is_simulation_mode BOOLEAN NOT NULL DEFAULT false,
    is_draft_complete BOOLEAN NOT NULL DEFAULT false,
    total_gameweeks INTEGER NOT NULL DEFAULT 38,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gameweek_results table
CREATE TABLE IF NOT EXISTS gameweek_results (
    id SERIAL PRIMARY KEY,
    gameweek INTEGER NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gameweek)
);

-- Create user_teams table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_teams (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL DEFAULT 1,
    players JSONB NOT NULL,
    total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gameweek)
);

-- Enable RLS
ALTER TABLE simulation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweek_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for simulation_status
CREATE POLICY "Anyone can read simulation status" ON simulation_status
    FOR SELECT USING (true);

CREATE POLICY "Admins can update simulation status" ON simulation_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for gameweek_results
CREATE POLICY "Anyone can read gameweek results" ON gameweek_results
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage gameweek results" ON gameweek_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for user_teams
CREATE POLICY "Users can read their own teams" ON user_teams
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can read all teams" ON user_teams
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all teams" ON user_teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simulation_status_current_gameweek ON simulation_status(current_gameweek);
CREATE INDEX IF NOT EXISTS idx_gameweek_results_gameweek ON gameweek_results(gameweek);
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_gameweek ON user_teams(gameweek);

-- Insert default simulation status
INSERT INTO simulation_status (current_gameweek, is_simulation_mode, is_draft_complete, total_gameweeks)
VALUES (1, false, false, 38)
ON CONFLICT DO NOTHING;
