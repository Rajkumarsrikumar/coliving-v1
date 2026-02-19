-- Unit: agent contact, contract expiry, contract document, master tenant contribution display

-- Contact/lease expiry date
ALTER TABLE units ADD COLUMN IF NOT EXISTS contact_expiry_date DATE;
COMMENT ON COLUMN units.contact_expiry_date IS 'Lease/contract expiry date';

-- Agent contact details
ALTER TABLE units ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS agent_email TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS agent_phone TEXT;
COMMENT ON COLUMN units.agent_name IS 'Property agent name';
COMMENT ON COLUMN units.agent_email IS 'Property agent email';
COMMENT ON COLUMN units.agent_phone IS 'Property agent phone';

-- Contract document URL (uploaded to storage)
ALTER TABLE units ADD COLUMN IF NOT EXISTS contract_url TEXT;
COMMENT ON COLUMN units.contract_url IS 'URL to uploaded contract/lease document';

-- Create contracts bucket for lease documents
INSERT INTO storage.buckets (id, name, public)
SELECT 'contracts', 'contracts', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'contracts');

DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Authenticated users can read contracts" ON storage.objects;
CREATE POLICY "Authenticated users can read contracts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contracts');
