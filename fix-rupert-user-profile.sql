-- Fix missing user profile for rupertweiner@gmail.com
-- This script will create the user profile if it doesn't exist

-- First, let's check if the user exists in auth.users
-- (We can't directly query auth.users from here, but we can check user_profiles)

-- Check if user profile exists
SELECT id, email, first_name, last_name, is_admin, is_active 
FROM user_profiles 
WHERE email = 'rupertweiner@gmail.com';

-- If the above returns no rows, we need to create the profile
-- But we need the UUID from auth.users first
-- Let's create a profile with a placeholder UUID that we'll update

-- Insert user profile (replace the UUID with the actual one from auth.users)
INSERT INTO user_profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  is_active, 
  is_admin, 
  created_at, 
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- PLACEHOLDER - replace with actual UUID
  'rupertweiner@gmail.com',
  'Rupert',
  'Weiner',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Note: You'll need to get the actual UUID from Supabase Auth dashboard
-- and update the placeholder UUID above
