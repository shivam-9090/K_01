-- Remove unnecessary fields from users table
-- Drop username, firstName, and lastName columns

-- Drop the username unique index first
DROP INDEX IF EXISTS users_username_key;

-- Remove the username column
ALTER TABLE users DROP COLUMN IF EXISTS username;

-- Remove firstName and lastName columns
ALTER TABLE users DROP COLUMN IF EXISTS "firstName";
ALTER TABLE users DROP COLUMN IF EXISTS "lastName";
