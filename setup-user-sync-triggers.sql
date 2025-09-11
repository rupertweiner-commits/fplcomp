-- Setup automatic sync between auth.users and user_profiles
-- Run this in Supabase SQL Editor to ensure they stay in sync

-- Step 1: Drop any existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();
DROP FUNCTION IF EXISTS public.handle_user_delete();

-- Step 2: Create robust trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true,
    CASE WHEN NEW.email = 'rupertweiner@gmail.com' THEN true ELSE false END, -- Auto-admin for you
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

-- Step 3: Create trigger function for user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user in public.user_profiles table
  UPDATE public.user_profiles SET
    email = NEW.email,
    username = COALESCE(NEW.raw_user_meta_data->>'username', username),
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error in handle_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger function for user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete user in public.user_profiles table (set is_active = false)
  UPDATE public.user_profiles SET
    is_active = false,
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error in handle_user_delete: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_delete() TO service_role;

-- Step 7: Create function to sync all existing users
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS void AS $$
BEGIN
  -- Insert all existing auth.users into public.user_profiles
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

-- Step 8: Run the sync function to ensure all users are synced
SELECT public.sync_all_auth_users();

-- Step 9: Create a function to check sync status
CREATE OR REPLACE FUNCTION public.check_user_sync_status()
RETURNS TABLE(
  auth_count bigint,
  profile_count bigint,
  missing_profiles bigint,
  extra_profiles bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as auth_count,
    (SELECT COUNT(*) FROM public.user_profiles WHERE is_active = true) as profile_count,
    (SELECT COUNT(*) FROM auth.users au 
     WHERE au.deleted_at IS NULL 
     AND au.id NOT IN (SELECT id FROM public.user_profiles)) as missing_profiles,
    (SELECT COUNT(*) FROM public.user_profiles up 
     WHERE up.is_active = true 
     AND up.id NOT IN (SELECT id FROM auth.users WHERE deleted_at IS NULL)) as extra_profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Check sync status
SELECT 'User sync status:' as info, * FROM public.check_user_sync_status();

-- Step 11: Verify triggers are working
SELECT 
  'Triggers created:' as info,
  trigger_name,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'
ORDER BY trigger_name;

SELECT 'User sync system setup complete!' as status;
