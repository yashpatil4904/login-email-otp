/*
  # Email OTP Authentication System

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `created_at` (timestamp with timezone, default now)
      - `last_login` (timestamp with timezone, nullable)
    
    - `otp_sessions`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `otp_code` (text, not null)
      - `expiration_time` (timestamp with timezone, not null)
      - `status` (text, default 'active', check constraint)
      - `created_at` (timestamp with timezone, default now)
      - `attempts` (integer, default 0)

  2. Security
    - Enable RLS on both tables
    - Add policies for service role access (since we're using edge functions)
    - Create indexes for performance optimization

  3. Functions
    - Cleanup function for expired OTP sessions
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create OTP sessions table
CREATE TABLE IF NOT EXISTS otp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expiration_time timestamptz NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  created_at timestamptz DEFAULT now(),
  attempts integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Allow service role to manage users (for edge functions)
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

-- Create policies for otp_sessions table
-- Allow service role to manage OTP sessions (for edge functions)
CREATE POLICY "Service role can manage otp_sessions"
  ON otp_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role limited access for OTP operations
CREATE POLICY "Allow public OTP operations"
  ON otp_sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_email ON otp_sessions(email);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expiration ON otp_sessions(expiration_time);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_status ON otp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_created_at ON otp_sessions(created_at);

-- Function to cleanup expired OTP sessions
CREATE OR REPLACE FUNCTION cleanup_expired_otp_sessions()
RETURNS void AS $$
BEGIN
  UPDATE otp_sessions 
  SET status = 'expired' 
  WHERE expiration_time < now() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_otp_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_otp_sessions() TO anon;