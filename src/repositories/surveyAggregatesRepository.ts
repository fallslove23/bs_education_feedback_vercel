import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Survey Analysis Row represents the raw response from get_survey_analysis RPC
interface SurveyAnalysisRow {
  survey_info: any;
  response_count: number;
  satisfaction_scores: any;
  feedback_text: any;
}

// Survey aggregate as normalized data structure with consistent types
interface SurveyAggregate {
  survey_id: string;
  title: string;
  description: string | null;
  education_year: number;
  education_round: number;
  course_name: string | null;
  status: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  expected_participants: number | null;
  is_test: boolean | null;
  response_count: number;
  last_response_at: string | null;
  avg_overall_satisfaction: number | null;
  avg_course_satisfaction: number | null;
  avg_instructor_satisfaction: number | null;
  avg_operation_satisfaction: number | null;
  question_count: number;
}

// Survey aggregate summary contains computed totals and averages
interface SurveyAggregateSummary {
  totalSurveys: number;
  totalResponses: number;
  activeSurveys: number;
  completedSurveys: number;
  avgOverall: number | null;
  avgCourse: number | null;
  avgInstructor: number | null;
  avgOperation: number | null;
}

// Filters for fetching survey aggregates
interface SurveyAggregateFilters {
  year?: number | null;
  round?: number | null;
  courseName?: string | null;
  instructorId?: string | null;
  includeTestData: boolean;
  restrictToInstructorId?: string | null;
}

// Combined result of aggregates and summary
interface SurveyAggregateResult {
  aggregates: SurveyAggregate[];
  summary: SurveyAggregateSummary;
}

type SurveyAggregatesViewRow = Database['public']['Views']['survey_aggregates']['Row'];
type SurveyDescriptionRow = Pick<Database['public']['Tables']['surveys']['Row'], 'id' | 'description'>;

export type {
  SurveyAnalysisRow,
  SurveyAggregate,
  SurveyAggregateSummary,
  SurveyAggregateFilters,
  SurveyAggregateResult,
};

export const EMPTY_SURVEY_AGGREGATE_SUMMARY: SurveyAggregateSummary = {
  totalSurveys: 0,
  totalResponses: 0,
  activeSurveys: 0,
  completedSurveys: 0,
  avgOverall: null,
  avgCourse: null,
  avgInstructor: null,
  avgOperation: null,
};

const toNumber = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return defaultValue;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? null : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
};

const toNullableBoolean = (value: unknown): boolean | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return null;
};

const calculateSummary = (aggregates: SurveyAggregate[]): SurveyAggregateSummary => {
  if (aggregates.length === 0) {
    return { ...EMPTY_SURVEY_AGGREGATE_SUMMARY };
  }

  const totalResponses = aggregates.reduce((sum, item) => sum + item.response_count, 0);
  const activeSurveys = aggregates.filter((item) => item.status === 'active').length;
  const completedSurveys = aggregates.filter((item) => item.status === 'completed').length;

  const weightedAverage = (key: keyof Pick<
    SurveyAggregate,
    'avg_overall_satisfaction' | 'avg_course_satisfaction' | 'avg_instructor_satisfaction' | 'avg_operation_satisfaction'
  >) => {
    let numerator = 0;
    let denominator = 0;

    aggregates.forEach((item) => {
      const value = item[key];
      if (value !== null && value !== undefined && !Number.isNaN(value)) {
        const weight = item.response_count > 0 ? item.response_count : 1;
        numerator += value * weight;
        denominator += weight;
      }
    });

    if (denominator === 0) {
      return null;
    }

    return numerator / denominator;
  };

  return {
    totalSurveys: aggregates.length,
    totalResponses,
    activeSurveys,
    completedSurveys,
    avgOverall: weightedAverage('avg_overall_satisfaction'),
    avgCourse: weightedAverage('avg_course_satisfaction'),
    avgInstructor: weightedAverage('avg_instructor_satisfaction'),
    avgOperation: weightedAverage('avg_operation_satisfaction'),
  };
};

export const SurveyAggregatesRepository = {
  async fetchAggregates({
    year = null,
    round = null,
    courseName = null,
    instructorId = null,
    includeTestData,
    restrictToInstructorId = null,
  }: SurveyAggregateFilters): Promise<SurveyAggregateResult> {
    const instructorFilter = restrictToInstructorId ?? instructorId ?? null;

    // When filtering by instructor, include surveys linked via survey_instructors and survey_sessions as well
    let instructorSurveyIds: string[] | null = null;
    if (instructorFilter) {
      try {
        const [
          { data: directSurveys },
          { data: mappedSurveys },
          { data: sessionMapped },
        ] = await Promise.all([
          supabase.from('surveys').select('id').eq('instructor_id', instructorFilter),
          supabase.from('survey_instructors').select('survey_id').eq('instructor_id', instructorFilter),
          supabase.from('survey_sessions').select('survey_id').eq('instructor_id', instructorFilter),
        ]);

        const ids = [
          ...(directSurveys?.map((r: any) => r.id).filter(Boolean) ?? []),
          ...(mappedSurveys?.map((r: any) => r.survey_id).filter(Boolean) ?? []),
          ...(sessionMapped?.map((r: any) => r.survey_id).filter(Boolean) ?? []),
        ];
        instructorSurveyIds = Array.from(new Set(ids));
        if (instructorSurveyIds.length === 0) {
          return { aggregates: [], summary: { ...EMPTY_SURVEY_AGGREGATE_SUMMARY } };
        }
      } catch (e) {
        console.warn('Failed to resolve instructor survey mapping, falling back to direct filter', e);
        instructorSurveyIds = null;
      }
    }

    let query = supabase
      .from('survey_aggregates')
      .select(
        `
        survey_id,
        title,
        education_year,
        education_round,
        course_name,
        status,
        instructor_id,
        instructor_name,
        expected_participants,
        is_test,
        question_count,
        response_count,
        last_response_at,
        avg_overall_satisfaction,
        avg_course_satisfaction,
        avg_instructor_satisfaction,
        avg_operation_satisfaction
      `
      );

    if (year) query = query.eq('education_year', year);
    if (round) query = query.eq('education_round', round);
    if (courseName) query = query.eq('course_name', courseName);
    if (instructorSurveyIds && instructorSurveyIds.length > 0) {
      query = query.in('survey_id', instructorSurveyIds);
    } else if (instructorFilter) {
      // Fallback: keep existing behavior for rows where instructor_id is populated
      query = query.eq('instructor_id', instructorFilter);
    }
    if (!includeTestData) query = query.neq('is_test', true);

    const orderColumn = 'last_response_at';

    const { data, error } = await query.order(orderColumn, {
      ascending: false,
      nullsFirst: false,
    });

    if (error) {
      console.error('Error fetching survey aggregates:', error);
      throw error;
    }

    const aggregatesData = data ?? [];

    const surveyIds = aggregatesData
      .map((item) => item?.survey_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const uniqueSurveyIds = Array.from(new Set(surveyIds));

    const descriptionMap = new Map<string, string | null>();

    if (uniqueSurveyIds.length > 0) {
      const { data: surveyDetails, error: surveyError } = await supabase
        .from('surveys')
        .select('id, description')
        .in('id', uniqueSurveyIds)
        .returns<SurveyDescriptionRow[]>();

      if (surveyError) {
        console.error('Error fetching survey descriptions:', surveyError);
      } else {
        surveyDetails?.forEach((survey) => {
          if (survey.id) {
            descriptionMap.set(survey.id, toNullableString(survey.description));
          }
        });
      }
    }

    const aggregates = aggregatesData
      .map((survey) => {
        const surveyId = typeof survey.survey_id === 'string' ? survey.survey_id : null;

        if (!surveyId) {
          return null;
        }

        return {
          survey_id: surveyId,
          title: toNullableString(survey.title) ?? '제목 없음',
          description: descriptionMap.get(surveyId) ?? null,
          education_year: toNumber(survey.education_year, 0),
          education_round: toNumber(survey.education_round, 0),
          course_name: toNullableString(survey.course_name),
          status: toNullableString(survey.status),
          instructor_id: toNullableString(survey.instructor_id),
          instructor_name: toNullableString(survey.instructor_name),
          expected_participants: toNullableNumber(survey.expected_participants),
          is_test: toNullableBoolean(survey.is_test),
          question_count: toNumber(survey.question_count, 0),
          response_count: toNumber(survey.response_count, 0),
          last_response_at: toNullableString(survey.last_response_at),
          avg_overall_satisfaction: toNullableNumber(survey.avg_overall_satisfaction),
          avg_course_satisfaction: toNullableNumber(survey.avg_course_satisfaction),
          avg_instructor_satisfaction: toNullableNumber(survey.avg_instructor_satisfaction),
          avg_operation_satisfaction: toNullableNumber(survey.avg_operation_satisfaction),
        };
      })
      .filter((aggregate): aggregate is SurveyAggregate => aggregate !== null);

    const summary = calculateSummary(aggregates);

    // get_survey_analysis RPC 함수 수정으로 다시 활성화
    const needsFix = aggregates.filter(
      (a) => a.response_count > 0 &&
        (a.avg_course_satisfaction === null || a.avg_instructor_satisfaction === null || a.avg_operation_satisfaction === null)
    );

    if (needsFix.length > 0) {
      try {
        const fixes = await Promise.all(
          needsFix.map(async (a) => {
            const { data, error } = await supabase.rpc('get_survey_analysis', { survey_id_param: a.survey_id });
            if (error || !data) return null;
            const row = Array.isArray(data) ? data[0] : data;
            const scores = (row as any)?.satisfaction_scores ?? {};
            const patched = { ...a };
            const instr = Number((scores as any).instructor_satisfaction);
            const course = Number((scores as any).course_satisfaction);
            const oper = Number((scores as any).operation_satisfaction);
            if (!Number.isNaN(instr)) patched.avg_instructor_satisfaction = instr;
            if (!Number.isNaN(course)) patched.avg_course_satisfaction = course;
            if (!Number.isNaN(oper)) patched.avg_operation_satisfaction = oper;
            return patched;
          })
        );

        const patchMap = new Map(needsFix.map((a, idx) => [a.survey_id, fixes[idx]]));
        const patchedAggregates = aggregates.map((a) => patchMap.get(a.survey_id) ?? a);
        return {
          aggregates: patchedAggregates,
          summary: calculateSummary(patchedAggregates),
        };
      } catch (e) {
        console.warn('Fallback aggregation patch failed:', e);
      }
    }
    return {
      aggregates,
      summary,
    };
  },
};

export default SurveyAggregatesRepository;