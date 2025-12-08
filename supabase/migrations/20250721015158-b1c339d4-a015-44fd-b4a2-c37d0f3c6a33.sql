-- Create storage bucket for instructor photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('instructor-photos', 'instructor-photos', true);

-- Create storage policies for instructor photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'instructor-photos');

CREATE POLICY "Authenticated users can upload instructor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instructor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update instructor photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'instructor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete instructor photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'instructor-photos' AND auth.role() = 'authenticated');