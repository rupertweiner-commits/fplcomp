-- Add team management columns to user_teams table
ALTER TABLE user_teams 
ADD COLUMN IF NOT EXISTS active_players JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS benched_player INTEGER,
ADD COLUMN IF NOT EXISTS captain INTEGER,
ADD COLUMN IF NOT EXISTS lineup_updated_at TIMESTAMP WITH TIME ZONE;

-- Create user_chips table
CREATE TABLE IF NOT EXISTS user_chips (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chip_name VARCHAR(50) NOT NULL,
    description TEXT,
    received_gameweek INTEGER NOT NULL DEFAULT 1,
    expires_gameweek INTEGER NOT NULL DEFAULT 38,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_gameweek INTEGER,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chip_usage table
CREATE TABLE IF NOT EXISTS chip_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chip_id INTEGER NOT NULL REFERENCES user_chips(id) ON DELETE CASCADE,
    chip_name VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transfer_history table
CREATE TABLE IF NOT EXISTS transfer_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_out_id INTEGER NOT NULL,
    player_in_id INTEGER NOT NULL,
    gameweek INTEGER NOT NULL,
    transfer_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_chips
CREATE POLICY "Users can read their own chips" ON user_chips
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can read all chips" ON user_chips
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all chips" ON user_chips
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for chip_usage
CREATE POLICY "Users can read chip usage" ON chip_usage
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own chip usage" ON chip_usage
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all chip usage" ON chip_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for transfer_history
CREATE POLICY "Users can read transfer history" ON transfer_history
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own transfers" ON transfer_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all transfers" ON transfer_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_chips_user_id ON user_chips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chips_is_used ON user_chips(is_used);
CREATE INDEX IF NOT EXISTS idx_chip_usage_user_id ON chip_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_chip_usage_gameweek ON chip_usage(gameweek);
CREATE INDEX IF NOT EXISTS idx_transfer_history_user_id ON transfer_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_gameweek ON transfer_history(gameweek);

-- Insert default chips for all active users
INSERT INTO user_chips (user_id, chip_name, description, received_gameweek, expires_gameweek)
SELECT 
    u.id,
    'Wildcard',
    'Free unlimited transfers for one gameweek',
    1,
    38
FROM public.users u
WHERE u.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO user_chips (user_id, chip_name, description, received_gameweek, expires_gameweek)
SELECT 
    u.id,
    'Free Hit',
    'One-week team change that reverts next gameweek',
    1,
    38
FROM public.users u
WHERE u.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO user_chips (user_id, chip_name, description, received_gameweek, expires_gameweek)
SELECT 
    u.id,
    'Bench Boost',
    'Points from bench players count this gameweek',
    1,
    38
FROM public.users u
WHERE u.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO user_chips (user_id, chip_name, description, received_gameweek, expires_gameweek)
SELECT 
    u.id,
    'Triple Captain',
    'Captain gets 3x points instead of 2x this gameweek',
    1,
    38
FROM public.users u
WHERE u.is_active = true
ON CONFLICT DO NOTHING;
