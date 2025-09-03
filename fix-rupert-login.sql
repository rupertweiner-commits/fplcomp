-- Fix Login Issue for rupertweiner@gmail.com
-- Run this in Supabase SQL Editor to resolve login problems

-- Step 1: Check if user exists in auth.users
SELECT 
  'Auth users check:' as info,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Check if user exists in public.users
SELECT 
  'Public users check:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at
FROM users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: Check for ID mismatch between auth and public tables
SELECT 
  'ID mismatch check:' as info,
  au.id as auth_id,
  au.email as auth_email,
  pu.id as public_id,
  pu.email as public_email,
  CASE 
    WHEN au.id::text = pu.id::text THEN 'MATCH'
    ELSE 'MISMATCH'
  END as id_status
FROM auth.users au
FULL OUTER JOIN users pu ON au.email = pu.email
WHERE au.email = 'rupertweiner@gmail.com' OR pu.email = 'rupertweiner@gmail.com';

-- Step 4: Create/Update user profile with correct auth ID
DO $$
DECLARE
  auth_user_id UUID;
  existing_profile_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id 
  FROM auth.users 
  WHERE email = 'rupertweiner@gmail.com';
  
  IF auth_user_id IS NOT NULL THEN
    -- Check if profile exists with different ID
    SELECT id INTO existing_profile_id
    FROM users 
    WHERE email = 'rupertweiner@gmail.com';
    
    IF existing_profile_id IS NOT NULL AND existing_profile_id != auth_user_id THEN
      -- Delete the old profile with wrong ID
      DELETE FROM users WHERE id = existing_profile_id;
      RAISE NOTICE 'Deleted old profile with ID: %', existing_profile_id;
    END IF;
    
    -- Insert/Update the user profile with correct auth ID
    INSERT INTO users (id, email, first_name, last_name, is_admin, is_active, created_at)
    VALUES (
      auth_user_id,
      'rupertweiner@gmail.com',
      'Rupert',
      'Weiner',
      true,  -- Admin user
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
    
    RAISE NOTICE 'User profile created/updated for rupertweiner@gmail.com with auth ID: %', auth_user_id;
  ELSE
    RAISE NOTICE 'No auth user found for rupertweiner@gmail.com';
  END IF;
END $$;

-- Step 5: Verify the fix
SELECT 
  'After fix - Auth user:' as info,
  id,
  email,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'rupertweiner@gmail.com';

SELECT 
  'After fix - Public user:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active
FROM users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 6: Test RLS policies
-- This should return the user profile if RLS is working
SELECT 
  'RLS Test:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin
FROM users
WHERE email = 'rupertweiner@gmail.com';

-- Step 7: Check if email is confirmed in auth
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'rupertweiner@gmail.com' 
AND email_confirmed_at IS NULL;

-- Step 8: Final verification
SELECT 
  'Final verification:' as info,
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  pu.id as profile_id,
  pu.email as profile_email,
  pu.is_admin,
  pu.is_active
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
WHERE au.email = 'rupertweiner@gmail.com';
