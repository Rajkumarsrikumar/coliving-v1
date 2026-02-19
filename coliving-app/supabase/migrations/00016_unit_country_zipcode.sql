-- Add country and zipcode to units
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS zipcode TEXT;

COMMENT ON COLUMN units.country IS 'Country of the unit.';
COMMENT ON COLUMN units.zipcode IS 'Postal/ZIP code of the unit.';
