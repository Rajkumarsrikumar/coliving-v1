-- Add receipt/image URL to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN expenses.receipt_url IS 'Optional URL to receipt or image (stored in Supabase Storage)';

-- Create receipts bucket (public, 5MB limit, images only)
-- If this fails, create manually: Dashboard > Storage > New bucket > "receipts" (public)
INSERT INTO storage.buckets (id, name, public)
SELECT 'receipts', 'receipts', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts');

-- Storage policies: authenticated users can upload and read receipts
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Authenticated users can read receipts" ON storage.objects;
CREATE POLICY "Authenticated users can read receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts');
