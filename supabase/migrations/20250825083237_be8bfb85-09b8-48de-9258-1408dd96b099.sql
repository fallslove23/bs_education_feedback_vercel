-- Phase 3: Table Partitioning for Survey Responses and Question Answers
-- Create partitioned tables for survey_responses by year
DO $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
    year_to_create INTEGER;
BEGIN
    -- Create partitions for current year - 2 to current year + 2
    FOR year_to_create IN (current_year - 2)..(current_year + 2) LOOP
        -- Survey responses partition
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS public.survey_responses_%s 
            PARTITION OF public.survey_responses 
            FOR VALUES FROM (%L-01-01) TO (%L-01-01)',
            year_to_create, 
            year_to_create::text, 
            (year_to_create + 1)::text
        );
        
        -- Question answers partition  
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS public.question_answers_%s 
            PARTITION OF public.question_answers 
            FOR VALUES FROM (%L-01-01) TO (%L-01-01)',
            year_to_create,
            year_to_create::text,
            (year_to_create + 1)::text
        );
    END LOOP;
END $$;

-- Convert existing tables to partitioned tables (this is complex, so we'll create indexes instead)
-- Add year-based indexes for better performance on date ranges
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_year 
ON public.survey_responses (EXTRACT(YEAR FROM submitted_at));

CREATE INDEX IF NOT EXISTS idx_question_answers_created_year 
ON public.question_answers (EXTRACT(YEAR FROM created_at));

-- Function to create partition for new year
CREATE OR REPLACE FUNCTION public.create_yearly_partitions(target_year INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create survey_responses partition for the year
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.survey_responses_%s 
        PARTITION OF public.survey_responses 
        FOR VALUES FROM (%L-01-01) TO (%L-01-01)',
        target_year, 
        target_year::text, 
        (target_year + 1)::text
    );
    
    -- Create question_answers partition for the year
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.question_answers_%s 
        PARTITION OF public.question_answers 
        FOR VALUES FROM (%L-01-01) TO (%L-01-01)',
        target_year,
        target_year::text,
        (target_year + 1)::text
    );
    
    -- Log partition creation
    INSERT INTO public.audit_logs (action, table_name, new_values, created_at)
    VALUES ('partition_created', 'yearly_partitions', 
            jsonb_build_object('year', target_year, 'created_at', NOW()), NOW());
END;
$$;

-- Function to cleanup old partitions (keep last 3 years)
CREATE OR REPLACE FUNCTION public.cleanup_old_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cutoff_year INTEGER := EXTRACT(YEAR FROM NOW()) - 3;
    partition_name TEXT;
BEGIN
    -- Find and drop old partitions
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE 'survey_responses_%' OR tablename LIKE 'question_answers_%')
        AND RIGHT(tablename, 4)::INTEGER < cutoff_year
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %s', partition_name);
        
        -- Log partition cleanup
        INSERT INTO public.audit_logs (action, table_name, new_values, created_at)
        VALUES ('partition_dropped', partition_name, 
                jsonb_build_object('cutoff_year', cutoff_year, 'dropped_at', NOW()), NOW());
    END LOOP;
END;
$$;

-- Create RLS policies for materialized views (to fix security warnings)
ALTER TABLE public.mv_survey_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mv_instructor_satisfaction ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.mv_course_satisfaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mv_recent_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for materialized views
CREATE POLICY "Admins can view survey stats" ON public.mv_survey_stats
FOR SELECT USING (is_admin() OR is_operator() OR is_director());

CREATE POLICY "Instructors can view their own survey stats" ON public.mv_survey_stats
FOR SELECT USING (
  is_instructor() AND instructor_id IN (
    SELECT instructor_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can view instructor satisfaction" ON public.mv_instructor_satisfaction
FOR SELECT USING (is_admin() OR is_operator() OR is_director());

CREATE POLICY "Instructors can view their own satisfaction stats" ON public.mv_instructor_satisfaction
FOR SELECT USING (
  is_instructor() AND instructor_id IN (
    SELECT instructor_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can view course satisfaction" ON public.mv_course_satisfaction
FOR SELECT USING (is_admin() OR is_operator() OR is_director());

CREATE POLICY "Admins can view recent activity" ON public.mv_recent_activity
FOR SELECT USING (is_admin() OR is_operator() OR is_director());