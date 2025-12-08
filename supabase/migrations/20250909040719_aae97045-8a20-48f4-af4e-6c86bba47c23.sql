-- Function to update course statistics based on survey responses
CREATE OR REPLACE FUNCTION update_course_statistics()
RETURNS void AS $$
BEGIN
  -- Update course_statistics table with calculated satisfaction scores
  UPDATE course_statistics 
  SET 
    total_satisfaction = COALESCE(calculated.total_satisfaction, course_statistics.total_satisfaction),
    course_satisfaction = COALESCE(calculated.course_satisfaction, course_statistics.course_satisfaction), 
    instructor_satisfaction = COALESCE(calculated.instructor_satisfaction, course_statistics.instructor_satisfaction),
    operation_satisfaction = COALESCE(calculated.operation_satisfaction, course_statistics.operation_satisfaction),
    updated_at = now()
  FROM (
    SELECT 
      s.education_year as year,
      s.education_round as round,
      s.course_name,
      -- Convert 5-point scale to 10-point scale and calculate averages
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
        AND sq.question_type = 'scale'
        THEN 
          CASE 
            WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
            THEN qa.answer_value::numeric * 2
            ELSE qa.answer_value::numeric 
          END
      END) as total_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
        AND sq.satisfaction_type = 'course' 
        AND sq.question_type = 'scale'
        THEN 
          CASE 
            WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
            THEN qa.answer_value::numeric * 2
            ELSE qa.answer_value::numeric 
          END
      END) as course_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
        AND sq.satisfaction_type = 'instructor' 
        AND sq.question_type = 'scale'
        THEN 
          CASE 
            WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
            THEN qa.answer_value::numeric * 2
            ELSE qa.answer_value::numeric 
          END
      END) as instructor_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
        AND sq.satisfaction_type = 'operation' 
        AND sq.question_type = 'scale'
        THEN 
          CASE 
            WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
            THEN qa.answer_value::numeric * 2
            ELSE qa.answer_value::numeric 
          END
      END) as operation_satisfaction
    FROM surveys s
    INNER JOIN survey_responses sr ON s.id = sr.survey_id
    INNER JOIN question_answers qa ON sr.id = qa.response_id
    INNER JOIN survey_questions sq ON qa.question_id = sq.id
    WHERE s.status IN ('completed', 'active')
      AND s.course_name IS NOT NULL
      AND qa.answer_value IS NOT NULL
      AND qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
    GROUP BY s.education_year, s.education_round, s.course_name
  ) calculated
  WHERE course_statistics.year = calculated.year
    AND course_statistics.round = calculated.round 
    AND course_statistics.course_name = calculated.course_name;

  RAISE NOTICE 'Course statistics updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update statistics when responses are added
CREATE OR REPLACE FUNCTION trigger_update_course_statistics()
RETURNS trigger AS $$
BEGIN
  -- Only update if it's a scale question response
  IF EXISTS (
    SELECT 1 FROM survey_questions sq 
    WHERE sq.id = NEW.question_id 
    AND sq.question_type = 'scale'
  ) THEN
    PERFORM update_course_statistics();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on question_answers insert/update
DROP TRIGGER IF EXISTS auto_update_course_statistics ON question_answers;
CREATE TRIGGER auto_update_course_statistics
  AFTER INSERT OR UPDATE ON question_answers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_course_statistics();

-- Manual execution to update existing data
SELECT update_course_statistics();