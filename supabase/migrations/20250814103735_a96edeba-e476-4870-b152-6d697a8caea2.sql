-- First, let's see what policies currently exist and drop them all
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;

-- Drop existing attempts policies
DROP POLICY IF EXISTS "Allow all access to attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can delete their own attempts" ON public.attempts;

-- Create new secure policies for students table
-- These policies require authentication to access student personal data
CREATE POLICY "authenticated_can_view_students" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_can_insert_students" 
ON public.students 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "authenticated_can_update_students" 
ON public.students 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "authenticated_can_delete_students" 
ON public.students 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure policies for attempts table
CREATE POLICY "authenticated_can_view_attempts" 
ON public.attempts 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_can_insert_attempts" 
ON public.attempts 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "authenticated_can_update_attempts" 
ON public.attempts 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "authenticated_can_delete_attempts" 
ON public.attempts 
FOR DELETE 
TO authenticated 
USING (true);