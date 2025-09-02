-- Update users with proper email addresses for testing
UPDATE users 
SET email = 'portia@example.com' 
WHERE username = 'Portia';

UPDATE users 
SET email = 'yasmin@example.com' 
WHERE username = 'Yasmin';

UPDATE users 
SET email = 'will@example.com' 
WHERE username = 'Will';

-- Verify the updates
SELECT username, email FROM users;



