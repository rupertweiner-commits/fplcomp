-- Fix User Profile Mismatch Issue
-- Run this in Supabase SQL Editor to resolve "Login successful but profile not found" error

-- Step 1: Check what's in the users table
SELECT 
  id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at
FROM users
ORDER BY created_at;

-- Step 2: Check what's in auth.users (Supabase Auth table)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at;

-- Step 3: Find the mismatch - users in auth.users but not in public.users
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as profile_id,
  pu.email as profile_email
FROM auth.users au
LEFT JOIN users pu ON au.id::text = pu.id::text
WHERE pu.id IS NULL;

-- Step 4: Create missing user profile for rupertweiner@gmail.com
-- First, let's get the auth user ID for rupertweiner@gmail.com
DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id 
  FROM auth.users 
  WHERE email = 'rupertweiner@gmail.com';
  
  IF auth_user_id IS NOT NULL THEN
    -- Insert the user profile if it doesn't exist
    INSERT INTO users (id, email, first_name, last_name, is_admin, is_active, created_at)
    VALUES (
      auth_user_id,
      'rupertweiner@gmail.com',
      'Rupert',
      'Weiner',
      true,  -- Make this user an admin
      true,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      is_admin = EXCLUDED.is_admin,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
    
    RAISE NOTICE 'User profile created/updated for rupertweiner@gmail.com with ID: %', auth_user_id;
  ELSE
    RAISE NOTICE 'No auth user found for rupertweiner@gmail.com';
  END IF;
END $$;

-- Step 5: Verify the fix
SELECT 
  'After fix - Users table:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active
FROM users
WHERE email = 'rupertweiner@gmail.com';

-- Step 6: Test the RLS policies
-- This should return the user profile if RLS is working correctly
SELECT 
  'RLS Test:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin
FROM users
WHERE email = 'rupertweiner@gmail.com';

-- Step 7: Check if there are any other missing profiles
SELECT 
  'Missing profiles:' as info,
  au.email,
  au.id as auth_id
FROM auth.users au
LEFT JOIN users pu ON au.id::text = pu.id::text
WHERE pu.id IS NULL;
