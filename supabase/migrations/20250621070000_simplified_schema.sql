-- Drop existing tables if they exist
DROP TABLE IF EXISTS otp_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (simplified as requested)
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP
);

-- Sessions table (simplified as requested)
CREATE TABLE sessions (
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expiration_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_email ON sessions(email);
CREATE INDEX idx_sessions_expiration ON sessions(expiration_time);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Allow all operations on users"
  ON users
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create policies for sessions table
CREATE POLICY "Allow all operations on sessions"
  ON sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET status = 'expired' 
  WHERE expiration_time < now() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO anon; 