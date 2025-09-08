-- Create user_activity table if it doesn't exist
-- This table is needed for the UserActivity component to work

-- Check if user_activity table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_activity' AND table_schema = 'public';

-- Create user_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON public.user_activity(action_type);

-- Enable RLS
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
