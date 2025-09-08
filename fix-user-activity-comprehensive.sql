-- Comprehensive fix for user_activity table
-- Based on the actual database schema provided

-- First, let's check what users exist in different tables
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'public.user_profiles' as table_name, COUNT(*) as count FROM public.user_profiles;

-- Check what users exist in user_profiles (this is what user_activity references)
SELECT id, email, username FROM public.user_profiles LIMIT 5;

-- Check what users exist in public.users
SELECT id, email, first_name, last_name FROM public.users LIMIT 5;

-- Clear any existing test data in user_activity
DELETE FROM public.user_activity;

-- Insert sample activity data using users from user_profiles table
-- (since that's what the foreign key constraint references)
INSERT INTO public.user_activity (user_id, username, action_type, action_details)
SELECT 
    up.id,
    COALESCE(up.username, up.first_name || ' ' || up.last_name, up.email, 'Unknown User') as username,
    'login' as action_type,
    '{"ip": "127.0.0.1", "user_agent": "test", "login_method": "email"}'::jsonb as action_details
FROM public.user_profiles up
WHERE up.id IS NOT NULL
LIMIT 5;

-- If no user_profiles exist, we need to create some from public.users
-- This will only run if the above insert didn't work
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_activity LIMIT 1) THEN
        -- Insert users from public.users into user_profiles if they don't exist
        INSERT INTO public.user_profiles (id, username, email, first_name, last_name, is_admin)
        SELECT 
            u.id,
            COALESCE(u.username, u.first_name || ' ' || u.last_name, u.email) as username,
            u.email,
            u.first_name,
            u.last_name,
            COALESCE(u.is_admin, false) as is_admin
        FROM public.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
        )
        LIMIT 5;
        
        -- Now insert activity data using the newly created user_profiles
        INSERT INTO public.user_activity (user_id, username, action_type, action_details)
        SELECT 
            up.id,
            COALESCE(up.username, up.first_name || ' ' || up.last_name, up.email, 'Unknown User') as username,
            'login' as action_type,
            '{"ip": "127.0.0.1", "user_agent": "test", "login_method": "email"}'::jsonb as action_details
        FROM public.user_profiles up
        WHERE up.id IS NOT NULL
        LIMIT 5;
    END IF;
END $$;

-- Test the table
SELECT COUNT(*) as activity_count FROM public.user_activity;
SELECT username, action_type, COUNT(*) as count 
FROM public.user_activity 
GROUP BY username, action_type;

-- Also test that the API can now fetch this data
SELECT 
    ua.*,
    up.email as user_email
FROM public.user_activity ua
LEFT JOIN public.user_profiles up ON ua.user_id = up.id
ORDER BY ua.created_at DESC
LIMIT 5;
