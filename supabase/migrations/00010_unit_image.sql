-- Add unit image URL
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN units.image_url IS 'Optional image/photo of the unit (stored in Supabase Storage)';

-- Create unit-images bucket
INSERT INTO storage.buckets (id, name, public)
SELECT 'unit-images', 'unit-images', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'unit-images');

-- Storage policies for unit images
DROP POLICY IF EXISTS "Authenticated users can upload unit images" ON storage.objects;
CREATE POLICY "Authenticated users can upload unit images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'unit-images');

DROP POLICY IF EXISTS "Authenticated users can read unit images" ON storage.objects;
CREATE POLICY "Authenticated users can read unit images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'unit-images');
