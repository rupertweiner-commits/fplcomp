-- Step 4: Create function to sync existing users
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

-- Step 5: Run the sync function
SELECT public.sync_existing_auth_users();

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_existing_auth_users() TO service_role;
