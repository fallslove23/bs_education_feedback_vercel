import { supabase } from '@/integrations/supabase/client';

type NullableNumber = number | null;

export type RatingDistribution = Record<number, number>;

export interface OptionCount {
  option: string;
  count: number;
}

export interface SurveyDetailResponse {
  id: string;
  submittedAt: string | null;
  respondentEmail: string | null;
  sessionId: string | null;
  isTest: boolean;
}

export interface SurveyQuestionDistribution {
  questionId: string;
  questionText: string;
  questionType: string;
  satisfactionType: string | null;
  orderIndex: number | null;
  sessionId: string | null;
  sectionId: string | null;
  totalAnswers: number;
  average: NullableNumber;
  ratingDistribution: RatingDistribution;
  optionCounts: OptionCount[];
}

export interface SurveyTextAnswer {
  answerId: string;
  questionId: string;
  questionText: string;
  satisfactionType: string | null;
  orderIndex: number | null;
  sessionId: string | null;
  sectionId: string | null;
  answerText: string;
  createdAt: string | null;
}

export interface SurveyDetailSummary {
  responseCount: number;
  ratingResponseCount: number;
  avgOverall: NullableNumber;
  avgCourse: NullableNumber;
  avgInstructor: NullableNumber;
  avgOperation: NullableNumber;
  questionCount: number;
  textAnswerCount: number;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: number | null;
  totalCount: number;
}

export interface SurveyDetailStatsResult {
  summary: SurveyDetailSummary;
  responses: PagedResult<SurveyDetailResponse>;
  distributions: PagedResult<SurveyQuestionDistribution>;
  textAnswers: PagedResult<SurveyTextAnswer>;
}

export interface FetchSurveyDetailParams {
  surveyId: string;
  includeTestData?: boolean;
  responseCursor?: number | null;
  responseLimit?: number;
  distributionCursor?: number | null;
  distributionLimit?: number;
  textCursor?: number | null;
  textLimit?: number;
}

const SCORE_RANGE = Array.from({ length: 10 }, (_value, index) => index + 1);

export const SURVEY_DETAIL_DEFAULTS = {
  responseLimit: 9999,
  distributionLimit: 9999,
  textLimit: 9999,
} as const;

function toNumber(value: unknown): NullableNumber {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toInteger(value: unknown): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return Math.trunc(numeric);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === 't' || normalized === '1';
  }
  return false;
}

function parseResponses(value: unknown): SurveyDetailResponse[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const id = typeof (item as any).id === 'string' ? (item as any).id : '';
      if (!id) return null;

      return {
        id,
        submittedAt: typeof (item as any).submitted_at === 'string' ? (item as any).submitted_at : null,
        respondentEmail: typeof (item as any).respondent_email === 'string' ? (item as any).respondent_email : null,
        sessionId: typeof (item as any).session_id === 'string' ? (item as any).session_id : null,
        isTest: toBoolean((item as any).is_test),
      } satisfies SurveyDetailResponse;
    })
    .filter((item): item is SurveyDetailResponse => item !== null);
}

function parseDistribution(value: unknown): RatingDistribution {
  const distribution: RatingDistribution = SCORE_RANGE.reduce((acc, score) => {
    acc[score] = 0;
    return acc;
  }, {} as RatingDistribution);

  if (!value || typeof value !== 'object') {
    return distribution;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const score = Number(key);
    if (!Number.isFinite(score) || !(score in distribution)) return;

    const numeric = toNumber(raw);
    distribution[score as keyof RatingDistribution] = numeric !== null ? numeric : 0;
  });

  return distribution;
}

function parseOptionCounts(value: unknown): OptionCount[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const optionRaw = (item as any).option;
      const option = typeof optionRaw === 'string' ? optionRaw : optionRaw != null ? String(optionRaw) : '';
      if (!option) return null;

      const count = toInteger((item as any).count) ?? 0;
      return { option, count } satisfies OptionCount;
    })
    .filter((item): item is OptionCount => item !== null)
    .sort((a, b) => b.count - a.count || a.option.localeCompare(b.option));
}

function parseDistributions(value: unknown): SurveyQuestionDistribution[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const questionId = typeof (item as any).question_id === 'string' ? (item as any).question_id : '';
      if (!questionId) return null;

      return {
        questionId,
        questionText: typeof (item as any).question_text === 'string' ? (item as any).question_text : '',
        questionType: typeof (item as any).question_type === 'string' ? (item as any).question_type : '',
        satisfactionType: typeof (item as any).satisfaction_type === 'string' ? (item as any).satisfaction_type : null,
        orderIndex: toInteger((item as any).order_index),
        sessionId: typeof (item as any).session_id === 'string' ? (item as any).session_id : null,
        sectionId: typeof (item as any).section_id === 'string' ? (item as any).section_id : null,
        totalAnswers: toInteger((item as any).total_answers) ?? 0,
        average: toNumber((item as any).average),
        ratingDistribution: parseDistribution((item as any).rating_distribution),
        optionCounts: parseOptionCounts((item as any).option_counts),
      } satisfies SurveyQuestionDistribution;
    })
    .filter((item): item is SurveyQuestionDistribution => item !== null)
    .sort((a, b) => {
      if (a.orderIndex === null && b.orderIndex === null) return a.questionText.localeCompare(b.questionText);
      if (a.orderIndex === null) return 1;
      if (b.orderIndex === null) return -1;
      return a.orderIndex - b.orderIndex;
    });
}

function parseTextAnswers(value: unknown): SurveyTextAnswer[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const answerId = typeof (item as any).answer_id === 'string' ? (item as any).answer_id : '';
      const questionId = typeof (item as any).question_id === 'string' ? (item as any).question_id : '';
      const answerText = typeof (item as any).answer_text === 'string' ? (item as any).answer_text : '';

      if (!answerId || !questionId || !answerText) return null;

      return {
        answerId,
        questionId,
        questionText: typeof (item as any).question_text === 'string' ? (item as any).question_text : '',
        satisfactionType: typeof (item as any).satisfaction_type === 'string' ? (item as any).satisfaction_type : null,
        orderIndex: toInteger((item as any).order_index),
        sessionId: typeof (item as any).session_id === 'string' ? (item as any).session_id : null,
        sectionId: typeof (item as any).section_id === 'string' ? (item as any).section_id : null,
        answerText,
        createdAt: typeof (item as any).created_at === 'string' ? (item as any).created_at : null,
      } satisfies SurveyTextAnswer;
    })
    .filter((item): item is SurveyTextAnswer => item !== null)
    .sort((a, b) => {
      if (a.orderIndex === null && b.orderIndex === null) return a.answerId.localeCompare(b.answerId);
      if (a.orderIndex === null) return 1;
      if (b.orderIndex === null) return -1;
      return a.orderIndex - b.orderIndex;
    });
}

function parseSummary(value: unknown, fallback: {
  responseTotal: number;
  questionTotal: number;
  textTotal: number;
}): SurveyDetailSummary {
  const base: SurveyDetailSummary = {
    responseCount: fallback.responseTotal,
    ratingResponseCount: 0,
    avgOverall: null,
    avgCourse: null,
    avgInstructor: null,
    avgOperation: null,
    questionCount: fallback.questionTotal,
    textAnswerCount: fallback.textTotal,
  };

  if (!value || typeof value !== 'object') {
    return base;
  }

  const record = value as Record<string, unknown>;

  base.responseCount = toInteger(record.responseCount) ?? fallback.responseTotal;
  base.ratingResponseCount = toInteger(record.ratingResponseCount) ?? 0;
  base.avgOverall = toNumber(record.avgOverall);
  base.avgCourse = toNumber(record.avgCourse);
  base.avgInstructor = toNumber(record.avgInstructor);
  base.avgOperation = toNumber(record.avgOperation);
  base.questionCount = toInteger(record.questionCount) ?? fallback.questionTotal;
  base.textAnswerCount = toInteger(record.textAnswerCount) ?? fallback.textTotal;

  return base;
}

export const SurveyDetailRepository = {
  async fetchSurveyDetailStats(params: FetchSurveyDetailParams): Promise<SurveyDetailStatsResult> {
    const {
      surveyId,
      includeTestData = false,
      responseCursor = 0,
      responseLimit = SURVEY_DETAIL_DEFAULTS.responseLimit,
      distributionCursor = 0,
      distributionLimit = SURVEY_DETAIL_DEFAULTS.distributionLimit,
      textCursor = 0,
      textLimit = SURVEY_DETAIL_DEFAULTS.textLimit,
    } = params;

    const { data, error } = await supabase.rpc('get_survey_detail_stats', {
      p_survey_id: surveyId,
      p_include_test: includeTestData,
      p_response_cursor: responseCursor,
      p_response_limit: responseLimit,
      p_distribution_cursor: distributionCursor,
      p_distribution_limit: distributionLimit,
      p_text_cursor: textCursor,
      p_text_limit: textLimit,
    });

    if (error) {
      throw error;
    }

    const row = data?.[0] ?? null;

    const responseTotal = toInteger(row?.response_total_count) ?? 0;
    const distributionTotal = toInteger(row?.distribution_total_count) ?? 0;
    const textTotal = toInteger(row?.text_total_count) ?? 0;

    const responses = parseResponses((row as any)?.responses);
    const distributions = parseDistributions((row as any)?.question_distributions);
    const textAnswers = parseTextAnswers((row as any)?.text_answers);

    const summaryRaw = (row as any)?.summary;
    const fallbackQuestionTotal =
      typeof summaryRaw === 'object' && summaryRaw !== null
        ? toInteger((summaryRaw as Record<string, unknown>).questionCount) ?? distributions.length
        : distributions.length;

    const summary = parseSummary(summaryRaw, {
      responseTotal,
      questionTotal: fallbackQuestionTotal,
      textTotal,
    });

    // Fallback: 일부 DB에서 RPC가 응답 목록을 비우는 경우 직접 조회하여 채움
    let responsesItems = responses;
    let responsesNextCursor = toInteger((row as any)?.response_next_cursor);
    if ((responsesItems?.length ?? 0) === 0 && responseTotal > 0) {
      const start = toInteger(params.responseCursor) ?? 0;
      const limit = params.responseLimit ?? SURVEY_DETAIL_DEFAULTS.responseLimit;
      const end = start + limit - 1;
      const { data: rawResponses } = await supabase
        .from('survey_responses')
        .select('id, submitted_at, respondent_email, session_id, is_test')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })
        .range(start, end);
      responsesItems = (rawResponses || []).map((r) => ({
        id: (r as any).id,
        submittedAt: (r as any).submitted_at ?? null,
        respondentEmail: (r as any).respondent_email ?? null,
        sessionId: (r as any).session_id ?? null,
        isTest: toBoolean((r as any).is_test),
      }));
      responsesNextCursor = responsesItems.length >= limit ? start + responsesItems.length : null;
    }

    // Fallback: 분포/텍스트가 비어 있으면 직접 집계하여 생성
    let distributionsItems = distributions;
    let textAnswersItems = textAnswers;

    if ((distributionsItems?.length ?? 0) === 0 || (textAnswersItems?.length ?? 0) === 0) {
      // 필요한 기본 데이터 수집
      const responseIds = (responsesItems || []).map((r) => r.id);
      const [{ data: qRows }, { data: aRows }] = await Promise.all([
        supabase
          .from('survey_questions')
          .select('id, question_text, question_type, satisfaction_type, order_index, session_id, section_id')
          .eq('survey_id', surveyId)
          .order('order_index'),
        responseIds.length > 0
          ? supabase
              .from('question_answers')
              .select('id, question_id, response_id, answer_text, answer_value, created_at')
              .in('response_id', responseIds)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);

      const questionsById = new Map<string, any>();
      (qRows || []).forEach((q: any) => questionsById.set(q.id, q));

      // 분포 집계
      if ((distributionsItems?.length ?? 0) === 0) {
        const byQuestion: Record<string, any[]> = {};
        (aRows || []).forEach((a: any) => {
          if (!byQuestion[a.question_id]) byQuestion[a.question_id] = [];
          byQuestion[a.question_id].push(a);
        });

        const SCORE_KEYS = Array.from({ length: 10 }, (_v, i) => i + 1);

        const built: any[] = [];
        (qRows || []).forEach((q: any) => {
          const answers = byQuestion[q.id] || [];
          const dist: Record<number, number> = {} as any;
          SCORE_KEYS.forEach((k) => (dist[k] = 0));

          let sum = 0;
          let count = 0;
          const optionMap = new Map<string, number>();

          answers.forEach((a: any) => {
            // 숫자 점수 처리
            const raw = (a.answer_value ?? a.answer_text) as any;
            const num = typeof raw === 'number' ? raw : Number(String(raw).trim());
            if (q.question_type === 'rating' || q.question_type === 'scale') {
              if (Number.isFinite(num)) {
                const score = Math.max(1, Math.min(10, Math.trunc(num)));
                dist[score] = (dist[score] || 0) + 1;
                sum += score;
                count += 1;
              }
            } else if (q.question_type?.startsWith('multiple_choice')) {
              const text = (a.answer_text ?? '').toString();
              const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
              parts.forEach((opt) => optionMap.set(opt, (optionMap.get(opt) || 0) + 1));
            }
          });

          // rating/scale 또는 선택형만 분포 아이템 생성
          if ((q.question_type === 'rating' || q.question_type === 'scale') || optionMap.size > 0) {
            built.push({
              questionId: q.id,
              questionText: q.question_text || '',
              questionType: q.question_type || '',
              satisfactionType: q.satisfaction_type ?? null,
              orderIndex: toInteger(q.order_index),
              sessionId: q.session_id ?? null,
              sectionId: q.section_id ?? null,
              totalAnswers: count > 0 ? count : Array.from(optionMap.values()).reduce((t, v) => t + v, 0),
              average: count > 0 ? Number((sum / count).toFixed(2)) : null,
              ratingDistribution: dist,
              optionCounts: Array.from(optionMap.entries()).map(([option, cnt]) => ({ option, count: cnt })),
            });
          }
        });

        distributionsItems = built.sort((a, b) => {
          if (a.orderIndex === null && b.orderIndex === null) return a.questionText.localeCompare(b.questionText);
          if (a.orderIndex === null) return 1;
          if (b.orderIndex === null) return -1;
          return a.orderIndex - b.orderIndex;
        });
      }

      // 텍스트 답변 집계
      if ((textAnswersItems?.length ?? 0) === 0) {
        const textItems: any[] = [];
        (aRows || []).forEach((a: any) => {
          const q = questionsById.get(a.question_id);
          const text = (a.answer_text ?? '').toString().trim();
          if (!q || !text) return;
          if (q.question_type === 'text') {
            textItems.push({
              answerId: a.id,
              questionId: q.id,
              questionText: q.question_text || '',
              satisfactionType: q.satisfaction_type ?? null,
              orderIndex: toInteger(q.order_index),
              sessionId: q.session_id ?? null,
              sectionId: q.section_id ?? null,
              answerText: text,
              createdAt: a.created_at ?? null,
            });
          }
        });
        textAnswersItems = textItems.sort((a, b) => {
          if (a.orderIndex === null && b.orderIndex === null) return a.answerId.localeCompare(b.answerId);
          if (a.orderIndex === null) return 1;
          if (b.orderIndex === null) return -1;
          return a.orderIndex - b.orderIndex;
        });
      }
    }

    return {
      summary,
      responses: {
        items: responsesItems,
        nextCursor: responsesNextCursor,
        totalCount: responseTotal,
      },
      distributions: {
        items: distributionsItems,
        nextCursor: toInteger((row as any)?.distribution_next_cursor),
        totalCount: distributionTotal,
      },
      textAnswers: {
        items: textAnswersItems,
        nextCursor: toInteger((row as any)?.text_next_cursor),
        totalCount: textTotal,
      },
    };
  },
};

export type SurveyDetailRepositoryType = typeof SurveyDetailRepository;
