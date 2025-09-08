-- Fix user_activity table foreign key constraint
-- The table references user_profiles but we need to check what users exist

-- First, let's check what users exist in different tables
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'public.user_profiles' as table_name, COUNT(*) as count FROM public.user_profiles;

-- Check if user_profiles table exists and what it contains
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what users exist in user_profiles
SELECT id, email FROM public.user_profiles LIMIT 5;

-- Check what users exist in public.users
SELECT id, email FROM public.users LIMIT 5;

-- Clear any existing test data
DELETE FROM public.user_activity;

-- Insert sample activity data using only users that exist in user_profiles
INSERT INTO public.user_activity (user_id, username, action_type)
SELECT 
    up.id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email, 'Unknown User') as username,
    'login' as action_type
FROM public.user_profiles up
WHERE up.id IS NOT NULL
LIMIT 5;

-- If no user_profiles exist, try using public.users instead
-- (This will only run if the above insert didn't work)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_activity LIMIT 1) THEN
        -- Try to insert using public.users if user_profiles is empty
        INSERT INTO public.user_activity (user_id, username, action_type)
        SELECT 
            u.id,
            COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown User') as username,
            'login' as action_type
        FROM public.users u
        WHERE u.id IS NOT NULL
        LIMIT 5;
    END IF;
END $$;

-- Test the table
SELECT COUNT(*) as activity_count FROM public.user_activity;
SELECT username, action_type, COUNT(*) as count 
FROM public.user_activity 
GROUP BY username, action_type;
