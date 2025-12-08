import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// 과정 필터에서 제외할 과정 목록 (program_id 또는 course_key)
const EXCLUDED_COURSE_KEYS = ['300 점검방법'];

export type CourseOption = {
  value: string;        // program_id
  label: string;        // "2025년 7–10차 · BS Basic"
  course_key: string;
  year: number;
  min_turn: number | null;
  max_turn: number | null;
  survey_count: number;
  session_count: number;
};

export function useCourseOptions(year: number | null) {
  const [options, setOptions] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    
    const fetchOptions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: rpcError } = await (supabase as any).rpc(
          "rpc_analysis_course_options_v3",
          { p_year: year }
        ) as { data: CourseOption[] | null; error: any };
        
        if (!alive) return;
        
        if (rpcError) {
          throw rpcError;
        }
        
        // 제외 목록에 있는 과정 필터링
        const filteredData = (data ?? []).filter(
          option => !EXCLUDED_COURSE_KEYS.includes(option.course_key)
        );
        
        setOptions(filteredData);
      } catch (err) {
        if (!alive) return;
        console.error('Error fetching course options:', err);
        setError(err instanceof Error ? err.message : '과정 목록을 불러오지 못했습니다.');
        setOptions([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };
    
    fetchOptions();
    
    return () => { 
      alive = false; 
    };
  }, [year]);

  return { options, loading, error };
}
