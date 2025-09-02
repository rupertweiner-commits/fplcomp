-- Add password authentication to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Update existing users with default passwords (for demo purposes)
-- In production, these should be set by users during registration
UPDATE users SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK' WHERE username = 'Rupert';
UPDATE users SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK' WHERE username = 'Portia';
UPDATE users SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK' WHERE username = 'Yasmin';
UPDATE users SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK' WHERE username = 'Will';

-- Add email for Rupert
UPDATE users SET email = 'rupertweiner@gmail.com' WHERE username = 'Rupert';
UPDATE users SET email = 'portia@example.com' WHERE username = 'Portia';
UPDATE users SET email = 'yasmin@example.com' WHERE username = 'Yasmin';
UPDATE users SET email = 'will@example.com' WHERE username = 'Will';
