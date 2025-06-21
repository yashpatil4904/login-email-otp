-- Migration to fix timezone storage
-- Convert existing timestamp columns to timestamptz

-- First, let's see what we have currently
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name IN ('sessions', 'users') AND column_name LIKE '%time%' OR column_name LIKE '%at%';

-- Convert sessions table columns to timestamptz
ALTER TABLE sessions ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE sessions ALTER COLUMN expiration_time TYPE timestamptz USING expiration_time AT TIME ZONE 'UTC';

-- Convert users table columns to timestamptz
ALTER TABLE users ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE users ALTER COLUMN last_login TYPE timestamptz USING last_login AT TIME ZONE 'UTC';

-- Set default timezone for the session to IST
SET timezone = 'Asia/Kolkata';

-- Create a function to get current IST time
CREATE OR REPLACE FUNCTION get_ist_time()
RETURNS timestamptz AS $$
BEGIN
  RETURN now() AT TIME ZONE 'Asia/Kolkata';
END;
$$ LANGUAGE plpgsql;

-- Update the cleanup function to use IST timezone
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET status = 'expired' 
  WHERE expiration_time < (now() AT TIME ZONE 'Asia/Kolkata') AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 