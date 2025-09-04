-- Create player_ownership table to track which players belong to which users
CREATE TABLE IF NOT EXISTS player_ownership (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    player_position VARCHAR(10) NOT NULL,
    player_price DECIMAL(10,2) NOT NULL,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acquired_via VARCHAR(50) DEFAULT 'draft', -- 'draft', 'transfer', 'chip'
    gameweek_acquired INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, player_id, gameweek_acquired)
);

-- Create player_transfers table to track all player movements
CREATE TABLE IF NOT EXISTS player_transfers (
    id SERIAL PRIMARY KEY,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    transfer_type VARCHAR(50) NOT NULL, -- 'transfer', 'chip_steal', 'chip_gift'
    gameweek INTEGER NOT NULL,
    transfer_cost DECIMAL(10,2) DEFAULT 0,
    chip_used VARCHAR(50), -- If transfer was via chip
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_teams_weekly table to track weekly lineups
CREATE TABLE IF NOT EXISTS user_teams_weekly (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    active_players JSONB NOT NULL DEFAULT '[]', -- Array of player IDs
    benched_player INTEGER, -- Single benched player ID
    captain INTEGER, -- Captain player ID
    vice_captain INTEGER, -- Vice captain player ID
    formation VARCHAR(20) DEFAULT '4-3-3',
    total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gameweek)
);

-- Create draft_allocations table to track admin's manual allocations
CREATE TABLE IF NOT EXISTS draft_allocations (
    id SERIAL PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    player_position VARCHAR(10) NOT NULL,
    player_price DECIMAL(10,2) NOT NULL,
    allocation_round INTEGER NOT NULL, -- Which round of the draft
    allocation_order INTEGER NOT NULL, -- Order within the round
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(target_user_id, player_id)
);

-- Enable RLS
ALTER TABLE player_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for player_ownership
CREATE POLICY "Users can read their own player ownership" ON player_ownership
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can read all player ownership" ON player_ownership
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all player ownership" ON player_ownership
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for player_transfers
CREATE POLICY "Users can read all transfers" ON player_transfers
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own transfers" ON player_transfers
    FOR INSERT WITH CHECK (to_user_id = auth.uid());

CREATE POLICY "Admins can manage all transfers" ON player_transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for user_teams_weekly
CREATE POLICY "Users can read their own weekly teams" ON user_teams_weekly
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can read all weekly teams" ON user_teams_weekly
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own weekly teams" ON user_teams_weekly
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all weekly teams" ON user_teams_weekly
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for draft_allocations
CREATE POLICY "Users can read draft allocations" ON draft_allocations
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage draft allocations" ON draft_allocations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_ownership_user_id ON player_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_player_ownership_player_id ON player_ownership(player_id);
CREATE INDEX IF NOT EXISTS idx_player_ownership_active ON player_ownership(is_active);
CREATE INDEX IF NOT EXISTS idx_player_transfers_from_user ON player_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_player_transfers_to_user ON player_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_player_transfers_gameweek ON player_transfers(gameweek);
CREATE INDEX IF NOT EXISTS idx_user_teams_weekly_user_gameweek ON user_teams_weekly(user_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_draft_allocations_target_user ON draft_allocations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_draft_allocations_round ON draft_allocations(allocation_round, allocation_order);

-- Add function to automatically create player ownership when draft allocation is made
CREATE OR REPLACE FUNCTION create_player_ownership_from_draft()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into player_ownership table
    INSERT INTO player_ownership (
        user_id,
        player_id,
        player_name,
        player_position,
        player_price,
        acquired_via,
        gameweek_acquired
    ) VALUES (
        NEW.target_user_id,
        NEW.player_id,
        NEW.player_name,
        NEW.player_position,
        NEW.player_price,
        'draft',
        1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for draft allocations
CREATE TRIGGER trigger_create_player_ownership
    AFTER INSERT ON draft_allocations
    FOR EACH ROW
    EXECUTE FUNCTION create_player_ownership_from_draft();

-- Add function to update player ownership when transfers occur
CREATE OR REPLACE FUNCTION update_player_ownership_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate old ownership
    UPDATE player_ownership 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = NEW.from_user_id 
    AND player_id = NEW.player_id 
    AND is_active = true;
    
    -- Create new ownership
    INSERT INTO player_ownership (
        user_id,
        player_id,
        player_name,
        player_position,
        player_price,
        acquired_via,
        gameweek_acquired
    ) VALUES (
        NEW.to_user_id,
        NEW.player_id,
        NEW.player_name,
        (SELECT position FROM chelsea_players WHERE id = NEW.player_id),
        (SELECT price FROM chelsea_players WHERE id = NEW.player_id),
        NEW.transfer_type,
        NEW.gameweek
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for player transfers
CREATE TRIGGER trigger_update_player_ownership
    AFTER INSERT ON player_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_player_ownership_on_transfer();
