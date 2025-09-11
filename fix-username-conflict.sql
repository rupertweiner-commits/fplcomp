-- Fix username conflict in user_profiles table
-- Run this in Supabase SQL Editor

-- Step 1: Check current usernames in user_profiles
SELECT 
  'Current usernames in user_profiles:' as info,
  username,
  COUNT(*) as count
FROM public.user_profiles 
GROUP BY username
ORDER BY count DESC;

-- Step 2: Check what usernames would be generated from auth.users
SELECT 
  'Usernames that would be generated from auth.users:' as info,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as generated_username,
  au.email,
  COUNT(*) as count
FROM auth.users au
WHERE au.deleted_at IS NULL
GROUP BY COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)), au.email
ORDER BY count DESC;

-- Step 3: Fix the sync function to handle username conflicts
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS void AS $$
BEGIN
  -- Insert all existing auth.users into public.user_profiles
  -- Handle username conflicts by making them unique
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
    -- Generate unique username by adding suffix if needed
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_profiles up2 
        WHERE up2.username = COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1))
        AND up2.id != au.id
      ) THEN COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) || '_' || SUBSTRING(au.id::text, 1, 8)
      ELSE COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1))
    END as username,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    true,
    CASE WHEN au.email = 'rupertweiner@gmail.com' THEN true ELSE false END,
    au.created_at,
    NOW()
  FROM auth.users au
  WHERE au.deleted_at IS NULL
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

-- Step 4: Also update the handle_new_user function to handle conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base username
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  final_username := base_username;
  
  -- Handle username conflicts by adding a counter
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter::text;
  END LOOP;

  -- Insert new user into public.user_profiles table
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
  ) VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true,
    CASE WHEN NEW.email = 'rupertweiner@gmail.com' THEN true ELSE false END,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Run the updated sync function
SELECT public.sync_all_auth_users();

-- Step 6: Verify the fix
SELECT 
  'After fix - usernames in user_profiles:' as info,
  username,
  email,
  is_admin
FROM public.user_profiles 
ORDER BY created_at DESC;

SELECT 'Username conflict fixed!' as status;
