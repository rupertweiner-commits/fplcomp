-- FPL Live Tracker Database Schema
-- PostgreSQL database schema for production deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces draft.json users)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    profile_picture VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Draft data table (replaces draft.json main data)
CREATE TABLE draft_data (
    id SERIAL PRIMARY KEY,
    is_draft_complete BOOLEAN DEFAULT FALSE,
    current_draft_pick INTEGER DEFAULT 0,
    current_gameweek INTEGER DEFAULT 1,
    real_gameweek INTEGER,
    simulation_mode BOOLEAN DEFAULT FALSE,
    draft_order INTEGER[], -- Array of user IDs
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User teams table (replaces draft.json user teams)
CREATE TABLE user_teams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_captain BOOLEAN DEFAULT FALSE,
    is_benched BOOLEAN DEFAULT FALSE,
    drafted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, player_id)
);

-- Drafted players table (replaces draft.json draftedPlayers)
CREATE TABLE drafted_players (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    draft_position INTEGER NOT NULL,
    drafted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table (replaces draft.json transfers)
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    player_in_id INTEGER NOT NULL,
    player_out_id INTEGER,
    transfer_type VARCHAR(20) DEFAULT 'IN', -- 'IN', 'OUT', 'SWAP'
    gameweek INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chip usage table (replaces draft.json chipHistory)
CREATE TABLE chip_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chip_type VARCHAR(50) NOT NULL, -- 'wildcard', 'free_hit', 'bench_boost', 'triple_captain'
    gameweek INTEGER,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simulation history table (replaces draft.json simulationHistory)
CREATE TABLE simulation_history (
    id SERIAL PRIMARY KEY,
    gameweek INTEGER NOT NULL,
    simulation_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User activity table (enhanced version of SQLite table)
CREATE TABLE user_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (enhanced version of SQLite table)
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    session_id UUID UNIQUE NOT NULL,
    login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_timestamp TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Draft queue management
CREATE TABLE draft_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'completed', 'skipped'
    time_limit INTEGER DEFAULT 60000, -- milliseconds
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_admin ON users(is_admin);

CREATE INDEX idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX idx_user_teams_player_id ON user_teams(player_id);
CREATE INDEX idx_user_teams_active ON user_teams(is_active);

CREATE INDEX idx_drafted_players_player_id ON drafted_players(player_id);
CREATE INDEX idx_drafted_players_user_id ON drafted_players(user_id);
CREATE INDEX idx_drafted_players_position ON drafted_players(draft_position);

CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_gameweek ON transfers(gameweek);

CREATE INDEX idx_chip_usage_user_id ON chip_usage(user_id);
CREATE INDEX idx_chip_usage_gameweek ON chip_usage(gameweek);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_action_type ON user_activity(action_type);
CREATE INDEX idx_user_activity_timestamp ON user_activity(timestamp);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);

CREATE INDEX idx_draft_queue_user_id ON draft_queue(user_id);
CREATE INDEX idx_draft_queue_position ON draft_queue(queue_position);
CREATE INDEX idx_draft_queue_status ON draft_queue(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for multi-tenant security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- User teams policies
CREATE POLICY "Users can view own team" ON user_teams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own team" ON user_teams
    FOR ALL USING (auth.uid() = user_id);

-- User activity policies
CREATE POLICY "Users can view own activity" ON user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity" ON user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Push subscriptions policies
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Admin policies (admin users can see all data)
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Admins can view all activity" ON user_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Insert initial admin user (Rupert)
INSERT INTO users (username, is_admin, created_at) 
VALUES ('Rupert', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE SET is_admin = TRUE;

-- Insert other users
INSERT INTO users (username, is_admin, created_at) 
VALUES 
    ('Portia', FALSE, CURRENT_TIMESTAMP),
    ('Yasmin', FALSE, CURRENT_TIMESTAMP),
    ('Will', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Insert initial draft data
INSERT INTO draft_data (draft_order, last_updated)
VALUES (ARRAY[1, 2, 3, 4], CURRENT_TIMESTAMP);

