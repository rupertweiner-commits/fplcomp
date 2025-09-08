-- Fix user_activity table by adding missing columns
-- The table exists but is missing some columns

-- First, let's check the current structure of user_activity table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_activity' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns to existing user_activity table
ALTER TABLE public.user_activity 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON public.user_activity(action_type);

-- Enable RLS (if not already enabled)
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Admins can read all activity" ON public.user_activity;

-- Create RLS policies
CREATE POLICY "Users can read their own activity" ON public.user_activity
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON public.user_activity
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity" ON public.user_activity
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON public.user_activity TO authenticated;
GRANT SELECT ON public.user_activity TO anon;

-- Insert some sample activity data for testing
INSERT INTO public.user_activity (user_id, action_type, description, metadata)
SELECT 
    u.id,
    'login',
    'User logged in',
    '{"ip": "127.0.0.1", "user_agent": "test"}'::jsonb
FROM public.users u
WHERE u.is_active = true
LIMIT 5;

-- Test the table
SELECT COUNT(*) as activity_count FROM public.user_activity;
SELECT action_type, COUNT(*) as count FROM public.user_activity GROUP BY action_type;
