-- Implement 4-User Cap Limit in Supabase
-- Run this in Supabase SQL Editor to enforce maximum 4 users

-- Step 1: Create a function to check user count before allowing new signups
CREATE OR REPLACE FUNCTION check_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count current active users
  SELECT COUNT(*) INTO user_count 
  FROM users 
  WHERE is_active = true;
  
  -- If we already have 4 or more users, prevent new signup
  IF user_count >= 4 THEN
    RAISE EXCEPTION 'Maximum user limit reached. Only 4 users are allowed.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to enforce user limit on INSERT
DROP TRIGGER IF EXISTS enforce_user_limit ON users;
CREATE TRIGGER enforce_user_limit
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_limit();

-- Step 3: Check current user count
SELECT 
  'Current user count:' as info,
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users;

-- Step 4: List current users
SELECT 
  'Current users:' as info,
  id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active,
  created_at
FROM users
ORDER BY created_at;

-- Step 5: Test the trigger (this should fail if we have 4+ users)
-- Uncomment the line below to test the trigger
-- INSERT INTO users (id, email, first_name, last_name, is_active) 
-- VALUES (gen_random_uuid(), 'test@example.com', 'Test', 'User', true);

-- Step 6: Create a function to get user limit status
CREATE OR REPLACE FUNCTION get_user_limit_status()
RETURNS TABLE(
  current_users INTEGER,
  max_users INTEGER,
  can_signup BOOLEAN,
  remaining_slots INTEGER
) AS $$
DECLARE
  user_count INTEGER;
  max_limit INTEGER := 4;
BEGIN
  SELECT COUNT(*) INTO user_count 
  FROM users 
  WHERE is_active = true;
  
  RETURN QUERY SELECT 
    user_count,
    max_limit,
    (user_count < max_limit),
    (max_limit - user_count);
END;
$$ LANGUAGE plpgsql;

-- Step 7: Test the user limit status function
SELECT * FROM get_user_limit_status();

-- Step 8: Create a view for easy monitoring
CREATE OR REPLACE VIEW user_limit_monitor AS
SELECT 
  COUNT(*) as current_users,
  4 as max_users,
  COUNT(*) < 4 as can_signup,
  4 - COUNT(*) as remaining_slots,
  CASE 
    WHEN COUNT(*) >= 4 THEN 'FULL - No new signups allowed'
    WHEN COUNT(*) >= 3 THEN 'ALMOST FULL - 1 slot remaining'
    WHEN COUNT(*) >= 2 THEN 'HALF FULL - 2 slots remaining'
    WHEN COUNT(*) >= 1 THEN 'QUARTER FULL - 3 slots remaining'
    ELSE 'EMPTY - 4 slots available'
  END as status
FROM users 
WHERE is_active = true;
