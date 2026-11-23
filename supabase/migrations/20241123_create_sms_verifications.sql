-- Create SMS verifications table
CREATE TABLE IF NOT EXISTS sms_verifications (
  phone_number TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public access (phone number serves as the access token)
CREATE POLICY "Allow read access to sms_verifications"
ON sms_verifications FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow write access to sms_verifications"
ON sms_verifications FOR ALL
TO anon, authenticated
USING (true);
