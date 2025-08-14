-- Create table to store reference videos by skill
CREATE TABLE IF NOT EXISTS public.reference_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL UNIQUE,
  video_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT,
  file_size BIGINT
);

-- Enable RLS
ALTER TABLE public.reference_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for reference videos
CREATE POLICY "Anyone can view reference videos" ON public.reference_videos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reference videos" ON public.reference_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reference videos" ON public.reference_videos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reference videos" ON public.reference_videos FOR DELETE USING (true);