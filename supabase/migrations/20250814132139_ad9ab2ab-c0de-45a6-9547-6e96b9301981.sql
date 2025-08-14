-- Create storage bucket for reference videos
INSERT INTO storage.buckets (id, name, public) VALUES ('reference-videos', 'reference-videos', true);

-- Create policies for reference video uploads
CREATE POLICY "Anyone can view reference videos" ON storage.objects FOR SELECT USING (bucket_id = 'reference-videos');

CREATE POLICY "Anyone can upload reference videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reference-videos');

CREATE POLICY "Anyone can update reference videos" ON storage.objects FOR UPDATE USING (bucket_id = 'reference-videos');

CREATE POLICY "Anyone can delete reference videos" ON storage.objects FOR DELETE USING (bucket_id = 'reference-videos');