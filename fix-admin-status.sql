-- Fix admin status for rupertweiner@gmail.com
-- Run this in your Supabase SQL Editor

-- First, check if the user exists in both tables
SELECT 'Checking auth.users...' as step;
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at
FROM auth.users au
WHERE au.email = 'rupertweiner@gmail.com';

SELECT 'Checking public.users...' as step;
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.created_at
FROM users u
WHERE u.email = 'rupertweiner@gmail.com';

-- If the user exists in auth.users but not in public.users, create them
INSERT INTO users (id, username, email, is_admin, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
  au.email,
  CASE WHEN au.email = 'rupertweiner@gmail.com' THEN true ELSE false END,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'rupertweiner@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = au.id
);

-- Update existing user to be admin if they're rupertweiner@gmail.com
UPDATE users 
SET 
  is_admin = true, 
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com' 
AND is_admin = false;

-- Verify the final state
SELECT 'Final verification...' as step;
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.email = 'rupertweiner@gmail.com';

SELECT 'Admin status fix complete!' as status;
