-- Ai|oS Onboarding Table Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE onboarding (
  id BIGSERIAL PRIMARY KEY,

  -- User Information
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  address TEXT NOT NULL,

  -- Payment Information
  payment_type VARCHAR(50) NOT NULL, -- 'trial_card', 'paypal', 'zelle', 'cashapp', 'crypto'
  payment_id VARCHAR(255), -- Stripe payment method ID, PayPal order ID, etc.
  payment_details JSONB, -- Additional payment info (card last4, transaction details, etc.)

  -- Trial/Subscription Status
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'trial', 'paid', 'expired', 'cancelled'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User Agent & Tracking
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,

  -- Verification for manual payments
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(255),

  -- Notes
  notes TEXT
);

-- Indexes for faster queries
CREATE INDEX idx_onboarding_email ON onboarding(email);
CREATE INDEX idx_onboarding_status ON onboarding(status);
CREATE INDEX idx_onboarding_payment_type ON onboarding(payment_type);
CREATE INDEX idx_onboarding_created_at ON onboarding(created_at DESC);

-- Enable Row Level Security
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert their onboarding data
CREATE POLICY "Anyone can insert onboarding"
  ON onboarding FOR INSERT
  WITH CHECK (true);

-- Policy: Users can read their own onboarding data by email
CREATE POLICY "Users can read own data"
  ON onboarding FOR SELECT
  USING (email = current_setting('request.jwt.claim.email', true));

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_onboarding_updated_at
BEFORE UPDATE ON onboarding
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- View for admin dashboard (requires admin privileges)
CREATE VIEW onboarding_dashboard AS
SELECT
  id,
  email,
  name,
  company,
  payment_type,
  status,
  verified,
  created_at,
  trial_start,
  trial_end,
  CASE
    WHEN status = 'trial' AND trial_end > NOW() THEN 'Active Trial'
    WHEN status = 'trial' AND trial_end < NOW() THEN 'Trial Expired'
    WHEN status = 'paid' THEN 'Paid Customer'
    WHEN verified = FALSE AND payment_type IN ('zelle', 'cashapp', 'crypto') THEN 'Pending Verification'
    ELSE status
  END as display_status
FROM onboarding
ORDER BY created_at DESC;

-- Sample queries for admin

-- Get all pending verifications
-- SELECT * FROM onboarding WHERE verified = FALSE AND payment_type IN ('zelle', 'cashapp', 'crypto') ORDER BY created_at DESC;

-- Get all active trials
-- SELECT * FROM onboarding WHERE status = 'trial' AND trial_end > NOW();

-- Get all paid customers
-- SELECT * FROM onboarding WHERE status = 'paid';

-- Mark payment as verified
-- UPDATE onboarding SET verified = TRUE, verified_at = NOW(), verified_by = 'admin@aios.is', status = 'paid' WHERE id = <id>;
