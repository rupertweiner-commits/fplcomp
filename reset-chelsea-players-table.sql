-- Complete reset script for chelsea_players table
-- This drops the existing table and recreates it with the correct schema

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS public.chelsea_players CASCADE;

-- Create chelsea_players table with correct schema
CREATE TABLE public.chelsea_players (
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
(10, 'Robert Sánchez', 'GKP', 7, 4.5, 89, 6.4, true, NULL, NULL, NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chelsea_players_drafted_by ON public.chelsea_players(drafted_by);

-- Enable RLS
ALTER TABLE public.chelsea_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all Chelsea players" ON public.chelsea_players
    FOR SELECT USING (true);

CREATE POLICY "Admins can update Chelsea players" ON public.chelsea_players
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chelsea_players' 
ORDER BY ordinal_position;
