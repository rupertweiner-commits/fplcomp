-- Fix missing user profile for rupertweiner@gmail.com
-- Run this in Supabase SQL Editor

-- Step 1: Check if rupertweiner@gmail.com exists in auth.users
SELECT 
  'rupertweiner@gmail.com in auth.users:' as info,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Check if rupertweiner@gmail.com exists in user_profiles
SELECT 
  'rupertweiner@gmail.com in user_profiles:' as info,
  id,
  email,
  username,
  is_admin,
  is_active
FROM public.user_profiles 
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: If the user exists in auth.users but not in user_profiles, create the profile
INSERT INTO public.user_profiles (
  id,
  email,
  username,
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
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  true,
  CASE WHEN au.email = 'rupertweiner@gmail.com' THEN true ELSE false END,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'rupertweiner@gmail.com'
AND au.id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  updated_at = NOW();

-- Step 4: Verify the fix
SELECT 
  'After fix - rupertweiner@gmail.com in user_profiles:' as info,
  id,
  email,
  username,
  is_admin,
  is_active
FROM public.user_profiles 
WHERE email = 'rupertweiner@gmail.com';
