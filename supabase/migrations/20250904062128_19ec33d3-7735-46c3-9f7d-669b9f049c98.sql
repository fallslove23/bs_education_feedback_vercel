-- Create survey_sessions table for course sessions within a survey
CREATE TABLE public.survey_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  instructor_id UUID REFERENCES public.instructors(id),
  session_order INTEGER NOT NULL DEFAULT 0,
  session_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add scope column to survey_questions for session-specific or operation-wide questions
ALTER TABLE public.survey_questions ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.survey_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.survey_questions ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('session', 'operation')) DEFAULT 'session';

-- Add attended column to survey_responses to track session attendance
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.survey_sessions(id);
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_sessions_survey_id ON public.survey_sessions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_course_instructor ON public.survey_sessions(course_id, instructor_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_session_id ON public.survey_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_scope ON public.survey_questions(scope);
CREATE INDEX IF NOT EXISTS idx_survey_responses_session_id ON public.survey_responses(session_id);

-- Enable RLS on survey_sessions
ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for survey_sessions
CREATE POLICY "Admins/operators manage sessions" 
ON public.survey_sessions 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "Authenticated users can view sessions" 
ON public.survey_sessions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can view sessions for active surveys" 
ON public.survey_sessions 
FOR SELECT 
USING (survey_id IN (SELECT id FROM active_surveys_v));

-- Create trigger for updated_at
CREATE TRIGGER update_survey_sessions_updated_at
BEFORE UPDATE ON public.survey_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing surveys data to new structure
-- This will create sessions based on existing course selections
INSERT INTO public.survey_sessions (survey_id, course_id, instructor_id, session_order, session_name)
SELECT DISTINCT 
  s.id as survey_id,
  s.course_id,
  s.instructor_id,
  1 as session_order,
  COALESCE(c.title, 'Session 1') as session_name
FROM public.surveys s
LEFT JOIN public.courses c ON s.course_id = c.id
WHERE s.course_id IS NOT NULL AND s.instructor_id IS NOT NULL;

-- Update existing survey_questions to link to sessions
UPDATE public.survey_questions sq
SET session_id = (
  SELECT ss.id 
  FROM public.survey_sessions ss 
  WHERE ss.survey_id = sq.survey_id 
  LIMIT 1
),
scope = 'session'
WHERE sq.satisfaction_type IN ('instructor', 'course');

-- Mark operation-related questions
UPDATE public.survey_questions
SET scope = 'operation'
WHERE satisfaction_type = 'operation' OR satisfaction_type IS NULL;

-- Update existing survey_responses to link to sessions
UPDATE public.survey_responses sr
SET session_id = (
  SELECT ss.id 
  FROM public.survey_sessions ss 
  WHERE ss.survey_id = sr.survey_id 
  LIMIT 1
);

-- Create function to get session statistics
CREATE OR REPLACE FUNCTION public.get_session_statistics(
  session_id_param UUID DEFAULT NULL,
  survey_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  session_id UUID,
  session_name TEXT,
  course_title TEXT,
  instructor_name TEXT,
  total_responses BIGINT,
  attended_responses BIGINT,
  avg_satisfaction NUMERIC,
  response_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id as session_id,
    ss.session_name,
    c.title as course_title,
    i.name as instructor_name,
    COUNT(sr.id) as total_responses,
    COUNT(CASE WHEN sr.attended = true THEN 1 END) as attended_responses,
    AVG(
      CASE 
        WHEN sq.satisfaction_type IN ('instructor', 'course') AND sq.question_type IN ('rating', 'scale') THEN
          CASE 
            WHEN jsonb_typeof(qa.answer_value) = 'number' THEN
              CASE 
                WHEN (qa.answer_value::text)::numeric <= 5 THEN (qa.answer_value::text)::numeric * 2
                ELSE (qa.answer_value::text)::numeric
              END
            ELSE NULL
          END
        ELSE NULL
      END
    ) as avg_satisfaction,
    CASE 
      WHEN COUNT(sr.id) > 0 THEN 
        (COUNT(CASE WHEN sr.attended = true THEN 1 END)::numeric / COUNT(sr.id)::numeric) * 100
      ELSE 0
    END as response_rate
  FROM public.survey_sessions ss
  LEFT JOIN public.courses c ON ss.course_id = c.id
  LEFT JOIN public.instructors i ON ss.instructor_id = i.id
  LEFT JOIN public.survey_responses sr ON ss.id = sr.session_id
  LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
  LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id AND sq.session_id = ss.id
  WHERE 
    (session_id_param IS NULL OR ss.id = session_id_param)
    AND (survey_id_param IS NULL OR ss.survey_id = survey_id_param)
  GROUP BY ss.id, ss.session_name, c.title, i.name
  ORDER BY ss.session_order;
END;
$$;