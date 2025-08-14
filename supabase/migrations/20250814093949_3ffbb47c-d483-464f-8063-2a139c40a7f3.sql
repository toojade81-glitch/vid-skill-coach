-- Create students table
CREATE TABLE public.students (
  student_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  sex TEXT CHECK (sex IN ('M', 'F')),
  dob DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table
CREATE TABLE public.sessions (
  session_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  class TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skills table
CREATE TABLE public.skills (
  skill_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cues TEXT[] DEFAULT '{}',
  success_criteria TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rubrics table
CREATE TABLE public.rubrics (
  rubric_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skills(skill_id) ON DELETE CASCADE,
  criteria TEXT[] NOT NULL,
  scale_min INTEGER NOT NULL DEFAULT 0,
  scale_max INTEGER NOT NULL DEFAULT 3,
  descriptors JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attempts table
CREATE TABLE public.attempts (
  attempt_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(skill_id) ON DELETE CASCADE,
  video_url TEXT,
  notes TEXT,
  ratings JSONB DEFAULT '{}',
  auto_metrics JSONB DEFAULT '{}',
  overall_score DECIMAL(3,2),
  ai_feedback TEXT,
  age INTEGER,
  quick_tags TEXT[] DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delete_video_after_feedback BOOLEAN DEFAULT false
);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('pe-videos', 'pe-videos', false);

-- Enable RLS on all tables (but with permissive policies since no auth)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (no auth required)
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to skills" ON public.skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rubrics" ON public.rubrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attempts" ON public.attempts FOR ALL USING (true) WITH CHECK (true);

-- Storage policies for video uploads
CREATE POLICY "Allow all access to pe-videos" ON storage.objects FOR ALL USING (bucket_id = 'pe-videos') WITH CHECK (bucket_id = 'pe-videos');

-- Insert some default skills
INSERT INTO public.skills (name, cues, success_criteria) VALUES 
  ('Basketball Shooting', ARRAY['Square stance', 'Follow through', 'Arc on shot', 'Consistent release'], ARRAY['Ball goes through hoop', 'Proper shooting form', 'Consistent arc']),
  ('Football Passing', ARRAY['Step into throw', 'Spiral release', 'Lead the receiver', 'Follow through'], ARRAY['Accurate placement', 'Proper spiral', 'Appropriate velocity']),
  ('Soccer Dribbling', ARRAY['Close ball control', 'Use both feet', 'Keep head up', 'Change of pace'], ARRAY['Maintains possession', 'Beats defender', 'Controlled touches']);

-- Insert default rubrics for the skills
INSERT INTO public.rubrics (skill_id, criteria, descriptors) 
SELECT skill_id, 
  ARRAY['Technique', 'Execution', 'Consistency', 'Decision Making'],
  '{"0": "Needs significant improvement", "1": "Developing", "2": "Proficient", "3": "Advanced"}'::jsonb
FROM public.skills;