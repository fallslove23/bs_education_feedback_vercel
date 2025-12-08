
-- surveys 테이블에 INSERT, UPDATE, DELETE 정책 추가

-- INSERT: admin과 operator만 설문 생성 가능
CREATE POLICY "Admin and operators can insert surveys"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

-- UPDATE: admin과 operator만 설문 수정 가능
CREATE POLICY "Admin and operators can update surveys"
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

-- DELETE: admin과 operator만 설문 삭제 가능
CREATE POLICY "Admin and operators can delete surveys"
ON public.surveys
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

-- survey_questions 테이블 정책 추가
CREATE POLICY "Admin and operators can insert questions"
ON public.survey_questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

CREATE POLICY "Admin and operators can update questions"
ON public.survey_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

CREATE POLICY "Admin and operators can delete questions"
ON public.survey_questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

-- survey_sections 테이블 정책 추가
CREATE POLICY "Admin and operators can insert sections"
ON public.survey_sections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

CREATE POLICY "Admin and operators can update sections"
ON public.survey_sections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

CREATE POLICY "Admin and operators can delete sections"
ON public.survey_sections
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

-- survey_instructors 테이블 INSERT 정책 (이미 ALL 정책이 있지만 명시적으로 추가)
DROP POLICY IF EXISTS "Admin can manage survey instructors" ON public.survey_instructors;

CREATE POLICY "Admin and operators can insert survey instructors"
ON public.survey_instructors
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

CREATE POLICY "Admin and operators can update survey instructors"
ON public.survey_instructors
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);

CREATE POLICY "Admin and operators can delete survey instructors"
ON public.survey_instructors
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operator')
  )
);
