-- Simple admin setup for rupertweiner@gmail.com
-- Run this in your Supabase SQL Editor

-- Step 1: Check current status
SELECT 'Current user status:' as step;
SELECT 
  id,
  username,
  email,
  is_admin,
  is_active,
  created_at
FROM users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Update user to admin (this will work whether user exists or not)
-- If user doesn't exist, this will do nothing (no error)
UPDATE users 
SET 
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: If the user still doesn't exist, we need to create them manually
-- First, get the auth user ID
SELECT 'Auth user ID:' as step;
SELECT id as auth_user_id
FROM auth.users 
WHERE email = 'rupertweiner@gmail.com';

-- Step 4: Manual insert (replace 'USER_ID_HERE' with the actual ID from step 3)
-- INSERT INTO users (id, username, email, is_admin, is_active, created_at, updated_at)
-- VALUES ('USER_ID_HERE', 'rupert', 'rupertweiner@gmail.com', true, true, NOW(), NOW());

-- Step 5: Verify final status
SELECT 'Final admin status:' as step;
SELECT 
  id,
  username,
  email,
  is_admin,
  is_active,
  updated_at
FROM users 
WHERE email = 'rupertweiner@gmail.com';

SELECT 'Admin setup complete!' as status;
