-- Supabase Email-Only Authentication Migration
-- Run this in your Supabase SQL Editor to convert to email-only system

-- First, let's check the current users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 1: First, update any existing users that don't have emails
-- This will set email to a placeholder for users without emails
UPDATE users 
SET email = COALESCE(
  email, 
  COALESCE(username, 'user') || '@example.com'
)
WHERE email IS NULL;

-- Additional safety check: ensure all users have emails
UPDATE users 
SET email = 'user_' || id || '@example.com'
WHERE email IS NULL OR email = '';

-- Verify no NULL emails remain
SELECT COUNT(*) as null_email_count 
FROM users 
WHERE email IS NULL;

-- Step 2: Update existing users table to make email required and username optional
-- Make email NOT NULL and remove username requirement
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

-- Step 3: Remove the unique constraint on username since it's no longer required
-- First drop the existing unique index
DROP INDEX IF EXISTS idx_users_username;

-- Step 4: Update RLS policies to work with email-based authentication
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new email-based policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Admins can read all profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update all profiles" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Step 5: Update any existing data that references username
-- Update draft_status table if it has username references
-- (This will depend on your current schema)

-- Step 6: Create a function to get user display name (email or first_name + last_name)
CREATE OR REPLACE FUNCTION get_user_display_name(user_record users)
RETURNS TEXT AS $$
BEGIN
  -- If user has first and last name, use that
  IF user_record.first_name IS NOT NULL AND user_record.last_name IS NOT NULL THEN
    RETURN user_record.first_name || ' ' || user_record.last_name;
  END IF;
  
  -- Otherwise, use email
  RETURN user_record.email;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update any existing users to have proper email addresses
-- This is a one-time migration for existing users
UPDATE users 
SET email = CASE 
  WHEN username = 'Portia' THEN 'portia@example.com'
  WHEN username = 'Yasmin' THEN 'yasmin@example.com'
  WHEN username = 'Rupert' THEN 'rupertweiner@gmail.com'
  WHEN username = 'Will' THEN 'will@example.com'
  ELSE email
END
WHERE username IN ('Portia', 'Yasmin', 'Rupert', 'Will');

-- Step 8: Verify the changes
SELECT 
  id,
  username,
  email,
  first_name,
  last_name,
  is_admin,
  is_active
FROM users
ORDER BY created_at;

-- Step 9: Test the display name function
SELECT 
  id,
  email,
  get_user_display_name(users.*) as display_name
FROM users
LIMIT 5;
