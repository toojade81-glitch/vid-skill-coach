-- Test auto deletion functionality
-- Check if the trigger exists and is working properly

-- First, let's ensure the function and trigger are properly set up
CREATE OR REPLACE FUNCTION public.auto_delete_video()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if ai_feedback is not null and delete_video_after_feedback is true
  IF NEW.ai_feedback IS NOT NULL AND NEW.delete_video_after_feedback = true AND NEW.video_url IS NOT NULL THEN
    -- Extract storage path from video_url and delete from storage
    -- Storage path is extracted from signed URL format
    PERFORM storage.delete_object('pe-videos', split_part(split_part(NEW.video_url, '/pe-videos/', 2), '?', 1));
    
    -- Log the deletion attempt for debugging
    RAISE NOTICE 'Auto-deleted video for attempt %', NEW.attempt_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS trigger_auto_delete_video ON public.attempts;

CREATE TRIGGER trigger_auto_delete_video
  AFTER UPDATE ON public.attempts
  FOR EACH ROW
  WHEN (OLD.ai_feedback IS NULL AND NEW.ai_feedback IS NOT NULL)
  EXECUTE FUNCTION public.auto_delete_video();