-- Debug profile completion issue
-- Run this in your Supabase SQL Editor

-- Step 1: Check if your user exists in both tables
SELECT 'Checking auth.users:' as step;
SELECT id, email, created_at FROM auth.users WHERE email = 'rupertweiner@gmail.com';

SELECT 'Checking public.users:' as step;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at,
  updated_at
FROM public.users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Check what the app is actually fetching
SELECT 'Profile completion check:' as step;
SELECT 
  id,
  email,
  first_name,
  last_name,
  CASE 
    WHEN first_name IS NOT NULL AND first_name != '' AND 
         last_name IS NOT NULL AND last_name != '' AND
         email IS NOT NULL AND email != ''
    THEN 'COMPLETE'
    ELSE 'INCOMPLETE'
  END as profile_status
FROM public.users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: Force complete the profile if needed
UPDATE public.users 
SET 
  first_name = 'Rupert',
  last_name = 'Weiner',
  username = 'rupertweiner',
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com';

-- Step 4: Verify the update
SELECT 'After update:' as step;
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

-- Step 5: Test RLS access
SELECT 'Testing RLS access:' as step;
SELECT COUNT(*) as can_read_users FROM public.users;
