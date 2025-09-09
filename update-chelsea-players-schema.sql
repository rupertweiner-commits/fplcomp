-- Update chelsea_players table to match FPL API sync requirements
-- Run this in Supabase SQL Editor

-- First, let's see what columns currently exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'chelsea_players' 
-- ORDER BY ordinal_position;

-- Add missing columns to chelsea_players table
ALTER TABLE chelsea_players 
-- Basic info columns
ADD COLUMN IF NOT EXISTS web_name TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS second_name TEXT,
ADD COLUMN IF NOT EXISTS element_type INTEGER,
ADD COLUMN IF NOT EXISTS position_name TEXT,
ADD COLUMN IF NOT EXISTS team INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS team_name TEXT DEFAULT 'Chelsea',

-- Pricing
ADD COLUMN IF NOT EXISTS now_cost INTEGER,

-- Scoring statistics
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS form TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS selected_by_percent TEXT DEFAULT '0.0',

-- Performance stats
ADD COLUMN IF NOT EXISTS minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_scored INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS own_goals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalties_saved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalties_missed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bps INTEGER DEFAULT 0,

-- Advanced stats
ADD COLUMN IF NOT EXISTS influence TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS creativity TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS threat TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS ict_index TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS starts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_goals TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS expected_assists TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS expected_goal_involvements TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS expected_goals_conceded TEXT DEFAULT '0.0',

-- Rankings
ADD COLUMN IF NOT EXISTS influence_rank INTEGER,
ADD COLUMN IF NOT EXISTS influence_rank_type INTEGER,
ADD COLUMN IF NOT EXISTS creativity_rank INTEGER,
ADD COLUMN IF NOT EXISTS creativity_rank_type INTEGER,
ADD COLUMN IF NOT EXISTS threat_rank INTEGER,
ADD COLUMN IF NOT EXISTS threat_rank_type INTEGER,
ADD COLUMN IF NOT EXISTS ict_index_rank INTEGER,
ADD COLUMN IF NOT EXISTS ict_index_rank_type INTEGER,

-- Set pieces
ADD COLUMN IF NOT EXISTS corners_and_indirect_freekicks_order INTEGER,
ADD COLUMN IF NOT EXISTS corners_and_indirect_freekicks_text TEXT,
ADD COLUMN IF NOT EXISTS direct_freekicks_order INTEGER,
ADD COLUMN IF NOT EXISTS direct_freekicks_text TEXT,
ADD COLUMN IF NOT EXISTS penalties_order INTEGER,
ADD COLUMN IF NOT EXISTS penalties_text TEXT,

-- Cost rankings
ADD COLUMN IF NOT EXISTS now_cost_rank INTEGER,
ADD COLUMN IF NOT EXISTS now_cost_rank_type INTEGER,
ADD COLUMN IF NOT EXISTS form_rank INTEGER,
ADD COLUMN IF NOT EXISTS form_rank_type INTEGER,
ADD COLUMN IF NOT EXISTS points_per_game_rank INTEGER,
ADD COLUMN IF NOT EXISTS points_per_game_rank_type INTEGER,
ADD COLUMN IF NOT EXISTS selected_rank INTEGER,
ADD COLUMN IF NOT EXISTS selected_rank_type INTEGER,

-- Transfers
ADD COLUMN IF NOT EXISTS transfers_in INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfers_out INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfers_in_event INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfers_out_event INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loans_in INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loans_out INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loaned_in INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loaned_out INTEGER DEFAULT 0,

-- Value stats
ADD COLUMN IF NOT EXISTS value_form TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS value_season TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS cost_change_start INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_change_event INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_change_start_fall INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_change_event_fall INTEGER DEFAULT 0,

-- Dream team
ADD COLUMN IF NOT EXISTS in_dreamteam BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dreamteam_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_per_game TEXT DEFAULT '0.0',

-- Expected points
ADD COLUMN IF NOT EXISTS ep_this TEXT DEFAULT '0.0',
ADD COLUMN IF NOT EXISTS ep_next TEXT DEFAULT '0.0',

-- Status
ADD COLUMN IF NOT EXISTS special BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS in_squad BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS news TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS news_added TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS chance_of_playing_this_round INTEGER,
ADD COLUMN IF NOT EXISTS chance_of_playing_next_round INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'a',
ADD COLUMN IF NOT EXISTS photo TEXT,
ADD COLUMN IF NOT EXISTS code TEXT,

-- Timestamps
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the primary key to use FPL ID instead of SERIAL
-- First, we need to handle existing data
-- This is a complex operation, so we'll create a new table and migrate

-- Create new table with correct structure
CREATE TABLE IF NOT EXISTS chelsea_players_new (
    id INTEGER PRIMARY KEY, -- FPL player ID
    web_name TEXT NOT NULL,
    first_name TEXT,
    second_name TEXT,
    element_type INTEGER,
    position_name TEXT,
    team INTEGER DEFAULT 7,
    team_name TEXT DEFAULT 'Chelsea',
    now_cost INTEGER,
    total_points INTEGER DEFAULT 0,
    event_points INTEGER DEFAULT 0,
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
    bps INTEGER DEFAULT 0,
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
    news_added TIMESTAMP WITH TIME ZONE,
    chance_of_playing_this_round INTEGER,
    chance_of_playing_next_round INTEGER,
    status TEXT DEFAULT 'a',
    photo TEXT,
    code TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy existing data to new table (if any exists)
INSERT INTO chelsea_players_new (
    id, web_name, first_name, second_name, element_type, position_name, 
    team, team_name, now_cost, total_points, event_points, form, 
    selected_by_percent, minutes, goals_scored, assists, clean_sheets,
    goals_conceded, own_goals, penalties_saved, penalties_missed,
    yellow_cards, red_cards, saves, bonus, bps, influence, creativity,
    threat, ict_index, starts, expected_goals, expected_assists,
    expected_goal_involvements, expected_goals_conceded, influence_rank,
    influence_rank_type, creativity_rank, creativity_rank_type, threat_rank,
    threat_rank_type, ict_index_rank, ict_index_rank_type,
    corners_and_indirect_freekicks_order, corners_and_indirect_freekicks_text,
    direct_freekicks_order, direct_freekicks_text, penalties_order,
    penalties_text, now_cost_rank, now_cost_rank_type, form_rank,
    form_rank_type, points_per_game_rank, points_per_game_rank_type,
    selected_rank, selected_rank_type, transfers_in, transfers_out,
    transfers_in_event, transfers_out_event, loans_in, loans_out,
    loaned_in, loaned_out, value_form, value_season, cost_change_start,
    cost_change_event, cost_change_start_fall, cost_change_event_fall,
    in_dreamteam, dreamteam_count, points_per_game, ep_this, ep_next,
    special, in_squad, news, news_added, chance_of_playing_this_round,
    chance_of_playing_next_round, status, photo, code, last_updated,
    synced_at, is_available, created_at, updated_at
)
SELECT 
    COALESCE(id, 0) as id,
    COALESCE(web_name, name, 'Unknown') as web_name,
    first_name,
    second_name,
    element_type,
    COALESCE(position_name, position) as position_name,
    COALESCE(team, team_id, 7) as team,
    COALESCE(team_name, 'Chelsea') as team_name,
    COALESCE(now_cost, (price * 10)::INTEGER) as now_cost,
    COALESCE(total_points, 0) as total_points,
    COALESCE(event_points, 0) as event_points,
    COALESCE(form, '0.0') as form,
    COALESCE(selected_by_percent, '0.0') as selected_by_percent,
    COALESCE(minutes, 0) as minutes,
    COALESCE(goals_scored, 0) as goals_scored,
    COALESCE(assists, 0) as assists,
    COALESCE(clean_sheets, 0) as clean_sheets,
    COALESCE(goals_conceded, 0) as goals_conceded,
    COALESCE(own_goals, 0) as own_goals,
    COALESCE(penalties_saved, 0) as penalties_saved,
    COALESCE(penalties_missed, 0) as penalties_missed,
    COALESCE(yellow_cards, 0) as yellow_cards,
    COALESCE(red_cards, 0) as red_cards,
    COALESCE(saves, 0) as saves,
    COALESCE(bonus, 0) as bonus,
    COALESCE(bps, 0) as bps,
    COALESCE(influence, '0.0') as influence,
    COALESCE(creativity, '0.0') as creativity,
    COALESCE(threat, '0.0') as threat,
    COALESCE(ict_index, '0.0') as ict_index,
    COALESCE(starts, 0) as starts,
    COALESCE(expected_goals, '0.0') as expected_goals,
    COALESCE(expected_assists, '0.0') as expected_assists,
    COALESCE(expected_goal_involvements, '0.0') as expected_goal_involvements,
    COALESCE(expected_goals_conceded, '0.0') as expected_goals_conceded,
    influence_rank, influence_rank_type, creativity_rank, creativity_rank_type,
    threat_rank, threat_rank_type, ict_index_rank, ict_index_rank_type,
    corners_and_indirect_freekicks_order, corners_and_indirect_freekicks_text,
    direct_freekicks_order, direct_freekicks_text, penalties_order, penalties_text,
    now_cost_rank, now_cost_rank_type, form_rank, form_rank_type,
    points_per_game_rank, points_per_game_rank_type, selected_rank, selected_rank_type,
    COALESCE(transfers_in, 0) as transfers_in, COALESCE(transfers_out, 0) as transfers_out,
    COALESCE(transfers_in_event, 0) as transfers_in_event, COALESCE(transfers_out_event, 0) as transfers_out_event,
    COALESCE(loans_in, 0) as loans_in, COALESCE(loans_out, 0) as loans_out,
    COALESCE(loaned_in, 0) as loaned_in, COALESCE(loaned_out, 0) as loaned_out,
    COALESCE(value_form, '0.0') as value_form, COALESCE(value_season, '0.0') as value_season,
    COALESCE(cost_change_start, 0) as cost_change_start, COALESCE(cost_change_event, 0) as cost_change_event,
    COALESCE(cost_change_start_fall, 0) as cost_change_start_fall, COALESCE(cost_change_event_fall, 0) as cost_change_event_fall,
    COALESCE(in_dreamteam, false) as in_dreamteam, COALESCE(dreamteam_count, 0) as dreamteam_count,
    COALESCE(points_per_game, '0.0') as points_per_game, COALESCE(ep_this, '0.0') as ep_this, COALESCE(ep_next, '0.0') as ep_next,
    COALESCE(special, false) as special, COALESCE(in_squad, false) as in_squad,
    COALESCE(news, '') as news, news_added, chance_of_playing_this_round, chance_of_playing_next_round,
    COALESCE(status, 'a') as status, photo, code,
    COALESCE(last_updated, NOW()) as last_updated, COALESCE(synced_at, NOW()) as synced_at,
    COALESCE(is_available, true) as is_available,
    COALESCE(created_at, NOW()) as created_at, COALESCE(updated_at, NOW()) as updated_at
FROM chelsea_players
ON CONFLICT (id) DO NOTHING;

-- Drop old table and rename new one
DROP TABLE IF EXISTS chelsea_players CASCADE;
ALTER TABLE chelsea_players_new RENAME TO chelsea_players;

-- Recreate RLS policies
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Chelsea players are viewable by everyone" ON chelsea_players;
DROP POLICY IF EXISTS "Chelsea players are manageable by admins" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_service_role_all" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_admin_all" ON chelsea_players;

-- Create new policies
CREATE POLICY "chelsea_players_public_read" ON chelsea_players
    FOR SELECT USING (true);

CREATE POLICY "chelsea_players_service_role_all" ON chelsea_players
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "chelsea_players_admin_all" ON chelsea_players
    FOR ALL USING (auth.jwt() ->> 'email' = 'rupertweiner@gmail.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chelsea_players_team ON chelsea_players(team);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_position ON chelsea_players(element_type);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_total_points ON chelsea_players(total_points);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_form ON chelsea_players(form);
CREATE INDEX IF NOT EXISTS idx_chelsea_players_available ON chelsea_players(is_available);

SELECT 'Chelsea players schema updated successfully!' as status;
