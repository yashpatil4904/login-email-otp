/*
  # Email OTP Authentication Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
      - `last_login` (timestamp)
    - `otp_sessions`
      - `id` (uuid, primary key)
      - `email` (text)
      - `otp_code` (text)
      - `expiration_time` (timestamp)
      - `status` (text - active/expired/used)
      - `created_at` (timestamp)
      - `attempts` (integer, default 0)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated access
    - Add indexes for performance

  3. Functions
    - Function to cleanup expired OTP sessions
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
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Allow user creation during OTP verification"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Create policies for otp_sessions table
CREATE POLICY "Allow OTP session creation"
  ON otp_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow OTP session updates"
  ON otp_sessions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow OTP session reads"
  ON otp_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_email ON otp_sessions(email);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expiration ON otp_sessions(expiration_time);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_status ON otp_sessions(status);

-- Function to cleanup expired OTP sessions
CREATE OR REPLACE FUNCTION cleanup_expired_otp_sessions()
RETURNS void AS $$
BEGIN
  UPDATE otp_sessions 
  SET status = 'expired' 
  WHERE expiration_time < now() AND status = 'active';
END;
$$ LANGUAGE plpgsql;