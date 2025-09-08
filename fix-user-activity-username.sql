-- Fix user_activity table by providing username values
-- The table has a NOT NULL constraint on username column

-- First, let's check the current structure of user_activity table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_activity' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Clear any existing test data that might have null usernames
DELETE FROM public.user_activity WHERE username IS NULL;

-- Insert sample activity data with proper username values
INSERT INTO public.user_activity (user_id, username, action_type, description, metadata)
SELECT 
    u.id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown User') as username,
    'login',
    'User logged in',
    '{"ip": "127.0.0.1", "user_agent": "test"}'::jsonb
FROM public.users u
WHERE u.is_active = true
LIMIT 5;

-- Test the table
SELECT COUNT(*) as activity_count FROM public.user_activity;
SELECT username, action_type, COUNT(*) as count 
FROM public.user_activity 
GROUP BY username, action_type;
