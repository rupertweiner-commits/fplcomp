-- Manual sync script for existing users
-- Run this in Supabase SQL Editor

-- First, let's see what users exist in auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Now let's see what users exist in public.users
SELECT id, email, created_at FROM public.users ORDER BY created_at;

-- Insert missing users from auth.users into public.users
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  is_active,
  is_admin,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  true,
  false,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Check the results
SELECT 
  'auth.users' as table_name,
  COUNT(*) as user_count
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name,
  COUNT(*) as user_count
FROM public.users;

-- Show all users in both tables
SELECT 
  au.id,
  au.email as auth_email,
  pu.email as public_email,
  CASE 
    WHEN pu.id IS NULL THEN 'MISSING_IN_PUBLIC'
    WHEN au.email != pu.email THEN 'EMAIL_MISMATCH'
    ELSE 'SYNCED'
  END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;
