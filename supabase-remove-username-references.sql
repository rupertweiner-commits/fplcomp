-- Remove Username References from Database Schema
-- Run this after the email-only migration to clean up username references

-- Step 1: Check what tables reference username
SELECT 
  t.table_name,
  c.column_name,
  c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE c.column_name LIKE '%username%'
  AND t.table_schema = 'public'
ORDER BY t.table_name, c.column_name;

-- Step 2: Update draft_status table if it has username references
-- Check if draft_status has any username columns
DO $$
BEGIN
  -- If draft_status has current_turn_username, we need to update it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'draft_status' 
    AND column_name = 'current_turn_username'
  ) THEN
    -- Add current_turn_user_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'draft_status' 
      AND column_name = 'current_turn_user_id'
    ) THEN
      ALTER TABLE draft_status ADD COLUMN current_turn_user_id UUID;
    END IF;
    
    -- Migrate data from username to user_id
    UPDATE draft_status 
    SET current_turn_user_id = (
      SELECT id FROM users 
      WHERE username = draft_status.current_turn_username
    )
    WHERE current_turn_username IS NOT NULL;
    
    -- Drop the username column
    ALTER TABLE draft_status DROP COLUMN IF EXISTS current_turn_username;
  END IF;
END $$;

-- Step 3: Update any other tables that might reference username
-- Check for foreign key relationships that use username
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (kcu.column_name LIKE '%username%' OR ccu.column_name LIKE '%username%')
  AND tc.table_schema = 'public';

-- Step 4: Update any JSON columns that might contain username references
-- This is a general cleanup for any JSONB columns that might have username data
UPDATE draft_status 
SET users = (
  SELECT jsonb_agg(
    jsonb_set(
      jsonb_set(
        user_data,
        '{email}',
        to_jsonb(u.email)
      ),
      '{displayName}',
      to_jsonb(get_user_display_name(u.*))
    )
  )
  FROM jsonb_array_elements(users) AS user_data
  JOIN users u ON u.id::text = (user_data->>'id')
)
WHERE users IS NOT NULL;

-- Step 5: Create a view for user display information
CREATE OR REPLACE VIEW user_display_info AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  get_user_display_name(users.*) as display_name,
  is_admin,
  is_active,
  created_at
FROM users;

-- Step 6: Update any triggers or functions that reference username
-- Check for functions that use username
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%username%'
  AND routine_schema = 'public';

-- Step 7: Final verification
SELECT 
  'Users table structure:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 
  'Sample user data:' as info,
  id,
  email,
  first_name,
  last_name,
  get_user_display_name(users.*) as display_name
FROM users
LIMIT 5;
