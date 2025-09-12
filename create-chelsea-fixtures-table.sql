-- Create chelsea_fixtures table for storing Chelsea's fixture data from FPL API
CREATE TABLE IF NOT EXISTS chelsea_fixtures (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE NOT NULL,
  gameweek INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT false,
  opponent_id INTEGER NOT NULL,
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  finished BOOLEAN NOT NULL DEFAULT false,
  started BOOLEAN NOT NULL DEFAULT false,
  home_score INTEGER,
  away_score INTEGER,
  home_difficulty INTEGER,
  away_difficulty INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chelsea_fixtures_gameweek ON chelsea_fixtures(gameweek);
CREATE INDEX IF NOT EXISTS idx_chelsea_fixtures_kickoff_time ON chelsea_fixtures(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_chelsea_fixtures_finished ON chelsea_fixtures(finished);

-- Enable RLS
ALTER TABLE chelsea_fixtures ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Chelsea fixtures are viewable by everyone" ON chelsea_fixtures
  FOR SELECT USING (true);

-- Create policy for service role to manage fixtures
CREATE POLICY "Service role can manage chelsea fixtures" ON chelsea_fixtures
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chelsea_fixtures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chelsea_fixtures_updated_at
  BEFORE UPDATE ON chelsea_fixtures
  FOR EACH ROW
  EXECUTE FUNCTION update_chelsea_fixtures_updated_at();
