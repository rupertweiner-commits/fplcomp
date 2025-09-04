-- Sync existing users from auth.users to public.users
-- This is a one-time operation to fix existing users

-- First, let's see what users exist in auth.users but not in public.users
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at;

-- Insert missing users into public.users
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    is_admin,
    is_active,
    created_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Verify the sync worked
SELECT 
    'auth.users count' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'public.users count' as table_name,
    COUNT(*) as count
FROM public.users;
