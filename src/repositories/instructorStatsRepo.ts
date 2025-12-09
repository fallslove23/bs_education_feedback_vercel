import { supabase } from '@/integrations/supabase/client';

export type RatingDistribution = Record<number, number>;

export interface QuestionStat {
  questionId: string;
  questionText: string;
  questionType: string;
  satisfactionType: string | null;
  orderIndex: number | null;
  totalAnswers: number;
  average: number | null;
  ratingDistribution: RatingDistribution;
  textAnswers: string[];
}

interface MetricsSet {
  avgOverall: number | null;
  avgCourse: number | null;
  avgInstructor: number | null;
  avgOperation: number | null;
  ratingDistribution: RatingDistribution;
  questionStats: QuestionStat[];
  textResponses: string[];
}

export interface InstructorStatsRecord {
  instructorId: string;
  instructorName: string | null;
  educationYear: number;
  educationRound: number;
  courseName: string | null;
  surveyIds: string[];
  surveyCount: number;
  testSurveyCount: number;
  activeSurveyCount: number;
  testActiveSurveyCount: number;
  responseCount: number;
  testResponseCount: number;
  lastResponseAt: string | null;
  hasTestData: boolean;
  allTestData: boolean;
  textResponseCount: number;
  testTextResponseCount: number;
  real: MetricsSet;
  test: MetricsSet;
}

const SCORE_RANGE = Array.from({ length: 10 }, (_v, index) => index + 1);

function parseDistribution(value: any): RatingDistribution {
  const distribution: RatingDistribution = SCORE_RANGE.reduce((acc, score) => {
    acc[score] = 0;
    return acc;
  }, {} as RatingDistribution);

  if (!value || typeof value !== 'object') {
    return distribution;
  }

  Object.entries(value).forEach(([key, raw]) => {
    const score = Number(key);
    if (!Number.isFinite(score) || !(score in distribution)) return;
    const numericValue = typeof raw === 'number' ? raw : Number(raw);
    distribution[score] = Number.isFinite(numericValue) ? numericValue : 0;
  });

  return distribution;
}

function parseTextArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : item?.answer_text ?? item?.text ?? ''))
      .filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function parseQuestionStats(value: any): QuestionStat[] {
  let items: any[] = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        items = parsed;
      }
    } catch {
      items = [];
    }
  }

  return items.map(item => {
    const questionId = typeof item?.question_id === 'string' ? item.question_id : '';
    const questionText = typeof item?.question_text === 'string' ? item.question_text : '';
    const questionType = typeof item?.question_type === 'string' ? item.question_type : '';
    const satisfactionType = typeof item?.satisfaction_type === 'string' ? item.satisfaction_type : null;

    const orderIndexVal = Number(item?.order_index);
    const orderIndex = (item?.order_index !== null && item?.order_index !== undefined && Number.isFinite(orderIndexVal)) ? orderIndexVal : null;

    const totalAnswersVal = Number(item?.total_answers);
    const totalAnswers = Number.isFinite(totalAnswersVal) ? totalAnswersVal : 0;

    const averageVal = Number(item?.average);
    const average = (item?.average !== null && item?.average !== undefined && Number.isFinite(averageVal)) ? averageVal : null;

    const ratingDistribution = parseDistribution(item?.rating_distribution);
    const textAnswers = parseTextArray(item?.text_answers);

    return {
      questionId,
      questionText,
      questionType,
      satisfactionType,
      orderIndex,
      totalAnswers,
      average,
      ratingDistribution,
      textAnswers,
    } satisfies QuestionStat;
  });
}

function parseMetrics(row: any, prefix: 'real' | 'test'): MetricsSet {
  const avgOverallKey = prefix === 'real' ? 'avg_overall_satisfaction' : 'test_avg_overall_satisfaction';
  const avgCourseKey = prefix === 'real' ? 'avg_course_satisfaction' : 'test_avg_course_satisfaction';
  const avgInstructorKey = prefix === 'real' ? 'avg_instructor_satisfaction' : 'test_avg_instructor_satisfaction';
  const avgOperationKey = prefix === 'real' ? 'avg_operation_satisfaction' : 'test_avg_operation_satisfaction';
  const distributionKey = prefix === 'real' ? 'rating_distribution' : 'test_rating_distribution';
  const questionStatsKey = prefix === 'real' ? 'question_stats' : 'test_question_stats';
  const textResponsesKey = prefix === 'real' ? 'text_responses' : 'test_text_responses';

  return {
    avgOverall: row?.[avgOverallKey] !== null && row?.[avgOverallKey] !== undefined ? Number(row[avgOverallKey]) : null,
    avgCourse: row?.[avgCourseKey] !== null && row?.[avgCourseKey] !== undefined ? Number(row[avgCourseKey]) : null,
    avgInstructor: row?.[avgInstructorKey] !== null && row?.[avgInstructorKey] !== undefined ? Number(row[avgInstructorKey]) : null,
    avgOperation: row?.[avgOperationKey] !== null && row?.[avgOperationKey] !== undefined ? Number(row[avgOperationKey]) : null,
    ratingDistribution: parseDistribution(row?.[distributionKey]),
    questionStats: parseQuestionStats(row?.[questionStatsKey]),
    textResponses: parseTextArray(row?.[textResponsesKey]),
  };
}

function transformRow(row: any): InstructorStatsRecord {
  const surveyIdsRaw = Array.isArray(row?.survey_ids) ? row.survey_ids : [];

  return {
    instructorId: row?.instructor_id ?? '',
    instructorName: row?.instructor_name ?? null,
    educationYear: Number(row?.education_year) || 0,
    educationRound: Number(row?.education_round) || 0,
    courseName: row?.course_name ?? null,
    surveyIds: surveyIdsRaw.filter((id: unknown): id is string => typeof id === 'string'),
    surveyCount: Number(row?.survey_count) || 0,
    testSurveyCount: Number(row?.test_survey_count) || 0,
    activeSurveyCount: Number(row?.active_survey_count) || 0,
    testActiveSurveyCount: Number(row?.test_active_survey_count) || 0,
    responseCount: Number(row?.response_count) || 0,
    testResponseCount: Number(row?.test_response_count) || 0,
    lastResponseAt: row?.last_response_at ?? null,
    hasTestData: Boolean(row?.has_test_data),
    allTestData: Boolean(row?.all_test_data),
    textResponseCount: Number(row?.text_response_count) || 0,
    testTextResponseCount: Number(row?.test_text_response_count) || 0,
    real: parseMetrics(row, 'real'),
    test: parseMetrics(row, 'test'),
  } satisfies InstructorStatsRecord;
}

interface FetchParams {
  instructorId?: string;
}

export const InstructorStatsRepository = {
  async fetchStats(params: FetchParams = {}): Promise<InstructorStatsRecord[]> {
    let query = (supabase as any)
      .from('instructor_survey_stats')
      .select('*')
      .order('education_year', { ascending: false })
      .order('education_round', { ascending: false })
      .order('course_name', { ascending: true });

    if (params.instructorId) {
      query = query.eq('instructor_id', params.instructorId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map(transformRow);
  },
};
