import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  year: number | null;
  courseId: string;
  courseTitle: string; // for legacy RPC compatibility
  subjectId: string;
  instructorId: string;
}

interface UseFilterStateOptions {
  defaultYear?: number;
  syncToUrl?: boolean;
}

/**
 * Hook for managing filter state with URL synchronization
 */
export function useFilterState(options: UseFilterStateOptions = {}) {
  const { defaultYear = new Date().getFullYear(), syncToUrl = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL or defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    if (!syncToUrl) {
      return {
        year: defaultYear,
        courseId: '',
        courseTitle: '',
        subjectId: '',
        instructorId: '',
      };
    }

    const yearParam = searchParams.get('year');
    const courseIdParam = searchParams.get('courseId');
    const subjectIdParam = searchParams.get('subjectId');
    const instructorIdParam = searchParams.get('instructorId');

    return {
      year: yearParam ? parseInt(yearParam) : defaultYear,
      courseId: courseIdParam || '',
      courseTitle: '', // will be set when course is selected
      subjectId: subjectIdParam || '',
      instructorId: instructorIdParam || '',
    };
  });

  // Sync filters to URL
  useEffect(() => {
    if (!syncToUrl) return;

    const params = new URLSearchParams();
    
    if (filters.year) {
      params.set('year', filters.year.toString());
    }
    if (filters.courseId) {
      params.set('courseId', filters.courseId);
    }
    if (filters.subjectId) {
      params.set('subjectId', filters.subjectId);
    }
    if (filters.instructorId) {
      params.set('instructorId', filters.instructorId);
    }

    // Preserve other query params
    searchParams.forEach((value, key) => {
      if (!['year', 'courseId', 'subjectId', 'instructorId'].includes(key)) {
        params.set(key, value);
      }
    });

    setSearchParams(params, { replace: true });
  }, [filters, syncToUrl, setSearchParams, searchParams]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
    additionalData?: Partial<FilterState>
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...additionalData,
      // Reset dependent filters
      ...(key === 'courseId' ? { subjectId: '' } : {}),
      ...(key === 'year' ? { courseId: '', courseTitle: '', subjectId: '' } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({
      year: defaultYear,
      courseId: '',
      courseTitle: '',
      subjectId: '',
      instructorId: '',
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters,
  };
}
