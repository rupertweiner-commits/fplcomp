-- Create chelsea_players table with sample data
CREATE TABLE IF NOT EXISTS chelsea_players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    team TEXT DEFAULT 'Chelsea',
    price DECIMAL(3,1) DEFAULT 8.0,
    total_points INTEGER DEFAULT 0,
    form DECIMAL(3,1) DEFAULT 0.0,
    selected_by_percent DECIMAL(4,1) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample Chelsea players if table is empty
INSERT INTO chelsea_players (name, position, team, price, total_points, form, selected_by_percent)
SELECT * FROM (VALUES
    ('Robert Sánchez', 'Goalkeeper', 'Chelsea', 4.5, 45, 3.2, 8.5),
    ('Đorđe Petrović', 'Goalkeeper', 'Chelsea', 4.0, 12, 2.1, 2.1),
    ('Thiago Silva', 'Defender', 'Chelsea', 5.5, 78, 4.1, 15.2),
    ('Reece James', 'Defender', 'Chelsea', 6.0, 42, 2.8, 12.3),
    ('Ben Chilwell', 'Defender', 'Chelsea', 5.5, 35, 2.5, 9.8),
    ('Levi Colwill', 'Defender', 'Chelsea', 4.5, 56, 3.8, 18.7),
    ('Malo Gusto', 'Defender', 'Chelsea', 4.5, 48, 3.5, 14.2),
    ('Axel Disasi', 'Defender', 'Chelsea', 4.5, 52, 3.6, 11.9),
    ('Enzo Fernández', 'Midfielder', 'Chelsea', 8.0, 89, 4.5, 22.1),
    ('Moisés Caicedo', 'Midfielder', 'Chelsea', 5.0, 67, 4.0, 16.8),
    ('Conor Gallagher', 'Midfielder', 'Chelsea', 5.5, 71, 4.2, 19.5),
    ('Raheem Sterling', 'Midfielder', 'Chelsea', 7.0, 82, 4.3, 25.6),
    ('Christopher Nkunku', 'Midfielder', 'Chelsea', 6.5, 34, 2.9, 8.9),
    ('Cole Palmer', 'Midfielder', 'Chelsea', 5.5, 95, 5.2, 35.8),
    ('Mykhailo Mudryk', 'Midfielder', 'Chelsea', 6.0, 45, 3.1, 12.4),
    ('Nicolas Jackson', 'Forward', 'Chelsea', 7.5, 96, 4.8, 28.9),
    ('Armando Broja', 'Forward', 'Chelsea', 5.5, 23, 2.3, 4.7),
    ('David Datro Fofana', 'Forward', 'Chelsea', 4.5, 8, 1.5, 1.2),
    ('Ian Maatsen', 'Defender', 'Chelsea', 4.0, 28, 2.4, 6.3),
    ('Noni Madueke', 'Midfielder', 'Chelsea', 5.0, 38, 3.0, 9.1)
) AS new_players(name, position, team, price, total_points, form, selected_by_percent)
WHERE NOT EXISTS (SELECT 1 FROM chelsea_players LIMIT 1);

-- Enable RLS
ALTER TABLE chelsea_players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "chelsea_players_select_all" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_insert_admin" ON chelsea_players;
DROP POLICY IF EXISTS "chelsea_players_update_admin" ON chelsea_players;

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












