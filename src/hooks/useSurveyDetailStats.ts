import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SURVEY_DETAIL_DEFAULTS,
  SurveyDetailRepository,
  SurveyDetailResponse,
  SurveyDetailSummary,
  SurveyQuestionDistribution,
  SurveyTextAnswer,
} from '@/repositories/surveyDetailRepository';

interface UseSurveyDetailStatsOptions {
  surveyId?: string;
  includeTestData?: boolean;
  autoFetch?: boolean;
}

interface GroupedTextAnswers {
  questionId: string;
  questionText: string;
  satisfactionType: string | null;
  orderIndex: number | null;
  answers: SurveyTextAnswer[];
}

interface UseSurveyDetailStatsResult {
  summary: SurveyDetailSummary | null;
  responses: SurveyDetailResponse[];
  responsesTotal: number;
  hasMoreResponses: boolean;
  responsesLoading: boolean;
  loadMoreResponses: () => Promise<void>;
  distributions: SurveyQuestionDistribution[];
  distributionsTotal: number;
  hasMoreDistributions: boolean;
  distributionsLoading: boolean;
  loadMoreDistributions: () => Promise<void>;
  textAnswers: SurveyTextAnswer[];
  groupedTextAnswers: GroupedTextAnswers[];
  textAnswersTotal: number;
  hasMoreTextAnswers: boolean;
  textAnswersLoading: boolean;
  loadMoreTextAnswers: () => Promise<void>;
  initialLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSurveyDetailStats(options: UseSurveyDetailStatsOptions): UseSurveyDetailStatsResult {
  const { surveyId, includeTestData = false, autoFetch = true } = options;

  const [summary, setSummary] = useState<SurveyDetailSummary | null>(null);

  const [responses, setResponses] = useState<SurveyDetailResponse[]>([]);
  const [responseCursor, setResponseCursor] = useState<number | null>(null);
  const [responseTotal, setResponseTotal] = useState(0);
  const [responsesLoading, setResponsesLoading] = useState(false);

  const [distributions, setDistributions] = useState<SurveyQuestionDistribution[]>([]);
  const [distributionCursor, setDistributionCursor] = useState<number | null>(null);
  const [distributionTotal, setDistributionTotal] = useState(0);
  const [distributionsLoading, setDistributionsLoading] = useState(false);

  const [textAnswers, setTextAnswers] = useState<SurveyTextAnswer[]>([]);
  const [textCursor, setTextCursor] = useState<number | null>(null);
  const [textTotal, setTextTotal] = useState(0);
  const [textLoading, setTextLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSummary(null);

    setResponses([]);
    setResponseCursor(null);
    setResponseTotal(0);

    setDistributions([]);
    setDistributionCursor(null);
    setDistributionTotal(0);

    setTextAnswers([]);
    setTextCursor(null);
    setTextTotal(0);

    setError(null);
  }, []);

  const fetchInitial = useCallback(async () => {
    if (!surveyId) return;

    setInitialLoading(true);
    setError(null);

    try {
      const result = await SurveyDetailRepository.fetchSurveyDetailStats({
        surveyId,
        includeTestData,
        responseCursor: 0,
        distributionCursor: 0,
        textCursor: 0,
        responseLimit: SURVEY_DETAIL_DEFAULTS.responseLimit,
        distributionLimit: SURVEY_DETAIL_DEFAULTS.distributionLimit,
        textLimit: SURVEY_DETAIL_DEFAULTS.textLimit,
      });

      setSummary(result.summary);

      setResponses(result.responses.items);
      setResponseCursor(result.responses.nextCursor ?? null);
      setResponseTotal(result.responses.totalCount);

      setDistributions(result.distributions.items);
      setDistributionCursor(result.distributions.nextCursor ?? null);
      setDistributionTotal(result.distributions.totalCount);

      setTextAnswers(result.textAnswers.items);
      setTextCursor(result.textAnswers.nextCursor ?? null);
      setTextTotal(result.textAnswers.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setInitialLoading(false);
    }
  }, [includeTestData, surveyId]);

  const loadMoreResponses = useCallback(async () => {
    if (!surveyId) return;
    if (responsesLoading) return;
    const cursor = responseCursor ?? null;
    if (cursor === null) return;

    setResponsesLoading(true);
    setError(null);

    try {
      const result = await SurveyDetailRepository.fetchSurveyDetailStats({
        surveyId,
        includeTestData,
        responseCursor: cursor,
        responseLimit: SURVEY_DETAIL_DEFAULTS.responseLimit,
        distributionLimit: 0,
        textLimit: 0,
      });

      setSummary(result.summary);
      setResponses((prev) => [...prev, ...result.responses.items]);
      setResponseCursor(result.responses.nextCursor ?? null);
      setResponseTotal(result.responses.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : '응답을 불러오는 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setResponsesLoading(false);
    }
  }, [includeTestData, responseCursor, responsesLoading, surveyId]);

  const loadMoreDistributions = useCallback(async () => {
    if (!surveyId) return;
    if (distributionsLoading) return;
    const cursor = distributionCursor ?? null;
    if (cursor === null) return;

    setDistributionsLoading(true);
    setError(null);

    try {
      const result = await SurveyDetailRepository.fetchSurveyDetailStats({
        surveyId,
        includeTestData,
        distributionCursor: cursor,
        distributionLimit: SURVEY_DETAIL_DEFAULTS.distributionLimit,
        responseLimit: 0,
        textLimit: 0,
      });

      setSummary(result.summary);
      setDistributions((prev) => [...prev, ...result.distributions.items]);
      setDistributionCursor(result.distributions.nextCursor ?? null);
      setDistributionTotal(result.distributions.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : '질문 통계를 불러오는 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setDistributionsLoading(false);
    }
  }, [distributionCursor, distributionsLoading, includeTestData, surveyId]);

  const loadMoreTextAnswers = useCallback(async () => {
    if (!surveyId) return;
    if (textLoading) return;
    const cursor = textCursor ?? null;
    if (cursor === null) return;

    setTextLoading(true);
    setError(null);

    try {
      const result = await SurveyDetailRepository.fetchSurveyDetailStats({
        surveyId,
        includeTestData,
        textCursor: cursor,
        textLimit: SURVEY_DETAIL_DEFAULTS.textLimit,
        responseLimit: 0,
        distributionLimit: 0,
      });

      setSummary(result.summary);
      setTextAnswers((prev) => [...prev, ...result.textAnswers.items]);
      setTextCursor(result.textAnswers.nextCursor ?? null);
      setTextTotal(result.textAnswers.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : '텍스트 응답을 불러오는 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setTextLoading(false);
    }
  }, [includeTestData, surveyId, textCursor, textLoading]);

  const refresh = useCallback(async () => {
    resetState();
    await fetchInitial();
  }, [fetchInitial, resetState]);

  useEffect(() => {
    if (!autoFetch) return;
    if (!surveyId) {
      resetState();
      return;
    }

    resetState();
    fetchInitial();
  }, [autoFetch, fetchInitial, includeTestData, resetState, surveyId]);

  const groupedTextAnswers = useMemo<GroupedTextAnswers[]>(() => {
    const map = new Map<string, GroupedTextAnswers>();

    textAnswers.forEach((answer) => {
      const existing = map.get(answer.questionId);
      if (existing) {
        existing.answers.push(answer);
      } else {
        map.set(answer.questionId, {
          questionId: answer.questionId,
          questionText: answer.questionText,
          satisfactionType: answer.satisfactionType,
          orderIndex: answer.orderIndex,
          answers: [answer],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.orderIndex === null && b.orderIndex === null) {
        return a.questionText.localeCompare(b.questionText);
      }
      if (a.orderIndex === null) return 1;
      if (b.orderIndex === null) return -1;
      return a.orderIndex - b.orderIndex;
    });
  }, [textAnswers]);

  return {
    summary,
    responses,
    responsesTotal: responseTotal,
    hasMoreResponses: responseCursor !== null,
    responsesLoading,
    loadMoreResponses,
    distributions,
    distributionsTotal: distributionTotal,
    hasMoreDistributions: distributionCursor !== null,
    distributionsLoading,
    loadMoreDistributions,
    textAnswers,
    groupedTextAnswers,
    textAnswersTotal: textTotal,
    hasMoreTextAnswers: textCursor !== null,
    textAnswersLoading: textLoading,
    loadMoreTextAnswers,
    initialLoading,
    error,
    refresh,
  };
}
