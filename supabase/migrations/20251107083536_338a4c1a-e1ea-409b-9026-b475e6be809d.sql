-- Fix aggregate function nesting issue in cleanup function

CREATE OR REPLACE FUNCTION public.cleanup_empty_survey_responses(p_survey_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  survey_stats jsonb;
BEGIN
  -- Delete empty responses
  WITH deleted AS (
    DELETE FROM public.survey_responses
    WHERE id IN (
      SELECT sr.id
      FROM public.survey_responses sr
      LEFT JOIN public.question_answers qa ON qa.response_id = sr.id
      WHERE sr.survey_id = ANY(p_survey_ids)
      GROUP BY sr.id
      HAVING COUNT(qa.id) = 0
    )
    RETURNING survey_id
  )
  SELECT 
    COUNT(*) INTO deleted_count
  FROM deleted;
  
  -- Get statistics by survey using subquery
  WITH survey_counts AS (
    SELECT 
      s.id as survey_id,
      s.title as survey_title,
      COUNT(DISTINCT sr.id) as remaining_responses
    FROM public.surveys s
    LEFT JOIN public.survey_responses sr ON sr.survey_id = s.id
    WHERE s.id = ANY(p_survey_ids)
    GROUP BY s.id, s.title
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'survey_id', survey_id,
      'survey_title', survey_title,
      'remaining_responses', remaining_responses
    )
  ) INTO survey_stats
  FROM survey_counts;
  
  RETURN jsonb_build_object(
    'deleted_count', deleted_count,
    'survey_stats', survey_stats
  );
END;
$$;