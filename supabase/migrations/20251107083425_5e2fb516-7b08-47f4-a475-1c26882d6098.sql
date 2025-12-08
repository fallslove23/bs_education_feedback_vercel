-- Create RPC function to clean up empty survey responses

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
  
  -- Get statistics by survey
  SELECT jsonb_agg(
    jsonb_build_object(
      'survey_id', s.id,
      'survey_title', s.title,
      'remaining_responses', COUNT(DISTINCT sr.id)
    )
  ) INTO survey_stats
  FROM public.surveys s
  LEFT JOIN public.survey_responses sr ON sr.survey_id = s.id
  WHERE s.id = ANY(p_survey_ids)
  GROUP BY s.id, s.title;
  
  RETURN jsonb_build_object(
    'deleted_count', deleted_count,
    'survey_stats', survey_stats
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_empty_survey_responses(uuid[]) TO authenticated, anon;