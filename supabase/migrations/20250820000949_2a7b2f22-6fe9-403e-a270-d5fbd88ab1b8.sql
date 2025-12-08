-- Add additional SELECT access for instructors and privileged roles to view non-active survey content
-- and to support email-based linkage when profiles.instructor_id is not set.

-- 1) survey_questions: allow instructors to view their survey questions regardless of status
CREATE POLICY "Instructors and privileged can view their survey questions"
ON public.survey_questions
FOR SELECT
USING (
  public.is_admin() OR public.is_operator() OR public.is_director() OR (
    public.is_instructor() AND (
      survey_id IN (
        SELECT s.id
        FROM public.surveys s
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE (
          p.instructor_id = s.instructor_id
          OR EXISTS (
            SELECT 1 FROM public.instructors i
            WHERE i.email = p.email AND i.id = s.instructor_id
          )
        )
      )
    )
  )
);

-- 2) survey_sections: allow instructors to view their survey sections regardless of status
CREATE POLICY "Instructors and privileged can view their survey sections"
ON public.survey_sections
FOR SELECT
USING (
  public.is_admin() OR public.is_operator() OR public.is_director() OR (
    public.is_instructor() AND (
      survey_id IN (
        SELECT s.id
        FROM public.surveys s
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE (
          p.instructor_id = s.instructor_id
          OR EXISTS (
            SELECT 1 FROM public.instructors i
            WHERE i.email = p.email AND i.id = s.instructor_id
          )
        )
      )
    )
  )
);

-- 3) surveys: add email-based mapping so instructors can view their surveys even if profiles.instructor_id is null
CREATE POLICY "Instructors can view surveys by email mapping"
ON public.surveys
FOR SELECT
USING (
  public.is_instructor() AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.instructors i ON i.email = p.email
    WHERE p.id = auth.uid() AND i.id = surveys.instructor_id
  )
);

-- 4) survey_responses: allow instructors to view responses for their surveys via instructor_id or email mapping
CREATE POLICY "Instructors and privileged can view responses for their surveys"
ON public.survey_responses
FOR SELECT
USING (
  public.is_admin() OR public.is_operator() OR public.is_director() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.surveys s
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE s.id = survey_responses.survey_id
        AND (
          p.instructor_id = s.instructor_id
          OR EXISTS (
            SELECT 1 FROM public.instructors i
            WHERE i.email = p.email AND i.id = s.instructor_id
          )
        )
    )
  )
);

-- 5) question_answers: allow instructors to view answers for responses to their surveys via instructor_id or email mapping
CREATE POLICY "Instructors and privileged can view answers for their survey responses"
ON public.question_answers
FOR SELECT
USING (
  public.is_admin() OR public.is_operator() OR public.is_director() OR (
    public.is_instructor() AND EXISTS (
      SELECT 1
      FROM public.survey_responses sr
      JOIN public.surveys s ON s.id = sr.survey_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE sr.id = question_answers.response_id
        AND (
          p.instructor_id = s.instructor_id
          OR EXISTS (
            SELECT 1 FROM public.instructors i
            WHERE i.email = p.email AND i.id = s.instructor_id
          )
        )
    )
  )
);

-- 6) survey_analysis_comments: extend view access for instructors via email mapping
CREATE POLICY "Instructors can view comments by email mapping"
ON public.survey_analysis_comments
FOR SELECT
USING (
  public.is_instructor() AND (
    survey_id IN (
      SELECT s.id
      FROM public.surveys s
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE (
        p.instructor_id = s.instructor_id
        OR EXISTS (
          SELECT 1 FROM public.instructors i
          WHERE i.email = p.email AND i.id = s.instructor_id
        )
      )
    )
  )
);
