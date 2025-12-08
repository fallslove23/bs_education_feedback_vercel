-- 과정별 통계 데이터를 저장할 테이블 생성
CREATE TABLE public.course_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  course_days INTEGER NOT NULL,
  course_start_date DATE NOT NULL,
  course_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT '완료',
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  cumulative_count INTEGER NOT NULL DEFAULT 0,
  total_satisfaction NUMERIC(3,2) DEFAULT NULL,
  course_satisfaction NUMERIC(3,2) DEFAULT NULL,
  instructor_satisfaction NUMERIC(3,2) DEFAULT NULL,
  operation_satisfaction NUMERIC(3,2) DEFAULT NULL,
  education_hours INTEGER DEFAULT NULL,
  education_days INTEGER DEFAULT NULL,
  course_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS 정책 활성화
ALTER TABLE public.course_statistics ENABLE ROW LEVEL SECURITY;

-- 관리자와 운영자는 모든 통계를 관리할 수 있음
CREATE POLICY "Admins and operators can manage course statistics"
ON public.course_statistics
FOR ALL
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- 인증된 사용자는 통계를 볼 수 있음
CREATE POLICY "Authenticated users can view course statistics"
ON public.course_statistics
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 업데이트 시간 자동 갱신을 위한 트리거
CREATE TRIGGER update_course_statistics_updated_at
  BEFORE UPDATE ON public.course_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_course_statistics_year_round ON public.course_statistics(year, round);
CREATE INDEX idx_course_statistics_dates ON public.course_statistics(course_start_date, course_end_date);

-- 샘플 데이터 삽입 (엑셀 데이터 기반)
INSERT INTO public.course_statistics (
  year, round, course_days, course_start_date, course_end_date,
  status, enrolled_count, cumulative_count, total_satisfaction, course_satisfaction,
  instructor_satisfaction, operation_satisfaction, education_hours, education_days, course_name
) VALUES
  (2024, 1, 23, '2023-12-20', '2024-01-19', '완료', 20, 20, 9.47, 9.5, 9.5, 8.4, 88, 11, '2024년 1차 영업 기본 과정 - 1반'),
  (2024, 1, 23, '2024-01-11', '2024-02-08', '완료', 10, 30, 9.90, 9.91, 9.88, 9.90, 96, 12, '2024년 1차 영업 기본 과정 - 2반'),
  (2024, 2, 23, '2024-02-14', '2024-03-25', '완료', 17, 47, 9.37, 9.6, 9.2, 9.3, 96, 12, '2024년 2차 영업 심화 과정'),
  (2024, 3, 24, '2024-03-25', '2024-04-30', '완료', 20, 67, 9.49, 9.42, 9.35, 9.7, 96, 12, '2024년 3차 영업 실습 과정'),
  (2024, 5, 24, '2024-05-27', '2024-07-02', '완료', 17, 84, 9.55, 9.45, 9.57, 9.63, 96, 12, '2024년 5차 영업 리더십 과정'),
  (2024, 6, 24, '2024-06-18', '2024-07-23', '완료', 16, 100, 9.35, 9.1, 9.25, 9.69, 96, 12, '2024년 6차 영업 코칭 과정'),
  (2024, 7, 24, '2024-07-22', '2024-10-14', '완료', 29, 129, 9.34, 9.35, 9.12, 9.54, 96, 12, '2024년 7차 영업 전략 과정'),
  (2024, 8, 24, '2024-08-27', '2024-12-03', '완료', 27, 156, 9.46, 9.48, 9.4, 9.49, 112, 14, '2024년 8차 영업 혁신 과정'),
  (2024, 9, 24, '2024-09-26', '2025-12-26', '완료', 14, 170, 9.34, 9.28, 9.36, 9.38, 96, 12, '2024년 9차 영업 심화 과정'),
  (2024, 10, 24, '2024-10-30', '2025-01-07', '완료', 24, 194, 9.28, 9.27, 9.3, 9.28, 96, 12, '2024년 10차 영업 역량 과정'),
  (2024, 12, 24, '2024-12-04', '2025-02-18', '완료', 15, 209, 9.35, 9.33, 9.30, 9.42, 96, 12, '2024년 12차 영업 마스터 과정'),
  (2025, 1, 24, '2025-01-09', '2025-03-28', '완료', 14, 223, 9.63, 9.5, 9.51, 9.89, 96, 12, '2025년 1차 영업 기본 과정'),
  (2025, 2, 24, '2025-02-10', '2025-04-25', '완료', 14, 237, 9.19, 9.12, 9.11, 9.35, 96, 12, '2025년 2차 영업 실습 과정'),
  (2025, 3, 24, '2025-03-18', '2025-06-11', '완료', 16, 253, 9.35, 9.44, 9.34, 9.26, 96, 12, '2025년 3차 영업 전략 과정'),
  (2025, 4, 25, '2025-04-28', '2025-07-08', '완료', 18, 271, 9.40, 9.37, 9.28, 9.54, 96, 12, '2025년 4차 영업 리더십 과정'),
  (2025, 6, 25, '2025-06-04', '2025-08-14', '완료', 11, 282, 9.64, 9.63, 9.67, 9.61, 96, 12, '2025년 6차 영업 코칭 과정 - A'),
  (2025, 6, 25, '2025-06-24', '2025-09-02', '진행 중', 18, 300, 9.98, 9.99, 9.96, NULL, 96, 12, '2025년 6차 영업 코칭 과정 - B'),
  (2025, 7, 25, '2025-07-30', '2025-10-17', '진행 예정', 10, 310, NULL, NULL, NULL, NULL, 96, 12, '2025년 7차 영업 혁신 과정'),
  (2025, 9, 25, '2025-09-03', '2025-11-18', '진행 예정', 3, 313, NULL, NULL, NULL, NULL, 96, 12, '2025년 9차 영업 실습 과정'),
  (2025, 8, 25, '2025-08-13', '2025-12-15', '진행 중', 9, 322, NULL, NULL, NULL, NULL, 80, 10, '2025년 8차 영업 프로젝트 과정');