-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    is_active,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true,
    false, -- Default to non-admin
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user in public.users table
  UPDATE public.users SET
    email = NEW.email,
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete user in public.users table (set is_active = false)
  UPDATE public.users SET
    is_active = false,
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Create function to sync existing users (run this once to sync existing data)
CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS void AS $$
BEGIN
  -- Insert all existing auth.users into public.users
  INSERT INTO public.users (
    id,
    email,
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
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    true,
    false,
    au.created_at,
    NOW()
  FROM auth.users au
  WHERE au.id NOT IN (SELECT id FROM public.users)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced existing auth users to public.users table';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to sync existing users
SELECT public.sync_existing_auth_users();

-- Create function to manually sync a specific user
CREATE OR REPLACE FUNCTION public.sync_user_by_id(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert or update specific user
  INSERT INTO public.users (
    id,
    email,
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
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    true,
    false,
    au.created_at,
    NOW()
  FROM auth.users au
  WHERE au.id = user_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced user % to public.users table', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check sync status
CREATE OR REPLACE FUNCTION public.check_user_sync_status()
RETURNS TABLE(
  auth_user_id UUID,
  auth_email TEXT,
  public_user_id UUID,
  public_email TEXT,
  sync_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    pu.id as public_user_id,
    pu.email as public_email,
    CASE 
      WHEN pu.id IS NULL THEN 'MISSING_IN_PUBLIC'
      WHEN au.email != pu.email THEN 'EMAIL_MISMATCH'
      ELSE 'SYNCED'
    END as sync_status
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_delete() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_existing_auth_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_by_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_sync_status() TO service_role;

-- Add RLS policy to allow service_role to manage users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow service_role to manage users (for triggers)
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to read all users
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Allow admins to update all users
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );
