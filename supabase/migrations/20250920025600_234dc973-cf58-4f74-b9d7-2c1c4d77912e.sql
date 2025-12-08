-- Create get_survey_detail_stats function
CREATE OR REPLACE FUNCTION public.get_survey_detail_stats(
    p_survey_id uuid,
    p_include_test boolean DEFAULT false,
    p_response_cursor integer DEFAULT 0,
    p_response_limit integer DEFAULT 50,
    p_distribution_cursor integer DEFAULT 0,
    p_distribution_limit integer DEFAULT 20,
    p_text_cursor integer DEFAULT 0,
    p_text_limit integer DEFAULT 50
)
RETURNS TABLE(
    summary jsonb,
    responses jsonb,
    question_distributions jsonb,
    text_answers jsonb,
    response_total_count integer,
    distribution_total_count integer,
    text_total_count integer,
    response_next_cursor integer,
    distribution_next_cursor integer,
    text_next_cursor integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    response_total integer;
    distribution_total integer;
    text_total integer;
    response_next integer;
    distribution_next integer;
    text_next integer;
    summary_data jsonb;
    responses_data jsonb;
    distributions_data jsonb;
    text_data jsonb;
BEGIN
    -- Get total counts
    SELECT COUNT(*) INTO response_total
    FROM public.survey_responses sr
    WHERE sr.survey_id = p_survey_id
      AND (p_include_test = true OR COALESCE(sr.is_test, false) = false);

    SELECT COUNT(DISTINCT sq.id) INTO distribution_total
    FROM public.survey_questions sq
    WHERE sq.survey_id = p_survey_id;

    SELECT COUNT(*) INTO text_total
    FROM public.question_answers qa
    JOIN public.survey_responses sr ON qa.response_id = sr.id
    JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE sr.survey_id = p_survey_id
      AND sq.question_type = 'text'
      AND qa.answer_text IS NOT NULL
      AND qa.answer_text != ''
      AND (p_include_test = true OR COALESCE(sr.is_test, false) = false);

    -- Calculate next cursors
    response_next := CASE WHEN (p_response_cursor + p_response_limit) < response_total 
                         THEN p_response_cursor + p_response_limit 
                         ELSE NULL END;
    distribution_next := CASE WHEN (p_distribution_cursor + p_distribution_limit) < distribution_total 
                             THEN p_distribution_cursor + p_distribution_limit 
                             ELSE NULL END;
    text_next := CASE WHEN (p_text_cursor + p_text_limit) < text_total 
                     THEN p_text_cursor + p_text_limit 
                     ELSE NULL END;

    -- Build summary
    SELECT jsonb_build_object(
        'responseCount', response_total,
        'ratingResponseCount', COUNT(CASE WHEN sq.question_type IN ('rating', 'scale') THEN 1 END),
        'avgOverall', AVG(CASE WHEN sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('rating', 'scale') 
                              THEN (qa.answer_value::text)::numeric END),
        'avgCourse', AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('rating', 'scale') 
                             THEN (qa.answer_value::text)::numeric END),
        'avgInstructor', AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('rating', 'scale') 
                                 THEN (qa.answer_value::text)::numeric END),
        'avgOperation', AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('rating', 'scale') 
                                THEN (qa.answer_value::text)::numeric END),
        'questionCount', distribution_total,
        'textAnswerCount', text_total
    ) INTO summary_data
    FROM public.survey_responses sr
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE sr.survey_id = p_survey_id
      AND (p_include_test = true OR COALESCE(sr.is_test, false) = false);

    -- Get responses
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sr.id,
            'submitted_at', sr.submitted_at,
            'respondent_email', sr.respondent_email,
            'session_id', sr.session_id,
            'is_test', COALESCE(sr.is_test, false)
        ) ORDER BY sr.submitted_at DESC
    ) INTO responses_data
    FROM (
        SELECT sr.*
        FROM public.survey_responses sr
        WHERE sr.survey_id = p_survey_id
          AND (p_include_test = true OR COALESCE(sr.is_test, false) = false)
        ORDER BY sr.submitted_at DESC
        LIMIT p_response_limit OFFSET p_response_cursor
    ) sr;

    -- Get question distributions
    SELECT jsonb_agg(
        jsonb_build_object(
            'question_id', sq.id,
            'question_text', sq.question_text,
            'question_type', sq.question_type,
            'satisfaction_type', sq.satisfaction_type,
            'order_index', sq.order_index,
            'session_id', sq.session_id,
            'total_answers', COALESCE(answer_counts.total, 0),
            'average', CASE WHEN sq.question_type IN ('rating', 'scale') 
                           THEN answer_averages.avg_value 
                           ELSE NULL END,
            'rating_distribution', COALESCE(rating_dist.distribution, '{}'::jsonb),
            'option_counts', COALESCE(option_counts.counts, '[]'::jsonb)
        ) ORDER BY sq.order_index NULLS LAST, sq.id
    ) INTO distributions_data
    FROM (
        SELECT sq.*
        FROM public.survey_questions sq
        WHERE sq.survey_id = p_survey_id
        ORDER BY sq.order_index NULLS LAST, sq.id
        LIMIT p_distribution_limit OFFSET p_distribution_cursor
    ) sq
    LEFT JOIN (
        SELECT qa.question_id, COUNT(*) as total
        FROM public.question_answers qa
        JOIN public.survey_responses sr ON qa.response_id = sr.id
        WHERE sr.survey_id = p_survey_id
          AND (p_include_test = true OR COALESCE(sr.is_test, false) = false)
        GROUP BY qa.question_id
    ) answer_counts ON sq.id = answer_counts.question_id
    LEFT JOIN (
        SELECT qa.question_id, AVG((qa.answer_value::text)::numeric) as avg_value
        FROM public.question_answers qa
        JOIN public.survey_responses sr ON qa.response_id = sr.id
        JOIN public.survey_questions sq2 ON qa.question_id = sq2.id
        WHERE sr.survey_id = p_survey_id
          AND sq2.question_type IN ('rating', 'scale')
          AND qa.answer_value IS NOT NULL
          AND (p_include_test = true OR COALESCE(sr.is_test, false) = false)
        GROUP BY qa.question_id
    ) answer_averages ON sq.id = answer_averages.question_id
    LEFT JOIN (
        SELECT 
            qa.question_id,
            jsonb_object_agg(
                (qa.answer_value::text)::numeric,
                answer_count
            ) as distribution
        FROM (
            SELECT 
                qa.question_id,
                qa.answer_value,
                COUNT(*) as answer_count
            FROM public.question_answers qa
            JOIN public.survey_responses sr ON qa.response_id = sr.id
            JOIN public.survey_questions sq2 ON qa.question_id = sq2.id
            WHERE sr.survey_id = p_survey_id
              AND sq2.question_type IN ('rating', 'scale')
              AND qa.answer_value IS NOT NULL
              AND (p_include_test = true OR COALESCE(sr.is_test, false) = false)
            GROUP BY qa.question_id, qa.answer_value
        ) qa
        GROUP BY qa.question_id
    ) rating_dist ON sq.id = rating_dist.question_id
    LEFT JOIN (
        SELECT 
            qa.question_id,
            jsonb_agg(
                jsonb_build_object('option', qa.answer_text, 'count', answer_count)
                ORDER BY answer_count DESC, qa.answer_text
            ) as counts
        FROM (
            SELECT 
                qa.question_id,
                qa.answer_text,
                COUNT(*) as answer_count
            FROM public.question_answers qa
            JOIN public.survey_responses sr ON qa.response_id = sr.id
            JOIN public.survey_questions sq2 ON qa.question_id = sq2.id
            WHERE sr.survey_id = p_survey_id
              AND sq2.question_type IN ('multiple_choice', 'single_choice')
              AND qa.answer_text IS NOT NULL
              AND qa.answer_text != ''
              AND (p_include_test = true OR COALESCE(sr.is_test, false) = false)
            GROUP BY qa.question_id, qa.answer_text
        ) qa
        GROUP BY qa.question_id
    ) option_counts ON sq.id = option_counts.question_id;

    -- Get text answers
    SELECT jsonb_agg(
        jsonb_build_object(
            'answer_id', qa.id,
            'question_id', qa.question_id,
            'question_text', sq.question_text,
            'satisfaction_type', sq.satisfaction_type,
            'order_index', sq.order_index,
            'session_id', sq.session_id,
            'answer_text', qa.answer_text,
            'created_at', qa.created_at
        ) ORDER BY sq.order_index NULLS LAST, qa.created_at DESC
    ) INTO text_data
    FROM (
        SELECT qa.*, ROW_NUMBER() OVER (ORDER BY sq.order_index NULLS LAST, qa.created_at DESC) as rn
        FROM public.question_answers qa
        JOIN public.survey_responses sr ON qa.response_id = sr.id
        JOIN public.survey_questions sq ON qa.question_id = sq.id
        WHERE sr.survey_id = p_survey_id
          AND sq.question_type = 'text'
          AND qa.answer_text IS NOT NULL
          AND qa.answer_text != ''
          AND (p_include_test = true OR COALESCE(sr.is_test, false) = false)
    ) qa
    JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE qa.rn > p_text_cursor AND qa.rn <= p_text_cursor + p_text_limit;

    RETURN QUERY
    SELECT 
        COALESCE(summary_data, '{}'::jsonb),
        COALESCE(responses_data, '[]'::jsonb),
        COALESCE(distributions_data, '[]'::jsonb),
        COALESCE(text_data, '[]'::jsonb),
        response_total,
        distribution_total,
        text_total,
        response_next,
        distribution_next,
        text_next;
END;
$function$;