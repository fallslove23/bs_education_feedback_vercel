-- survey_responses 테이블에 대해 RLS를 완전히 비활성화
-- 설문 응답은 누구나 제출할 수 있어야 하므로 RLS를 끄는 것이 적절합니다
ALTER TABLE public.survey_responses DISABLE ROW LEVEL SECURITY;

-- anon 역할에게 직접 권한 부여
GRANT INSERT ON public.survey_responses TO anon;
GRANT SELECT ON public.survey_responses TO anon;

-- authenticated 역할에게도 권한 부여
GRANT ALL ON public.survey_responses TO authenticated;

-- public 역할에게도 권한 부여 (anon과 authenticated 모두 포함)
GRANT INSERT ON public.survey_responses TO public;

-- question_answers 테이블에도 같은 작업 수행 (설문 답변 저장)
GRANT INSERT ON public.question_answers TO anon;
GRANT INSERT ON public.question_answers TO authenticated; 
GRANT INSERT ON public.question_answers TO public;

-- 기존 RPC 함수도 anon이 사용할 수 있도록 권한 재설정
GRANT EXECUTE ON FUNCTION public.create_survey_response(uuid, uuid, text, boolean, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.save_answers_bulk(jsonb) TO anon;