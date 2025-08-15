-- Create the pe-videos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pe-videos', 'pe-videos', false);

-- Create RLS policies for pe-videos bucket
CREATE POLICY "Authenticated users can upload to pe-videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pe-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view pe-videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pe-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from pe-videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pe-videos' AND auth.role() = 'authenticated');

-- Create function to automatically delete videos from storage
CREATE OR REPLACE FUNCTION auto_delete_video()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if ai_feedback is not null and delete_video_after_feedback is true
  IF NEW.ai_feedback IS NOT NULL AND NEW.delete_video_after_feedback = true AND NEW.video_url IS NOT NULL THEN
    -- Extract storage path from video_url and delete from storage
    PERFORM storage.delete_object('pe-videos', split_part(split_part(NEW.video_url, '/pe-videos/', 2), '?', 1));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-delete videos
CREATE TRIGGER trigger_auto_delete_video
  AFTER UPDATE ON attempts
  FOR EACH ROW
  EXECUTE FUNCTION auto_delete_video();