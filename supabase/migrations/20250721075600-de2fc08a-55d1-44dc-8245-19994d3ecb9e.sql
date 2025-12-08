-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view instructor photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload instructor photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update instructor photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete instructor photos" ON storage.objects;

-- Delete all existing files in the bucket
DELETE FROM storage.objects WHERE bucket_id = 'instructor-photos';

-- Delete and recreate the bucket
DELETE FROM storage.buckets WHERE id = 'instructor-photos';
INSERT INTO storage.buckets (id, name, public) 
VALUES ('instructor-photos', 'instructor-photos', true);

-- Create new storage policies for instructor photos
CREATE POLICY "Public access for instructor photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'instructor-photos');

CREATE POLICY "Auth users can upload instructor photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'instructor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth users can update instructor photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'instructor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth users can delete instructor photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'instructor-photos' AND auth.role() = 'authenticated');