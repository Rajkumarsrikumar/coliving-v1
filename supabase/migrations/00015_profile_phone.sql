-- Add phone/mobile number to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.phone IS 'User mobile number for contact.';
