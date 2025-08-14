-- Create RLS policies for pe-videos bucket to allow users to upload and access their own videos

-- Allow users to upload videos to pe-videos bucket
CREATE POLICY "Users can upload videos to pe-videos bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'pe-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own videos
CREATE POLICY "Users can view their own videos in pe-videos bucket" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'pe-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos in pe-videos bucket" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'pe-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a table to track video uploads and their metadata
CREATE TABLE public.video_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video_uploads table
ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_uploads table
CREATE POLICY "Users can view their own video uploads" 
ON public.video_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video uploads" 
ON public.video_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video uploads" 
ON public.video_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video uploads" 
ON public.video_uploads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_uploads_updated_at
BEFORE UPDATE ON public.video_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();