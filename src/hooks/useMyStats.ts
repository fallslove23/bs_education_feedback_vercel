import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyStatsData {
  instructor_name: string;
  survey_count: number;
  response_count: number;
}

interface UseMyStatsReturn {
  data: MyStatsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch personal statistics for the current authenticated user
 * Uses get_my_survey_stats() RPC which is SECURITY DEFINER and uses auth.uid()
 */
export function useMyStats(): UseMyStatsReturn {
  const [data, setData] = useState<MyStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('세션 정보를 가져올 수 없습니다.');
      }

      if (!session) {
        throw new Error('로그인이 필요합니다.');
      }

      // Call RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_my_survey_stats' as any);

      if (rpcError) {
        throw new Error('통계 데이터를 불러오는데 실패했습니다.');
      }

      if (!rpcData || !Array.isArray(rpcData) || rpcData.length === 0) {
        setData(null);
      } else {
        setData(rpcData[0] as MyStatsData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
