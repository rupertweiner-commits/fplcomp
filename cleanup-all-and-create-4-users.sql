-- Clean up ALL users and create exactly 4 users: Rupert, Yasmin, and 2 mock users
-- Run this in Supabase SQL Editor

-- Step 1: Show current users before cleanup
SELECT 
  'Users before cleanup:' as info,
  id,
  email,
  username,
  is_admin,
  is_active
FROM public.user_profiles 
ORDER BY created_at DESC;

-- Step 2: Delete ALL users from user_profiles table
DELETE FROM public.user_profiles;

-- Step 3: Reset the sequence (if using SERIAL)
-- This ensures clean IDs for new users

-- Step 4: Create exactly 4 users with unique usernames
INSERT INTO public.user_profiles (
  id,
  email,
  username,
  first_name,
  last_name,
  is_active,
  is_admin,
  created_at,
  updated_at
) VALUES 
  -- Rupert (admin)
  (
    '23c37c81-e571-4867-b241-804fb61f2ab7',
    'rupertweiner@gmail.com',
    'rupert',
    'Rupert',
    'Weiner',
    true,
    true,
    NOW(),
    NOW()
  ),
  -- Yasmin
  (
    'd31851e1-9a8c-4f93-bb34-acc17e837a03',
    'yasmin.cherry1@hotmail.com',
    'yasmin',
    'Yasmin',
    'Cherry',
    true,
    false,
    NOW(),
    NOW()
  ),
  -- Mock user 1: Alex
  (
    '00000000-0000-0000-0000-000000000001',
    'alex@example.com',
    'alex_manager',
    'Alex',
    'Manager',
    true,
    false,
    NOW(),
    NOW()
  ),
  -- Mock user 2: Sarah
  (
    '00000000-0000-0000-0000-000000000002',
    'sarah@example.com',
    'sarah_coach',
    'Sarah',
    'Coach',
    true,
    false,
    NOW(),
    NOW()
  );

-- Step 5: Verify we have exactly 4 users
SELECT 
  'Final user count:' as info,
  COUNT(*) as total_users
FROM public.user_profiles;

-- Step 6: Show the 4 users
SELECT 
  'Final 4 users:' as info,
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active
FROM public.user_profiles 
ORDER BY 
  CASE 
    WHEN email = 'rupertweiner@gmail.com' THEN 1
    WHEN email = 'yasmin.cherry1@hotmail.com' THEN 2
    WHEN email = 'alex@example.com' THEN 3
    WHEN email = 'sarah@example.com' THEN 4
    ELSE 5
  END;

-- Step 7: Check for any remaining duplicates
SELECT 
  'Duplicate usernames check:' as info,
  username,
  COUNT(*) as count
FROM public.user_profiles 
GROUP BY username
HAVING COUNT(*) > 1;

SELECT 
  'Duplicate emails check:' as info,
  email,
  COUNT(*) as count
FROM public.user_profiles 
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 8: Update the sync function to only sync these 4 users
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS void AS $$
BEGIN
  -- Only sync the 4 specific users we want
  INSERT INTO public.user_profiles (
    id,
    email,
    username,
    first_name,
    last_name,
    is_active,
    is_admin,
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    true,
    CASE WHEN au.email = 'rupertweiner@gmail.com' THEN true ELSE false END,
    au.created_at,
    NOW()
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND au.email IN (
    'rupertweiner@gmail.com',
    'yasmin.cherry1@hotmail.com',
    'alex@example.com',
    'sarah@example.com'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_admin = EXCLUDED.is_admin,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced the 4 allowed users to user_profiles table';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Cleanup complete - exactly 4 users with unique usernames!' as status;
