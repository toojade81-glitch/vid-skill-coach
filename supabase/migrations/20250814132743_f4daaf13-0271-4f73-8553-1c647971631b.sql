-- Create storage bucket for reference videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reference-videos', 'reference-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for reference video uploads
DO $$ 
BEGIN
    -- Check if policies already exist before creating them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can view reference videos'
    ) THEN
        CREATE POLICY "Anyone can view reference videos" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'reference-videos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can upload reference videos'
    ) THEN
        CREATE POLICY "Anyone can upload reference videos" 
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'reference-videos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can update reference videos'
    ) THEN
        CREATE POLICY "Anyone can update reference videos" 
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'reference-videos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can delete reference videos'
    ) THEN
        CREATE POLICY "Anyone can delete reference videos" 
        ON storage.objects FOR DELETE 
        USING (bucket_id = 'reference-videos');
    END IF;
END $$;