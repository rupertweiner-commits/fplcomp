-- Fix user_activity table by working with existing columns
-- Let's first see what columns actually exist

-- Check the current structure of user_activity table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_activity' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Clear any existing test data that might have null usernames
DELETE FROM public.user_activity WHERE username IS NULL;

-- Insert sample activity data using only the columns that exist
-- Based on the error, we know these columns exist: user_id, username, action_type
INSERT INTO public.user_activity (user_id, username, action_type)
SELECT 
    u.id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown User') as username,
    'login' as action_type
FROM public.users u
WHERE u.is_active = true
LIMIT 5;

-- Test the table
SELECT COUNT(*) as activity_count FROM public.user_activity;
SELECT username, action_type, COUNT(*) as count 
FROM public.user_activity 
GROUP BY username, action_type;
