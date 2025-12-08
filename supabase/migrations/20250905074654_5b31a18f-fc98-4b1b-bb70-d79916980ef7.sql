-- Fix course_statistics table data where course_name and status columns are swapped
UPDATE course_statistics 
SET 
  course_name = CASE 
    WHEN course_name IN ('완료', '진행 중', '진행 예정', '취소') THEN 
      CASE round
        WHEN 1 THEN 'BS Basic'
        WHEN 2 THEN 'BS Advanced'
        WHEN 3 THEN 'BS Basic'
        WHEN 4 THEN 'BS Advanced'
        WHEN 6 THEN 'BS Basic'
        WHEN 7 THEN 'BS Advanced'
        WHEN 8 THEN 'BS Basic'
        WHEN 9 THEN 'BS Advanced'
        ELSE '영업 집체'
      END
    ELSE course_name
  END,
  status = CASE 
    WHEN course_name IN ('완료', '진행 중', '진행 예정', '취소') THEN course_name
    ELSE status
  END
WHERE course_name IN ('완료', '진행 중', '진행 예정', '취소');