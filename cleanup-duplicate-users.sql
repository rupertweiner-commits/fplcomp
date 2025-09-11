-- Clean up duplicate users and ensure only one "rupert" user exists
-- Run this in Supabase SQL Editor

-- Step 1: Check for duplicate usernames
SELECT 
  'Duplicate usernames found:' as info,
  username,
  COUNT(*) as count,
  STRING_AGG(email, ', ') as emails
FROM public.user_profiles 
GROUP BY username
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: Check for duplicate emails
SELECT 
  'Duplicate emails found:' as info,
  email,
  COUNT(*) as count,
  STRING_AGG(username, ', ') as usernames
FROM public.user_profiles 
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 3: Show all users with username "rupert"
SELECT 
  'All users with username "rupert":' as info,
  id,
  email,
  username,
  is_admin,
  is_active,
  created_at
FROM public.user_profiles 
WHERE username = 'rupert'
ORDER BY created_at;

-- Step 4: Keep only the most recent "rupert" user (rupertweiner@gmail.com)
-- Delete the older duplicate entries
DELETE FROM public.user_profiles 
WHERE username = 'rupert' 
AND email != 'rupertweiner@gmail.com';

-- Step 5: Check for any other duplicate usernames and clean them up
-- Keep the most recent entry for each username
WITH duplicates AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at DESC) as rn
  FROM public.user_profiles
)
DELETE FROM public.user_profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 6: Check for any duplicate emails and clean them up
-- Keep the most recent entry for each email
WITH email_duplicates AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM public.user_profiles
)
DELETE FROM public.user_profiles 
WHERE id IN (
  SELECT id FROM email_duplicates WHERE rn > 1
);

-- Step 7: Verify the cleanup
SELECT 
  'After cleanup - all users:' as info,
  id,
  email,
  username,
  is_admin,
  is_active,
  created_at
FROM public.user_profiles 
ORDER BY created_at DESC;

-- Step 8: Check for any remaining duplicates
SELECT 
  'Remaining duplicate usernames:' as info,
  username,
  COUNT(*) as count
FROM public.user_profiles 
GROUP BY username
HAVING COUNT(*) > 1;

SELECT 
  'Remaining duplicate emails:' as info,
  email,
  COUNT(*) as count
FROM public.user_profiles 
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 9: Update the sync function to prevent future duplicates
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS void AS $$
BEGIN
  -- Insert all existing auth.users into public.user_profiles
  -- Only insert if user doesn't already exist
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
  AND au.id NOT IN (SELECT id FROM public.user_profiles)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_admin = EXCLUDED.is_admin,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced all auth users to user_profiles table';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Duplicate users cleaned up!' as status;
