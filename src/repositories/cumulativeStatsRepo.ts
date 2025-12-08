import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type NumericLike = number | string | null;

interface RawSurveyCumulativeRow {
  survey_id: string;
  title: string | null;
  education_year: NumericLike;
  education_round: NumericLike;
  course_name: string | null;
  status: string | null;
  expected_participants: NumericLike;
  created_at: string | null;
  last_response_at: string | null;
  survey_is_test: boolean | null;
  instructor_names: string[] | null;
  instructor_names_text: string | null;
  instructor_count: NumericLike;
  total_response_count: NumericLike;
  real_response_count: NumericLike;
  test_response_count: NumericLike;
  avg_satisfaction_total: NumericLike;
  avg_satisfaction_real: NumericLike;
  avg_satisfaction_test: NumericLike;
  avg_course_satisfaction_total: NumericLike;
  avg_course_satisfaction_real: NumericLike;
  avg_course_satisfaction_test: NumericLike;
  avg_instructor_satisfaction_total: NumericLike;
  avg_instructor_satisfaction_real: NumericLike;
  avg_instructor_satisfaction_test: NumericLike;
  avg_operation_satisfaction_total: NumericLike;
  avg_operation_satisfaction_real: NumericLike;
  avg_operation_satisfaction_test: NumericLike;
  weighted_satisfaction_total: NumericLike;
  weighted_satisfaction_real: NumericLike;
  weighted_satisfaction_test: NumericLike;
}

export interface SurveyCumulativeRow {
  id: string;
  survey_id: string;
  title: string | null;
  education_year: number | null;
  education_round: number | null;
  course_name: string | null;
  status: string | null;
  expected_participants: number | null;
  created_at: string | null;
  last_response_at: string | null;
  survey_is_test: boolean | null;
  instructor_names: string[];
  instructor_names_text: string | null;
  instructor_count: number | null;
  total_response_count: number | null;
  real_response_count: number | null;
  test_response_count: number | null;
  avg_satisfaction_total: number | null;
  avg_satisfaction_real: number | null;
  avg_satisfaction_test: number | null;
  avg_course_satisfaction_total: number | null;
  avg_course_satisfaction_real: number | null;
  avg_course_satisfaction_test: number | null;
  avg_instructor_satisfaction_total: number | null;
  avg_instructor_satisfaction_real: number | null;
  avg_instructor_satisfaction_test: number | null;
  avg_operation_satisfaction_total: number | null;
  avg_operation_satisfaction_real: number | null;
  avg_operation_satisfaction_test: number | null;
  weighted_satisfaction_total: number | null;
  weighted_satisfaction_real: number | null;
  weighted_satisfaction_test: number | null;
}

const parseNullableNumber = (value: NumericLike): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Add comprehensive NaN and infinity checks
    return Number.isFinite(value) && !Number.isNaN(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
    
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : null;
  }

  return null;
};

const parseNullableBoolean = (value: boolean | string | null | undefined): boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return null;
};

const normalizeSurveyRow = (row: RawSurveyCumulativeRow): SurveyCumulativeRow => ({
  id: row.survey_id,
  survey_id: row.survey_id,
  title: row.title ?? null,
  education_year: parseNullableNumber(row.education_year),
  education_round: parseNullableNumber(row.education_round),
  course_name: row.course_name ?? null,
  status: row.status ?? null,
  expected_participants: parseNullableNumber(row.expected_participants),
  created_at: row.created_at ?? null,
  last_response_at: row.last_response_at ?? null,
  survey_is_test: parseNullableBoolean(row.survey_is_test),
  instructor_names: Array.isArray(row.instructor_names)
    ? row.instructor_names.filter((name): name is string => typeof name === 'string')
    : [],
  instructor_names_text: row.instructor_names_text ?? null,
  instructor_count: parseNullableNumber(row.instructor_count),
  total_response_count: parseNullableNumber(row.total_response_count),
  real_response_count: parseNullableNumber(row.real_response_count),
  test_response_count: parseNullableNumber(row.test_response_count),
  avg_satisfaction_total: parseNullableNumber(row.avg_satisfaction_total),
  avg_satisfaction_real: parseNullableNumber(row.avg_satisfaction_real),
  avg_satisfaction_test: parseNullableNumber(row.avg_satisfaction_test),
  avg_course_satisfaction_total: parseNullableNumber(row.avg_course_satisfaction_total),
  avg_course_satisfaction_real: parseNullableNumber(row.avg_course_satisfaction_real),
  avg_course_satisfaction_test: parseNullableNumber(row.avg_course_satisfaction_test),
  avg_instructor_satisfaction_total: parseNullableNumber(row.avg_instructor_satisfaction_total),
  avg_instructor_satisfaction_real: parseNullableNumber(row.avg_instructor_satisfaction_real),
  avg_instructor_satisfaction_test: parseNullableNumber(row.avg_instructor_satisfaction_test),
  avg_operation_satisfaction_total: parseNullableNumber(row.avg_operation_satisfaction_total),
  avg_operation_satisfaction_real: parseNullableNumber(row.avg_operation_satisfaction_real),
  avg_operation_satisfaction_test: parseNullableNumber(row.avg_operation_satisfaction_test),
  weighted_satisfaction_total: parseNullableNumber(row.weighted_satisfaction_total),
  weighted_satisfaction_real: parseNullableNumber(row.weighted_satisfaction_real),
  weighted_satisfaction_test: parseNullableNumber(row.weighted_satisfaction_test),
});

export interface CumulativeStatsQuery {
  page: number;
  pageSize: number;
  searchTerm?: string | null;
  educationYear?: number | null;
  courseName?: string | null;
  instructorId?: string | null;
  includeTestData: boolean;
}

export interface CumulativeStatsResult {
  data: SurveyCumulativeRow[];
  count: number;
}

export interface CumulativeSummary {
  totalSurveys: number;
  totalResponses: number;
  averageSatisfaction: number | null;
  participatingInstructors: number;
  coursesInProgress: number;
}

export interface CumulativeFilterResult {
  years: number[];
  allCourses: string[];
  coursesByYear: Record<number, string[]>;
}

export async function fetchCumulativeStats({
  page,
  pageSize,
  searchTerm,
  educationYear,
  courseName,
  instructorId,
  includeTestData,
}: CumulativeStatsQuery): Promise<CumulativeStatsResult> {
  try {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    // If instructor filter is set, first get survey IDs for that instructor
    let instructorSurveyIds: string[] | null = null;
    if (instructorId) {
      const { data: instructorSurveys, error: instructorError } = await supabase
        .from('survey_instructors')
        .select('survey_id')
        .eq('instructor_id', instructorId);
      
      if (instructorError) {
        console.error('Error fetching instructor surveys:', instructorError);
        return { data: [], count: 0 };
      }
      
      instructorSurveyIds = instructorSurveys?.map(s => s.survey_id) ?? [];
      
      // If no surveys found for instructor, return empty result
      if (instructorSurveyIds.length === 0) {
        return { data: [], count: 0 };
      }
    }

  // Query directly from survey_cumulative_stats to avoid FK join issues
  let query = supabase
    .from('survey_cumulative_stats')
    .select(
      `
        survey_id,
        title,
        education_year,
        education_round,
        course_name,
        status,
        expected_participants,
        created_at,
        last_response_at,
        survey_is_test,
        instructor_names,
        instructor_names_text,
        instructor_count,
        total_response_count,
        real_response_count,
        test_response_count,
        avg_satisfaction_total,
        avg_satisfaction_real,
        avg_satisfaction_test,
        avg_course_satisfaction_total,
        avg_course_satisfaction_real,
        avg_course_satisfaction_test,
        avg_instructor_satisfaction_total,
        avg_instructor_satisfaction_real,
        avg_instructor_satisfaction_test,
        avg_operation_satisfaction_total,
        avg_operation_satisfaction_real,
        avg_operation_satisfaction_test,
        weighted_satisfaction_total,
        weighted_satisfaction_real,
        weighted_satisfaction_test
      `,
      { count: 'exact' }
    )
    .or('status.in.(completed,active),status.is.null')
    .order('education_year', { ascending: false })
    .order('education_round', { ascending: false })
    .order('title', { ascending: true });

  // Apply filters
  if (instructorSurveyIds) {
    query = query.in('survey_id', instructorSurveyIds);
  }
  
  if (!includeTestData) {
    query = query.or('survey_is_test.eq.false,survey_is_test.is.null');
  }

  if (educationYear !== null && educationYear !== undefined) {
    query = query.eq('education_year', educationYear);
  }

  if (courseName !== null && courseName !== undefined) {
    query = query.eq('course_name', courseName);
  }

  if (searchTerm && searchTerm.trim()) {
    const like = `%${searchTerm.trim()}%`;
    query = query.or(
      [
        `title.ilike.${like}`,
        `course_name.ilike.${like}`,
        `instructor_names_text.ilike.${like}`,
      ].join(',')
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const transformedData = (data ?? []).reduce<SurveyCumulativeRow[]>((acc, statsRow: any) => {
    if (!statsRow?.survey_id) {
      return acc;
    }

    const rawRow: RawSurveyCumulativeRow = {
      survey_id: statsRow.survey_id,
      title: statsRow.title ?? null,
      education_year: statsRow.education_year,
      education_round: statsRow.education_round,
      course_name: statsRow.course_name ?? null,
      status: statsRow.status ?? null,
      expected_participants: statsRow.expected_participants ?? null,
      created_at: statsRow.created_at ?? null,
      last_response_at: statsRow.last_response_at ?? null,
      survey_is_test: statsRow.survey_is_test ?? null,
      instructor_names: statsRow.instructor_names ?? null,
      instructor_names_text: statsRow.instructor_names_text ?? null,
      instructor_count: statsRow.instructor_count ?? null,
      total_response_count: statsRow.total_response_count ?? null,
      real_response_count: statsRow.real_response_count ?? null,
      test_response_count: statsRow.test_response_count ?? null,
      avg_satisfaction_total: statsRow.avg_satisfaction_total ?? null,
      avg_satisfaction_real: statsRow.avg_satisfaction_real ?? null,
      avg_satisfaction_test: statsRow.avg_satisfaction_test ?? null,
      avg_course_satisfaction_total: statsRow.avg_course_satisfaction_total ?? null,
      avg_course_satisfaction_real: statsRow.avg_course_satisfaction_real ?? null,
      avg_course_satisfaction_test: statsRow.avg_course_satisfaction_test ?? null,
      avg_instructor_satisfaction_total: statsRow.avg_instructor_satisfaction_total ?? null,
      avg_instructor_satisfaction_real: statsRow.avg_instructor_satisfaction_real ?? null,
      avg_instructor_satisfaction_test: statsRow.avg_instructor_satisfaction_test ?? null,
      avg_operation_satisfaction_total: statsRow.avg_operation_satisfaction_total ?? null,
      avg_operation_satisfaction_real: statsRow.avg_operation_satisfaction_real ?? null,
      avg_operation_satisfaction_test: statsRow.avg_operation_satisfaction_test ?? null,
      weighted_satisfaction_total: statsRow.weighted_satisfaction_total ?? null,
      weighted_satisfaction_real: statsRow.weighted_satisfaction_real ?? null,
      weighted_satisfaction_test: statsRow.weighted_satisfaction_test ?? null,
    };

    acc.push(normalizeSurveyRow(rawRow));
    return acc;
  }, []);

    return {
      data: transformedData,
      count: count ?? 0,
    };
  } catch (error) {
    console.error('Error in fetchCumulativeStats:', error);
    throw error;
  }
}

export async function fetchCumulativeSummary({
  searchTerm,
  educationYear,
  courseName,
  instructorId,
  includeTestData,
}: Pick<CumulativeStatsQuery, 'searchTerm' | 'educationYear' | 'courseName' | 'instructorId' | 'includeTestData'>): Promise<CumulativeSummary | null> {
  try {
    // Note: instructorId is not passed to RPC yet - requires RPC function update
    // TODO: Add instructor_id parameter to get_survey_cumulative_summary RPC function
    const { data, error } = await supabase.rpc('get_survey_cumulative_summary', {
      search_term: searchTerm ?? null,
      education_year: educationYear ?? null,
      course_name: courseName ?? null,
      include_test_data: includeTestData,
      // instructor_id: instructorId ?? null, // Uncomment when RPC supports this parameter
    });

    if (error) {
      console.error('Error fetching cumulative summary:', error);
      return null;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        totalSurveys: 0,
        totalResponses: 0,
        averageSatisfaction: null,
        participatingInstructors: 0,
        coursesInProgress: 0,
      };
    }

    const summaryData = data[0] as any;
    return {
      totalSurveys: summaryData?.total_surveys || 0,
      totalResponses: summaryData?.total_responses || 0,
      averageSatisfaction: summaryData?.average_satisfaction || null,
      participatingInstructors: summaryData?.participating_instructors || 0,
      coursesInProgress: summaryData?.courses_in_progress || 0,
    };
  } catch (error) {
    console.error('Error in fetchCumulativeSummary:', error);
    return null;
  }
}

export async function fetchCumulativeFilters(includeTestData: boolean): Promise<CumulativeFilterResult> {
  try {
    let query = supabase
      .from('surveys')
      .select('education_year, course_name, is_test')
      .order('education_year', { ascending: false })
      .order('course_name', { ascending: true });

    if (!includeTestData) {
      query = query.or('is_test.eq.false,is_test.is.null');
    }

    const { data, error } = await query;
    if (error) throw error;

    const yearSet = new Set<number>();
    const courseMap = new Map<number, Set<string>>();
    const allCoursesSet = new Set<string>();

    (data ?? []).forEach((row: any) => {
      const year = parseNullableNumber(row.education_year);
      const course = typeof row.course_name === 'string' ? row.course_name : null;

      if (year !== null) {
        yearSet.add(year);
        if (!courseMap.has(year)) {
          courseMap.set(year, new Set<string>());
        }

        if (course) {
          courseMap.get(year)?.add(course);
        }
      }

      if (course) {
        allCoursesSet.add(course);
      }
    });

    const coursesByYear: Record<number, string[]> = {};
    courseMap.forEach((courses, year) => {
      coursesByYear[year] = Array.from(courses).sort((a, b) => a.localeCompare(b));
    });

    return {
      years: Array.from(yearSet).sort((a, b) => b - a),
      allCourses: Array.from(allCoursesSet).sort((a, b) => a.localeCompare(b)),
      coursesByYear,
    };
  } catch (error) {
    console.error('Error in fetchCumulativeFilters:', error);
    return {
      years: [],
      allCourses: [],
      coursesByYear: {},
    };
  }
}

export async function fetchCumulativeExportData(
  params: Omit<CumulativeStatsQuery, 'page' | 'pageSize'> & { pageSize?: number }
): Promise<SurveyCumulativeRow[]> {
  try {
    const {
      searchTerm,
      educationYear,
      courseName,
      instructorId,
      includeTestData,
      pageSize: requestedPageSize,
    } = params;

    const pageSize = Math.max(50, requestedPageSize ?? 200);
    let page = 1;
    let hasMore = true;
    const results: SurveyCumulativeRow[] = [];

    while (hasMore) {
      const { data, count } = await fetchCumulativeStats({
        page,
        pageSize,
        searchTerm,
        educationYear,
        courseName,
        instructorId: instructorId,
        includeTestData,
      });

      results.push(...data);

      const expectedTotal = count ?? results.length;
      hasMore = results.length < expectedTotal && data.length === pageSize;
      page += 1;

      if (!data.length) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.error('Error in fetchCumulativeExportData:', error);
    return [];
  }
}