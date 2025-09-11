-- Clean up user_profiles table to only have 4 users: Rupert, Yasmin, and 2 mock users
-- Run this in Supabase SQL Editor

-- Step 1: Show current users
SELECT 
  'Current users in user_profiles:' as info,
  id,
  email,
  username,
  is_admin,
  is_active,
  created_at
FROM public.user_profiles 
ORDER BY created_at DESC;

-- Step 2: Delete all users except the 4 we want to keep
-- Keep: rupertweiner@gmail.com, yasmin.cherry1@hotmail.com, and 2 mock users
DELETE FROM public.user_profiles 
WHERE email NOT IN (
  'rupertweiner@gmail.com',
  'yasmin.cherry1@hotmail.com',
  'alex@example.com',
  'sarah@example.com'
);

-- Step 3: Ensure we have exactly the 4 users we want
-- If any are missing, create them
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
    'alex',
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
    'sarah',
    'Sarah',
    'Coach',
    true,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 4: Verify we have exactly 4 users
SELECT 
  'Final user count:' as info,
  COUNT(*) as total_users
FROM public.user_profiles;

-- Step 5: Show the 4 users
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

-- Step 6: Update the sync function to only sync these 4 users
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

SELECT 'User cleanup complete - exactly 4 users!' as status;
