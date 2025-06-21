-- Final schema update for Email OTP Authentication System

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS otp_sessions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_otp_sessions() CASCADE;
DROP FUNCTION IF EXISTS get_ist_time() CASCADE;

-- Users table (final version)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Sessions table (final version - matches Netlify Functions expectations)
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expiration_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_email ON sessions(email);
CREATE INDEX idx_sessions_expiration ON sessions(expiration_time);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Allow service role to manage users (for Netlify Functions)
CREATE POLICY "Service role can manage users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role to read users for public operations
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to insert/update users for OTP operations
CREATE POLICY "Allow public user operations"
  ON users
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create policies for sessions table
-- Allow service role to manage OTP sessions (for Netlify Functions)
CREATE POLICY "Service role can manage sessions"
  ON sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role to manage OTP sessions
CREATE POLICY "Allow public session operations"
  ON sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Set default timezone for the session to IST
SET timezone = 'Asia/Kolkata';

-- Create a function to get current IST time
CREATE OR REPLACE FUNCTION get_ist_time()
RETURNS timestamptz AS $$
BEGIN
  RETURN now() AT TIME ZONE 'Asia/Kolkata';
END;
$$ LANGUAGE plpgsql;

-- Create the cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET status = 'expired' 
  WHERE expiration_time < now() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO anon;
GRANT EXECUTE ON FUNCTION get_ist_time() TO service_role;
GRANT EXECUTE ON FUNCTION get_ist_time() TO anon;

-- Create a view for debugging session information
CREATE OR REPLACE VIEW session_debug AS
SELECT 
  s.id,
  s.email,
  s.otp_code,
  s.status,
  s.created_at,
  s.expiration_time,
  s.created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist,
  s.expiration_time AT TIME ZONE 'Asia/Kolkata' as expiration_time_ist,
  CASE 
    WHEN s.expiration_time < now() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as time_status,
  now() AT TIME ZONE 'Asia/Kolkata' as current_ist_time
FROM sessions s
ORDER BY s.created_at DESC;

-- Grant access to the debug view
GRANT SELECT ON session_debug TO service_role;
GRANT SELECT ON session_debug TO anon;

-- Insert some helpful comments
COMMENT ON TABLE users IS 'Stores user information for email OTP authentication';
COMMENT ON TABLE sessions IS 'Stores OTP sessions with expiration and status tracking';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Automatically marks expired OTP sessions as expired';
COMMENT ON FUNCTION get_ist_time() IS 'Returns current time in India Standard Time (IST)';
COMMENT ON VIEW session_debug IS 'Debug view showing session information with IST timezone conversions';

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully. Schema is now consistent with Netlify Functions.';
  RAISE NOTICE 'Tables created: users, sessions';
  RAISE NOTICE 'Functions created: cleanup_expired_sessions(), get_ist_time()';
  RAISE NOTICE 'View created: session_debug';
  RAISE NOTICE 'Timezone set to: Asia/Kolkata (IST)';
END $$; 