-- surveys 테이블의 created_by 컬럼에 profiles 테이블과의 외래키 제약조건 추가
ALTER TABLE public.surveys 
ADD CONSTRAINT surveys_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;