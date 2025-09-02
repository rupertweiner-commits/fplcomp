-- Verify and set admin status for rupertweiner@gmail.com
-- Run this in your Supabase SQL Editor

-- First, check if the user exists and their current admin status
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.created_at
FROM users u
WHERE u.email = 'rupertweiner@gmail.com';

-- If the user exists but is not admin, update them to admin
UPDATE users 
SET is_admin = true, updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com' 
AND is_admin = false;

-- Verify the update
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_admin,
  u.updated_at
FROM users u
WHERE u.email = 'rupertweiner@gmail.com';

-- Also check in auth.users to make sure the user exists there
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at
FROM auth.users au
WHERE au.email = 'rupertweiner@gmail.com';

SELECT 'Admin verification complete!' as status;
