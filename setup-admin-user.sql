-- Complete admin setup for rupertweiner@gmail.com
-- Run this in your Supabase SQL Editor

-- Step 1: Check if user exists in auth.users
SELECT 'Checking auth.users...' as step;
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Check if user exists in users table
SELECT 'Checking users table...' as step;
SELECT 
  id,
  username,
  email,
  is_admin,
  is_active,
  created_at
FROM users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: If user doesn't exist in users table, create them
-- (This should only run if the user exists in auth.users but not in users)
INSERT INTO users (id, username, email, is_admin, is_active, created_at, updated_at)
SELECT 
  au.id,
  'rupert',
  au.email,
  true,  -- Set as admin
  true,  -- Set as active
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'rupertweiner@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM users u WHERE u.email = 'rupertweiner@gmail.com'
);

-- Step 4: Update existing user to admin if they exist
UPDATE users 
SET 
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com';

-- Step 5: Verify final admin status
SELECT 'Final verification...' as step;
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.is_active,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.email = 'rupertweiner@gmail.com';

-- Step 6: Show all admin users
SELECT 'All admin users:' as step;
SELECT 
  username,
  email,
  is_admin,
  created_at
FROM users 
WHERE is_admin = true
ORDER BY created_at;

SELECT 'Admin setup complete!' as status;
