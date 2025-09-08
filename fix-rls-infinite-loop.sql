-- EMERGENCY FIX: Resolve infinite RLS loop
-- Run this in your Supabase SQL Editor

-- Step 1: Temporarily disable RLS to break the loop
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
DROP POLICY IF EXISTS "Admin can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can read their own notification preferences" ON public.users;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.users;

-- Step 3: Ensure your user exists and is properly set up
INSERT INTO public.users (
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1),
  'rupertweiner@gmail.com',
  'rupertweiner',
  'Rupert',
  'Weiner',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 4: Verify your user is set up correctly
SELECT 'Your user setup:' as step;
SELECT 
  id,
  email,
  username,
  first_name,
  last_name,
  is_admin,
  is_active
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

-- Step 5: Create simple, non-recursive RLS policies
-- First, get your user ID for the policy
SELECT 'Your user ID for policy:' as step;
SELECT id as user_id FROM public.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1;

-- Step 6: Create basic policies that don't reference the users table
CREATE POLICY "Basic user read access" ON public.users
  FOR SELECT USING (
    id = auth.uid() OR 
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

CREATE POLICY "Basic user update access" ON public.users
  FOR UPDATE USING (
    id = auth.uid() OR 
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 7: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 8: Test the policies
SELECT 'Testing RLS policies...' as step;
SELECT COUNT(*) as total_users FROM public.users;

-- Step 9: Final verification
SELECT 'Final verification:' as step;
SELECT 
  email,
  is_admin,
  is_active,
  id
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

SELECT 'RLS infinite loop should be fixed!' as status;
