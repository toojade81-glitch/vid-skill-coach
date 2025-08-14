-- Create attempts table for volleyball skill assessment
CREATE TABLE public.attempts (
  attempt_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  student_id TEXT NOT NULL,
  class TEXT NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('Setting', 'Digging')),
  target TEXT NOT NULL CHECK (target IN ('Left', 'Center', 'Right')),
  video_url TEXT,
  auto_metrics JSONB DEFAULT '{}'::jsonb,
  auto_scores JSONB DEFAULT '{}'::jsonb,
  final_scores JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (no authentication required)
CREATE POLICY "Allow all access to attempts" 
ON public.attempts 
FOR ALL 
USING (true) 
WITH CHECK (true);