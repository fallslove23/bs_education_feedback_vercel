-- 기존 과정명/상태 스왑 문제를 완전히 정리
UPDATE course_statistics 
SET 
  course_name = CASE 
    WHEN course_name IN ('완료', '진행 중', '진행 예정', '취소') THEN 
      CASE round
        WHEN 1 THEN 'BS Basic'
        WHEN 2 THEN 'BS Advanced' 
        WHEN 3 THEN 'BS Basic'
        WHEN 4 THEN 'BS Advanced'
        WHEN 5 THEN 'BS Basic'
        WHEN 6 THEN 'BS Advanced'
        WHEN 7 THEN 'BS Basic'  
        WHEN 8 THEN 'BS Advanced'
        WHEN 9 THEN 'BS Basic'
        WHEN 10 THEN 'BS Advanced'
        ELSE '영업 집체'
      END
    ELSE course_name
  END,
  status = CASE 
    WHEN course_name IN ('완료', '진행 중', '진행 예정', '취소') THEN course_name
    ELSE status
  END
WHERE course_name IN ('완료', '진행 중', '진행 예정', '취소') OR status IN ('BS Basic', 'BS Advanced', '영업 집체');