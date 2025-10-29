-- Ai:oS Users Table Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE aios_users (
  id BIGSERIAL PRIMARY KEY,

  -- User Information
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  use_case VARCHAR(100) NOT NULL, -- 'development', 'devops', 'security', 'research', 'personal', 'enterprise', 'other'

  -- Authentication
  password_hash TEXT NOT NULL,

  -- Preferences
  newsletter BOOLEAN DEFAULT true,

  -- Tracking
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  last_access TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Download tracking
  download_count INTEGER DEFAULT 0,
  last_download TIMESTAMPTZ
);

-- Indexes for faster queries
CREATE INDEX idx_aios_users_email ON aios_users(email);
CREATE INDEX idx_aios_users_use_case ON aios_users(use_case);
CREATE INDEX idx_aios_users_signup_date ON aios_users(signup_date DESC);

-- Enable Row Level Security
ALTER TABLE aios_users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (sign up)
CREATE POLICY "Anyone can sign up"
  ON aios_users FOR INSERT
  WITH CHECK (true);

-- Policy: Users can read their own data by email
CREATE POLICY "Users can read own data"
  ON aios_users FOR SELECT
  USING (email = current_setting('request.jwt.claim.email', true)::text OR auth.role() = 'authenticated');

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON aios_users FOR UPDATE
  USING (email = current_setting('request.jwt.claim.email', true)::text);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aios_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_aios_users_updated_at
BEFORE UPDATE ON aios_users
FOR EACH ROW
EXECUTE FUNCTION update_aios_users_updated_at();

-- View for admin dashboard
CREATE VIEW aios_users_dashboard AS
SELECT
  id,
  email,
  name,
  organization,
  use_case,
  newsletter,
  signup_date,
  last_access,
  download_count,
  last_download,
  CASE
    WHEN last_access > NOW() - INTERVAL '7 days' THEN 'Active'
    WHEN last_access > NOW() - INTERVAL '30 days' THEN 'Recent'
    ELSE 'Inactive'
  END as activity_status,
  AGE(NOW(), signup_date) as account_age
FROM aios_users
ORDER BY signup_date DESC;

-- Sample admin queries

-- Get all users by use case
-- SELECT use_case, COUNT(*) as count FROM aios_users GROUP BY use_case ORDER BY count DESC;

-- Get active users (last 7 days)
-- SELECT * FROM aios_users WHERE last_access > NOW() - INTERVAL '7 days' ORDER BY last_access DESC;

-- Get enterprise/research users
-- SELECT * FROM aios_users WHERE use_case IN ('enterprise', 'research') ORDER BY signup_date DESC;

-- Get users who haven't downloaded yet
-- SELECT * FROM aios_users WHERE download_count = 0 ORDER BY signup_date DESC;

-- Track download
-- UPDATE aios_users SET download_count = download_count + 1, last_download = NOW() WHERE email = 'user@example.com';

-- Get newsletter subscribers
-- SELECT email, name FROM aios_users WHERE newsletter = true ORDER BY signup_date DESC;
