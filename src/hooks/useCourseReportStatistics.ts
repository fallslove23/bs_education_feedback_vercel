import { useCallback, useState } from 'react';
import {
  CourseReportFilters,
  CourseReportStatisticsResponse,
} from '@/repositories/courseReportsRepositoryFixed';
import { CourseReportsRepositoryFixed } from '@/repositories/courseReportsRepositoryFixed';

interface UseCourseReportStatisticsResult {
  data: CourseReportStatisticsResponse | null;
  loading: boolean;
  error: string | null;
  fetchStatistics: (filters: CourseReportFilters) => Promise<CourseReportStatisticsResponse | null>;
}

export function useCourseReportStatistics(): UseCourseReportStatisticsResult {
  const [data, setData] = useState<CourseReportStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async (filters: CourseReportFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await CourseReportsRepositoryFixed.fetchStatistics(filters);
      setData(result);
      return result;
    } catch (err) {
      console.error('Failed to fetch course report statistics', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchStatistics };
}
