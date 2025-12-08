import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type SurveyCumulativeRow,
  fetchCumulativeExportData,
  fetchCumulativeFilters,
  fetchCumulativeStats,
  fetchCumulativeSummary,
  type CumulativeSummary,
} from '@/repositories/cumulativeStatsRepo';

interface UseCumulativeSurveyStatsOptions {
  includeTestData: boolean;
  instructorId?: string | null;
  pageSize?: number;
}

interface UseCumulativeSurveyStatsResult {
  data: SurveyCumulativeRow[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  summary: CumulativeSummary;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedYear: number | null;
  setSelectedYear: (value: number | null) => void;
  selectedCourse: string | null;
  setSelectedCourse: (value: string | null) => void;
  availableYears: number[];
  availableCourses: string[];
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  getExportData: () => Promise<SurveyCumulativeRow[]>;
}

const DEFAULT_SUMMARY: CumulativeSummary = {
  totalSurveys: 0,
  totalResponses: 0,
  averageSatisfaction: null,
  participatingInstructors: 0,
  coursesInProgress: 0,
};

export function useCumulativeSurveyStats({
  includeTestData,
  instructorId = null,
  pageSize = 50,
}: UseCumulativeSurveyStatsOptions): UseCumulativeSurveyStatsResult {
  const [data, setData] = useState<SurveyCumulativeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [summary, setSummary] = useState<CumulativeSummary>(DEFAULT_SUMMARY);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourseState] = useState<string | null>(null);

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const coursesByYearRef = useRef<Record<number, string[]>>({});
  const allCoursesRef = useRef<string[]>([]);

  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  const appliedFilters = useMemo(
    () => ({
      searchTerm: debouncedSearch,
      educationYear: selectedYear,
      courseName: selectedCourse,
      instructorId,
    }),
    [debouncedSearch, selectedYear, selectedCourse, instructorId]
  );

  const refreshFilters = useCallback(async () => {
    try {
      const filterData = await fetchCumulativeFilters(includeTestData);
      coursesByYearRef.current = filterData.coursesByYear;
      setAvailableYears(filterData.years);

      allCoursesRef.current = filterData.allCourses;

      const nextCourses = selectedYear
        ? filterData.coursesByYear[selectedYear] ?? []
        : filterData.allCourses;

      setAvailableCourses([...nextCourses]);

      if (selectedYear && !filterData.years.includes(selectedYear)) {
        setSelectedYearState(null);
      }

      if (selectedCourse && !nextCourses.includes(selectedCourse)) {
        setSelectedCourseState(null);
      }
    } catch (err) {
      console.error('Failed to fetch cumulative filter data', err);
    }
  }, [includeTestData, selectedCourse, selectedYear]);

  useEffect(() => {
    refreshFilters();
  }, [refreshFilters]);

  useEffect(() => {
    if (selectedYear) {
      const nextCourses = coursesByYearRef.current[selectedYear] ?? [];
      setAvailableCourses([...nextCourses]);
      if (selectedCourse && !nextCourses.includes(selectedCourse)) {
        setSelectedCourseState(null);
      }
      return;
    }

    const nextCourses = allCoursesRef.current;
    setAvailableCourses([...nextCourses]);
    if (selectedCourse && !nextCourses.includes(selectedCourse)) {
      setSelectedCourseState(null);
    }
  }, [selectedYear, selectedCourse]);

  const loadSummary = useCallback(async () => {
    try {
      const result = await fetchCumulativeSummary({
        searchTerm: appliedFilters.searchTerm,
        educationYear: appliedFilters.educationYear,
        courseName: appliedFilters.courseName,
        instructorId: appliedFilters.instructorId,
        includeTestData,
      });
      setSummary(result || DEFAULT_SUMMARY);
    } catch (err) {
      console.error('Failed to fetch cumulative summary', err);
      setSummary(DEFAULT_SUMMARY);
    }
  }, [appliedFilters, includeTestData]);

    const loadPage = useCallback(
      async (pageNumber: number, append = false) => {
        setError(null);
        if (append) {
          setLoadingMore(true);
        } else {
        setLoading(true);
      }

      try {
        const { data: rows, count } = await fetchCumulativeStats({
          page: pageNumber,
          pageSize,
          includeTestData,
          searchTerm: appliedFilters.searchTerm,
          educationYear: appliedFilters.educationYear,
          courseName: appliedFilters.courseName,
          instructorId: appliedFilters.instructorId,
        });

        const total = count ?? 0;
        setTotalCount(total);

        if (append) {
          setData((prev) => {
            const nextData = [...prev, ...rows];
            const shouldHaveMore = rows.length === pageSize && nextData.length < total;
            setHasMore(shouldHaveMore);
            return nextData;
          });
        } else {
          setData(rows);
          const shouldHaveMore = rows.length === pageSize && rows.length < total;
          setHasMore(shouldHaveMore);
        }

        setPage(pageNumber + 1);
      } catch (err) {
        console.error('Failed to fetch cumulative stats', err);
        setError('데이터를 불러오는데 실패했습니다.');
        if (!append) {
          setData([]);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        }
      },
      [appliedFilters, includeTestData, pageSize]
    );

  const refresh = useCallback(async () => {
    setPage(1);
    await loadPage(1, false);
    await loadSummary();
  }, [loadPage, loadSummary]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await loadPage(page, true);
  }, [hasMore, loadPage, loading, loadingMore, page]);

  const getExportData = useCallback(async () => {
    return fetchCumulativeExportData({
      includeTestData,
      searchTerm: appliedFilters.searchTerm,
      educationYear: appliedFilters.educationYear,
      courseName: appliedFilters.courseName,
      instructorId: appliedFilters.instructorId,
      pageSize: Math.max(pageSize, 200),
    });
  }, [appliedFilters, includeTestData, pageSize]);

  const handleSetYear = useCallback((year: number | null) => {
    setSelectedYearState(year);
  }, []);

  const handleSetCourse = useCallback((course: string | null) => {
    setSelectedCourseState(course);
  }, []);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    summary,
    searchTerm,
    setSearchTerm,
    selectedYear,
    setSelectedYear: handleSetYear,
    selectedCourse,
    setSelectedCourse: handleSetCourse,
    availableYears,
    availableCourses,
    refresh,
    loadMore,
    getExportData,
  };
}
