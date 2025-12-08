import { useEffect, useMemo, useState } from 'react';

import { InstructorStatsRepository, InstructorStatsRecord } from '@/repositories/instructorStatsRepo';
import {
  aggregateQuestionStats,
  buildCourseBreakdown,
  buildRatingDistribution,
  buildTrendSeries,
  calculateSummaryMetrics,
  getCombinedRecordMetrics,
  normalizeCourseName,
  QuestionInsights,
  RatingBucket,
  SummaryMetrics,
  TrendPoint,
  CourseBreakdownItem,
} from '@/utils/surveyStats';

export type InstructorStatsFilters = {
  year: number | 'all';
  round: number | 'all' | 'latest';
  course: string | 'all';
};

interface UseInstructorStatsOptions {
  instructorId?: string;
  includeTestData: boolean;
  filters: InstructorStatsFilters;
  enabled?: boolean;
}

interface UseInstructorStatsResult {
  loading: boolean;
  error: string | null;
  records: InstructorStatsRecord[];
  filteredRecords: InstructorStatsRecord[];
  availableYears: number[];
  availableRounds: number[];
  availableCourses: string[];
  summary: SummaryMetrics;
  trend: TrendPoint[];
  courseBreakdown: CourseBreakdownItem[];
  ratingDistribution: RatingBucket[];
  questionInsights: QuestionInsights;
  hasData: boolean;
}

function applyFilters(records: InstructorStatsRecord[], filters: InstructorStatsFilters): InstructorStatsRecord[] {
  let filtered = [...records];

  if (filters.year !== 'all') {
    filtered = filtered.filter(record => record.educationYear === filters.year);
  }

  if (filters.course !== 'all') {
    const normalizedCourse = normalizeCourseName(filters.course);
    filtered = filtered.filter(record => normalizeCourseName(record.courseName) === normalizedCourse);
  }

  if (filters.round === 'latest') {
    if (filtered.length === 0) return [];
    const maxYear = Math.max(...filtered.map(record => record.educationYear));
    const yearFiltered = filtered.filter(record => record.educationYear === maxYear);
    const maxRound = Math.max(...yearFiltered.map(record => record.educationRound));
    filtered = yearFiltered.filter(record => record.educationRound === maxRound);
  } else if (filters.round !== 'all') {
    filtered = filtered.filter(record => record.educationRound === filters.round);
  }

  return filtered;
}

export function useInstructorStats(options: UseInstructorStatsOptions): UseInstructorStatsResult {
  const { instructorId, includeTestData, filters, enabled = true } = options;
  const [records, setRecords] = useState<InstructorStatsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRecords([]);
      return;
    }

    if (!instructorId) {
      setRecords([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    InstructorStatsRepository.fetchStats({ instructorId })
      .then(data => {
        if (!active) return;
        setRecords(data);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, instructorId]);

  const displayableRecords = useMemo(() => {
    // Include records even with zero responses to reflect assigned surveys
    return records;
  }, [records]);

  const filteredRecords = useMemo(() => applyFilters(displayableRecords, filters), [displayableRecords, filters]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    displayableRecords.forEach(record => {
      years.add(record.educationYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [displayableRecords]);

  const availableRounds = useMemo(() => {
    let base = displayableRecords;
    if (filters.year !== 'all') {
      base = base.filter(record => record.educationYear === filters.year);
    }
    const rounds = new Set<number>();
    base.forEach(record => {
      rounds.add(record.educationRound);
    });
    return Array.from(rounds).sort((a, b) => a - b);
  }, [displayableRecords, filters.year]);

  const availableCourses = useMemo(() => {
    let base = displayableRecords;
    if (filters.year !== 'all') {
      base = base.filter(record => record.educationYear === filters.year);
    }

    if (filters.round === 'latest') {
      if (base.length > 0) {
        const maxYear = Math.max(...base.map(record => record.educationYear));
        base = base.filter(record => record.educationYear === maxYear);
        const maxRound = Math.max(...base.map(record => record.educationRound));
        base = base.filter(record => record.educationRound === maxRound);
      }
    } else if (filters.round !== 'all') {
      base = base.filter(record => record.educationRound === filters.round);
    }

    const courses = new Set<string>();
    base.forEach(record => {
      const normalized = normalizeCourseName(record.courseName);
      if (normalized) courses.add(normalized);
    });

    return Array.from(courses).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [displayableRecords, filters.year, filters.round]);

  const summary = useMemo(() => calculateSummaryMetrics(filteredRecords, includeTestData), [filteredRecords, includeTestData]);
  const trend = useMemo(() => buildTrendSeries(filteredRecords, includeTestData), [filteredRecords, includeTestData]);
  const courseBreakdown = useMemo(() => buildCourseBreakdown(filteredRecords, includeTestData), [filteredRecords, includeTestData]);
  const ratingDistribution = useMemo(() => buildRatingDistribution(filteredRecords, includeTestData), [filteredRecords, includeTestData]);
  const questionInsights = useMemo(() => aggregateQuestionStats(filteredRecords, includeTestData), [filteredRecords, includeTestData]);

  const hasData = useMemo(() => {
    if (filteredRecords.length === 0) return false;

    const anyResponses = filteredRecords.some(record => {
      const metrics = getCombinedRecordMetrics(record, includeTestData);
      return metrics.responseCount > 0 || metrics.textResponseCount > 0;
    });

    const anyAssigned = filteredRecords.some(record => {
      const surveyTotal = includeTestData
        ? (record.surveyCount + record.testSurveyCount)
        : record.surveyCount;
      const activeTotal = includeTestData
        ? (record.activeSurveyCount + record.testActiveSurveyCount)
        : record.activeSurveyCount;
      return surveyTotal > 0 || activeTotal > 0;
    });

    return anyResponses || anyAssigned;
  }, [filteredRecords, includeTestData]);

  return {
    loading,
    error,
    records,
    filteredRecords,
    availableYears,
    availableRounds,
    availableCourses,
    summary,
    trend,
    courseBreakdown,
    ratingDistribution,
    questionInsights,
    hasData,
  };
}
