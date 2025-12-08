import { supabase } from '@/integrations/supabase/client';


export interface CourseReportFilters {
  year: number;
  sessionId?: string | null;  // Changed from courseName to sessionId
  round?: number | null;
  instructorId?: string | null;
  includeTestData?: boolean;
}

export interface CourseReportSummary {
  educationYear: number;
  sessionId: string | null;  // Changed from courseName
  sessionTitle: string | null;  // Changed from normalizedCourseName
  programName: string | null;  // Added program name
  educationRound: number | null;
  instructorId: string | null;
  availableRounds: number[];
  totalSurveys: number;
  totalResponses: number;
  avgInstructorSatisfaction: number | null;
  avgCourseSatisfaction: number | null;
  avgOperationSatisfaction: number | null;
  instructorCount: number;
}

export interface CourseTrendPoint {
  educationRound: number | null;
  avgInstructorSatisfaction: number | null;
  avgCourseSatisfaction: number | null;
  avgOperationSatisfaction: number | null;
  responseCount: number;
}

export interface CourseInstructorStat {
  instructorId: string | null;
  instructorName: string;
  surveyCount: number;
  responseCount: number;
  avgSatisfaction: number | null;
}

export interface SessionOption {  // Changed from CourseOption
  sessionId: string;  // Changed from normalizedName
  displayName: string;
  sessionTitle: string;  // Added
  programName: string;  // Added
  turn: number;  // Added turn
}

export interface CourseReportStatisticsResponse {
  summary: CourseReportSummary;
  trend: CourseTrendPoint[];
  instructorStats: CourseInstructorStat[];
  textualResponses: string[];
  availableSessions: SessionOption[];  // Changed from availableCourses
  availableInstructors: { id: string; name: string }[];
}

export const CourseReportsRepositoryFixed = {
  async fetchStatistics(filters: CourseReportFilters): Promise<CourseReportStatisticsResponse | null> {
    // Use sessionId parameter directly
    const sessionIdParam = filters.sessionId ?? null;

    console.log('🔍 Calling get_course_reports_working with:', {
      p_year: filters.year,
      p_session_id: sessionIdParam ?? '',
      p_round: filters.round ?? null,
      p_instructor_id: filters.instructorId ?? '',
      p_include_test: filters.includeTestData ?? false,
    });

    const { data, error } = await supabase.rpc('get_course_reports_working', {
      p_year: filters.year,
      // IMPORTANT: avoid PostgREST overload ambiguity by sending empty string when session is not selected
      // This forces the text signature of the RPC to be chosen; the function already treats '' as NULL
      p_session_id: sessionIdParam ?? '',
      p_round: filters.round ?? null,
      p_instructor_id: filters.instructorId ?? '',
      p_include_test: filters.includeTestData ?? false,
    });

    console.log('📦 RPC Response:', { data, error });

    if (error) {
      console.error('Failed to execute get_course_reports_working RPC', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ No data returned from RPC');
      return null;
    }

    const toNumberOrNull = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return null;
    };

    const toNumberWithDefault = (value: unknown, defaultValue: number): number => {
      const parsed = toNumberOrNull(value);
      return parsed ?? defaultValue;
    };

    const toNumberArray = (value: unknown): number[] => {
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .map((item) => toNumberOrNull(item))
        .filter((item): item is number => item !== null);
    };

    const toStringOrNull = (value: unknown): string | null => {
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value === 'string') {
        return value;
      }
      return String(value);
    };

    const ensureObject = (value: unknown): Record<string, unknown> => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
      return {};
    };

    const ensureArray = (value: unknown): unknown[] => {
      if (Array.isArray(value)) {
        return value;
      }
      return [];
    };

    const rawData = ensureObject(data);
    const rawSummary = ensureObject(rawData.summary);

    const summary: CourseReportSummary = {
      educationYear: toNumberWithDefault(rawSummary.educationYear, filters.year),
      sessionId: toStringOrNull(rawSummary.sessionId),  // Changed
      sessionTitle: toStringOrNull(rawSummary.sessionTitle),  // Changed
      programName: toStringOrNull(rawSummary.programName),  // Added
      educationRound: toNumberOrNull(rawSummary.educationRound),
      instructorId: toStringOrNull(rawSummary.instructorId),
      availableRounds: toNumberArray(ensureArray(rawSummary.availableRounds)),
      totalSurveys: toNumberWithDefault(rawSummary.totalSurveys, 0),
      totalResponses: toNumberWithDefault(rawSummary.totalResponses, 0),
      avgInstructorSatisfaction: toNumberOrNull(rawSummary.avgInstructorSatisfaction),
      avgCourseSatisfaction: toNumberOrNull(rawSummary.avgCourseSatisfaction),
      avgOperationSatisfaction: toNumberOrNull(rawSummary.avgOperationSatisfaction),
      instructorCount: toNumberWithDefault(rawSummary.instructorCount, 0),
    };

    const rawTrend = ensureArray(rawData.trend);
    const trend: CourseTrendPoint[] = rawTrend.map((item) => {
      const point = ensureObject(item);
      return {
        educationRound: toNumberOrNull(point.educationRound),
        avgInstructorSatisfaction: toNumberOrNull(point.avgInstructorSatisfaction),
        avgCourseSatisfaction: toNumberOrNull(point.avgCourseSatisfaction),
        avgOperationSatisfaction: toNumberOrNull(point.avgOperationSatisfaction),
        responseCount: toNumberWithDefault(point.responseCount, 0),
      };
    });

    console.log('📊 Raw data keys:', Object.keys(rawData));
    console.log('📊 instructor_stats in rawData:', rawData.instructor_stats);
    console.log('📊 instructorStats in rawData:', (rawData as any).instructorStats);
    
    const rawInstructorStats = ensureArray(rawData.instructor_stats);
    console.log('📊 Raw instructor stats array:', rawInstructorStats);
    
    const instructorStats: CourseInstructorStat[] = rawInstructorStats.map((item) => {
      const stat = ensureObject(item);
      return {
        instructorId: toStringOrNull(stat.instructorId),
        instructorName: toStringOrNull(stat.instructorName) ?? '강사 정보 없음',
        surveyCount: toNumberWithDefault(stat.surveyCount, 0),
        responseCount: toNumberWithDefault(stat.responseCount, 0),
        avgSatisfaction: toNumberOrNull(stat.avgSatisfaction),
      };
    });
    
    console.log('✅ Mapped instructor stats:', instructorStats);

    const rawTextualResponses = ensureArray(rawData.textual_responses);
    const textualResponses: string[] = rawTextualResponses
      .map((item) => toStringOrNull(item))
      .filter((item): item is string => item !== null);

    const rawAvailableSessions = ensureArray(rawData.available_sessions);  // Changed
    const availableSessions: SessionOption[] = rawAvailableSessions  // Changed
      .map((item) => {
        const session = ensureObject(item);
        const sessionId = toStringOrNull(session.sessionId) ?? '';
        return {
          sessionId,  // Changed
          displayName: toStringOrNull(session.displayName) ?? '',
          sessionTitle: toStringOrNull(session.sessionTitle) ?? '',  // Added
          programName: toStringOrNull(session.programName) ?? '',  // Added
          turn: toNumberWithDefault(session.turn, 0),  // Added
        };
      })
      .filter((session) => session.sessionId.length > 0);

    const rawAvailableInstructors = ensureArray(rawData.available_instructors);
    const availableInstructors = rawAvailableInstructors
      .map((item) => {
        const instructor = ensureObject(item);
        return {
          id: toStringOrNull(instructor.id) ?? '',
          name: toStringOrNull(instructor.name) ?? '',
        };
      })
      .filter((instructor) => instructor.id.length > 0);

    return {
      summary,
      trend,
      instructorStats,
      textualResponses,
      availableSessions,  // Changed from availableCourses
      availableInstructors,
    };
  },
};