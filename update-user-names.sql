-- Update user names and remove test user
-- Run this in Supabase SQL Editor

-- Update Alex to Will
UPDATE user_profiles 
SET first_name = 'Will'
WHERE first_name = 'Alex';

-- Update Sarah to Portia  
UPDATE user_profiles 
SET first_name = 'Portia'
WHERE first_name = 'Sarah';

-- Remove Teest Weiner user (first deallocate any players)
UPDATE chelsea_players 
SET assigned_to_user_id = NULL, 
    is_captain = false, 
    is_vice_captain = false
WHERE assigned_to_user_id IN (
  SELECT id FROM user_profiles WHERE first_name = 'Teest'
);

-- Delete from user_profiles
DELETE FROM user_profiles 
WHERE first_name = 'Teest' AND last_name = 'Weiner';

-- Delete from auth.users (find by email pattern or metadata)
DELETE FROM auth.users 
WHERE raw_user_meta_data->>'first_name' = 'Teest'
   OR email LIKE '%teest%';

-- Also update in auth.users table for remaining users (optional)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'), 
  '{first_name}', 
  '"Will"'
)
WHERE raw_user_meta_data->>'first_name' = 'Alex';

UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'), 
  '{first_name}', 
  '"Portia"'
)
WHERE raw_user_meta_data->>'first_name' = 'Sarah';

-- Verify the changes
SELECT id, email, first_name, last_name 
FROM user_profiles 
ORDER BY first_name;
