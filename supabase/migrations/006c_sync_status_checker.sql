-- Step 7: Create function to check sync status
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

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.check_user_sync_status() TO service_role;
