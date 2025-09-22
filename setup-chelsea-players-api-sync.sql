-- Drop existing table to start fresh
DROP TABLE IF EXISTS chelsea_players CASCADE;

-- Create chelsea_players table with FPL API structure
CREATE TABLE chelsea_players (
    id INTEGER PRIMARY KEY, -- FPL player ID
    web_name TEXT NOT NULL, -- Display name (e.g., "Sterling")
    first_name TEXT,
    second_name TEXT,
    element_type INTEGER, -- Position type (1=GK, 2=DEF, 3=MID, 4=FWD)
    position_name TEXT, -- Human readable position
    team INTEGER DEFAULT 7, -- Team ID (7 = Chelsea)
    team_name TEXT DEFAULT 'Chelsea',
    now_cost INTEGER, -- Price in FPL (multiply by 0.1 for actual price)
    total_points INTEGER DEFAULT 0,
    event_points INTEGER DEFAULT 0, -- Points from last gameweek
    form TEXT DEFAULT '0.0',
    selected_by_percent TEXT DEFAULT '0.0',
    minutes INTEGER DEFAULT 0,
    goals_scored INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    clean_sheets INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    own_goals INTEGER DEFAULT 0,
    penalties_saved INTEGER DEFAULT 0,
    penalties_missed INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    bps INTEGER DEFAULT 0, -- Bonus points system
    influence TEXT DEFAULT '0.0',
    creativity TEXT DEFAULT '0.0',
    threat TEXT DEFAULT '0.0',
    ict_index TEXT DEFAULT '0.0',
    starts INTEGER DEFAULT 0,
    expected_goals TEXT DEFAULT '0.0',
    expected_assists TEXT DEFAULT '0.0',
    expected_goal_involvements TEXT DEFAULT '0.0',
    expected_goals_conceded TEXT DEFAULT '0.0',
    influence_rank INTEGER,
    influence_rank_type INTEGER,
    creativity_rank INTEGER,
    creativity_rank_type INTEGER,
    threat_rank INTEGER,
    threat_rank_type INTEGER,
    ict_index_rank INTEGER,
    ict_index_rank_type INTEGER,
    corners_and_indirect_freekicks_order INTEGER,
    corners_and_indirect_freekicks_text TEXT,
    direct_freekicks_order INTEGER,
    direct_freekicks_text TEXT,
    penalties_order INTEGER,
    penalties_text TEXT,
    now_cost_rank INTEGER,
    now_cost_rank_type INTEGER,
    form_rank INTEGER,
    form_rank_type INTEGER,
    points_per_game_rank INTEGER,
    points_per_game_rank_type INTEGER,
    selected_rank INTEGER,
    selected_rank_type INTEGER,
    transfers_in INTEGER DEFAULT 0,
    transfers_out INTEGER DEFAULT 0,
    transfers_in_event INTEGER DEFAULT 0,
    transfers_out_event INTEGER DEFAULT 0,
    loans_in INTEGER DEFAULT 0,
    loans_out INTEGER DEFAULT 0,
    loaned_in INTEGER DEFAULT 0,
    loaned_out INTEGER DEFAULT 0,
    value_form TEXT DEFAULT '0.0',
    value_season TEXT DEFAULT '0.0',
    cost_change_start INTEGER DEFAULT 0,
    cost_change_event INTEGER DEFAULT 0,
    cost_change_start_fall INTEGER DEFAULT 0,
    cost_change_event_fall INTEGER DEFAULT 0,
    in_dreamteam BOOLEAN DEFAULT false,
    dreamteam_count INTEGER DEFAULT 0,
    points_per_game TEXT DEFAULT '0.0',
    ep_this TEXT DEFAULT '0.0',
    ep_next TEXT DEFAULT '0.0',
    special BOOLEAN DEFAULT false,
    in_squad BOOLEAN DEFAULT false,
    news TEXT DEFAULT '',
    news_added TIMESTAMP,
    chance_of_playing_this_round INTEGER,
    chance_of_playing_next_round INTEGER,
    status TEXT DEFAULT 'a', -- a = available, d = doubtful, i = injured, s = suspended, u = unavailable
    photo TEXT,
    code INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "chelsea_players_select_all" ON chelsea_players
    FOR SELECT USING (true);

CREATE POLICY "chelsea_players_insert_admin" ON chelsea_players
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "chelsea_players_update_admin" ON chelsea_players
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "chelsea_players_delete_admin" ON chelsea_players
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_chelsea_players_id ON chelsea_players(id);
CREATE INDEX idx_chelsea_players_position ON chelsea_players(element_type);
CREATE INDEX idx_chelsea_players_total_points ON chelsea_players(total_points DESC);
CREATE INDEX idx_chelsea_players_form ON chelsea_players(form DESC);
CREATE INDEX idx_chelsea_players_synced_at ON chelsea_players(synced_at DESC);















