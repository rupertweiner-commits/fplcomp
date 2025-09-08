-- Fix admin recognition issue
-- Run this in your Supabase SQL Editor

-- Step 1: Check your current user data
SELECT 'Your current user data:' as step;
SELECT 
  id,
  email,
  username,
  is_admin,
  is_active,
  created_at
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

-- Step 2: Make sure you're definitely admin
UPDATE public.users 
SET 
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'rupertweiner@gmail.com';

-- Step 3: Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Step 4: Create simpler admin policies using user ID instead of email
-- First, get your user ID
SELECT 'Your user ID for policy:' as step;
SELECT id as user_id FROM public.users WHERE email = 'rupertweiner@gmail.com';

-- Step 5: Create admin policies using your specific user ID
-- Replace 'YOUR_USER_ID_HERE' with the actual ID from step 4
-- For now, let's create a policy that allows you to read all users
CREATE POLICY "Admin can read all users" ON public.users
  FOR SELECT USING (
    id = auth.uid() OR 
    auth.uid() = (SELECT id FROM public.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 6: Create policy for admin to update all users
CREATE POLICY "Admin can update all users" ON public.users
  FOR UPDATE USING (
    id = auth.uid() OR 
    auth.uid() = (SELECT id FROM public.users WHERE email = 'rupertweiner@gmail.com' LIMIT 1)
  );

-- Step 7: Test the policies
SELECT 'Testing admin access...' as step;
SELECT COUNT(*) as total_users FROM public.users;

-- Step 8: Verify your admin status again
SELECT 'Final admin verification:' as step;
SELECT 
  email,
  is_admin,
  is_active,
  id
FROM public.users
WHERE email = 'rupertweiner@gmail.com';

SELECT 'Admin recognition should be fixed!' as status;
