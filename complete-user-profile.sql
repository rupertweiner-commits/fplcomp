-- Complete your user profile to avoid profile completion screen
-- Run this in your Supabase SQL Editor

-- Step 1: Check your current profile
SELECT 'Your current profile:' as step;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Complete your profile with required fields
UPDATE public.users 
SET 
  first_name = 'Rupert',
  last_name = 'Weiner',
  username = 'rupertweiner',
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: Verify the update
SELECT 'Your completed profile:' as step;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active,
  updated_at
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

SELECT 'Profile completed! You should now see the main app.' as status;
