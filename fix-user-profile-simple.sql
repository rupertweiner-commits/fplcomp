-- Simple fix for user profile after consolidation
-- Run this in Supabase SQL Editor

-- Step 1: Check if user exists in user_profiles
SELECT id, email, first_name, last_name, is_admin
FROM user_profiles 
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: If no results above, the user needs to be created
-- You'll need to get the UUID from Supabase Auth Dashboard first:
-- 1. Go to Authentication > Users
-- 2. Find rupertweiner@gmail.com (or create it if it doesn't exist)
-- 3. Copy the User UID

-- Step 3: Replace 'YOUR_UUID_HERE' with the actual UUID and run:
/*
INSERT INTO user_profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  is_admin, 
  created_at, 
  updated_at
) VALUES (
  'YOUR_UUID_HERE', -- Replace with actual UUID from auth.users
  'rupertweiner@gmail.com',
  'Rupert',
  'Weiner',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  updated_at = NOW();
*/

-- Step 4: Verify the user was created
SELECT id, email, first_name, last_name, is_admin
FROM user_profiles 
WHERE email = 'rupertweiner@gmail.com';
