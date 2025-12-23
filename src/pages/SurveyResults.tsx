import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as BarIcon, BarChart3, Users, Star, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCourseOptions } from '@/hooks/useCourseOptions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  downloadCSV,
  exportResponsesAsCSV,
  exportSummaryAsCSV,
  generateCSVFilename,
  SurveyResultData,
} from '@/utils/csvExport';
import {
  EMPTY_SURVEY_AGGREGATE_SUMMARY,
  SurveyAggregate,
  SurveyAggregateSummary,
  SurveyAggregatesRepository,
} from '@/repositories/surveyAggregatesRepository';

const RESPONSES_PAGE_SIZE = 20;
const COURSE_KEY_SEPARATOR = '::';

interface ParsedCourseKey {
  year: number | null;
  round: number | null;
  courseName: string | null;
}

const buildCourseKey = (year: number | null, round: number | null, courseName: string | null) => {
  const yearPart = year !== null && year !== undefined ? String(year) : 'null';
  const roundPart = round !== null && round !== undefined ? String(round) : 'null';
  const coursePart = courseName ? encodeURIComponent(courseName) : '';
  return [yearPart, roundPart, coursePart].join(COURSE_KEY_SEPARATOR);
};

const parseCourseKey = (key: string): ParsedCourseKey | null => {
  if (!key || key === 'all') {
    return null;
  }

  const parts = key.split(COURSE_KEY_SEPARATOR);
  if (parts.length !== 3) {
    return null;
  }

  const [yearPart, roundPart, coursePart] = parts;
  const year = yearPart === 'null' || yearPart === '' ? null : Number(yearPart);
  const round = roundPart === 'null' || roundPart === '' ? null : Number(roundPart);
  const courseName = coursePart ? decodeURIComponent(coursePart) : null;

  return {
    year: Number.isNaN(year) ? null : year,
    round: Number.isNaN(round) ? null : round,
    courseName,
  };
};

interface Profile {
  role: string;
  instructor_id: string | null;
}

interface SurveyResponseRow {
  id: string;
  submitted_at: string;
  respondent_email: string | null;
}

interface SurveyQuestionRow {
  id: string;
  question_text: string;
  question_type: string;
  order_index: number;
}

interface QuestionAnswerRow {
  question_id: string;
  response_id: string;
  answer_text: string | null;
  answer_value: any;
}

type DownloadType = 'responses' | 'summary';

type DownloadJob = {
  id: string;
  type: DownloadType;
  status: 'running' | 'completed' | 'error';
  progress: number; // 0 to 1
  message?: string;
  error?: string;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toLocaleString('ko-KR');
};

const formatSatisfaction = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(1);
};

const SurveyResults = () => {
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [allAggregates, setAllAggregates] = useState<SurveyAggregate[]>([]);
  const [aggregates, setAggregates] = useState<SurveyAggregate[]>([]);
  const [aggregatesLoading, setAggregatesLoading] = useState(true);
  const [baseSummary, setBaseSummary] = useState<SurveyAggregateSummary>(EMPTY_SURVEY_AGGREGATE_SUMMARY);
  const [summary, setSummary] = useState<SurveyAggregateSummary>(EMPTY_SURVEY_AGGREGATE_SUMMARY);
  const [hasBaseAggregates, setHasBaseAggregates] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [downloadJob, setDownloadJob] = useState<DownloadJob | null>(null);
  const [allInstructorsList, setAllInstructorsList] = useState<Array<{ id: string; name: string }>>([]);
  const [instructorNamesCache, setInstructorNamesCache] = useState<Map<string, string>>(new Map());
  const [currentInstructorName, setCurrentInstructorName] = useState<string | null>(null);

  /* State for text search filter */
  const [searchTerm, setSearchTerm] = useState('');

  /* ... (search filter effect) ... */

  const filteredAggregates = useMemo(() => {
    if (!searchTerm.trim()) return aggregates;
    const lowerTerm = searchTerm.toLowerCase();
    return aggregates.filter(item =>
      item.title?.toLowerCase().includes(lowerTerm) ||
      item.course_name?.toLowerCase().includes(lowerTerm) ||
      item.instructor_name?.toLowerCase().includes(lowerTerm)
    );
  }, [aggregates, searchTerm]);

  /* ... (keep existing useEffects) ... */

  const canViewAll = useMemo(
    () => userRoles.includes('admin') || userRoles.includes('operator') || userRoles.includes('director'),
    [userRoles],
  );
  const isInstructor = useMemo(() => userRoles.includes('instructor'), [userRoles]);

  const fetchAggregatesWithInstructorNames = useCallback(async (baseAggregates: SurveyAggregate[]) => {
    const cache = new Map<string, string>();

    // 강사 정보가 없는 설문들에 대해 survey_sessions에서 조회
    const surveysNeedingInstructors = baseAggregates.filter(agg => !agg.instructor_name);

    if (surveysNeedingInstructors.length > 0) {
      const surveyIds = surveysNeedingInstructors.map(agg => agg.survey_id);

      try {
        const { data: sessionData, error } = await supabase
          .from('survey_sessions')
          .select(`
            survey_id,
            instructor_id,
            instructors!inner(name)
          `)
          .in('survey_id', surveyIds)
          .not('instructor_id', 'is', null);

        if (!error && sessionData && sessionData.length > 0) {
          const surveyInstructorMap = new Map<string, string[]>();

          sessionData.forEach((session: any) => {
            const surveyId = session.survey_id;
            const instructorName = session.instructors?.name;

            if (instructorName) {
              const existing = surveyInstructorMap.get(surveyId) || [];
              if (!existing.includes(instructorName)) {
                existing.push(instructorName);
              }
              surveyInstructorMap.set(surveyId, existing);
            }
          });

          // 강사명 포맷팅
          surveyInstructorMap.forEach((instructorNames, surveyId) => {
            if (instructorNames.length > 1) {
              cache.set(surveyId, `${instructorNames[0]} 외 ${instructorNames.length - 1}명`);
            } else if (instructorNames.length === 1) {
              cache.set(surveyId, instructorNames[0]);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching instructor names:', error);
      }
    }

    setInstructorNamesCache(cache);
    return baseAggregates;
  }, []);

  // 운영 설문을 제외한 강사 만족도 계산
  const calculateAdjustedInstructorSatisfaction = () => {
    // 강사 만족도 데이터가 있는 설문들만 필터링 (제목에 관계없이)
    const surveysWithInstructorSatisfaction = aggregates.filter(item =>
      item.avg_instructor_satisfaction !== null &&
      item.avg_instructor_satisfaction > 0 &&
      item.response_count > 0
    );

    if (surveysWithInstructorSatisfaction.length === 0) return null;

    // 가중 평균 계산 (응답 수로 가중치)
    const totalWeightedScore = surveysWithInstructorSatisfaction.reduce((sum, item) =>
      sum + (item.avg_instructor_satisfaction! * item.response_count), 0
    );
    const totalResponses = surveysWithInstructorSatisfaction.reduce((sum, item) =>
      sum + item.response_count, 0
    );

    return totalResponses > 0 ? totalWeightedScore / totalResponses : null;
  };

  // 강사 정보를 포맷하는 함수 (여러 강사 처리)
  const formatInstructorNames = (surveyId: string, instructorName: string | null, allInstructors?: Array<{ name: string }>) => {
    // 캐시된 강사 정보 확인
    const cachedName = instructorNamesCache.get(surveyId);
    if (cachedName) {
      return cachedName;
    }

    // 집계 데이터에서 해당 설문 찾기
    const currentSurvey = aggregates.find(agg => agg.survey_id === surveyId);

    // 강사 만족도 데이터가 없거나 0인 경우에만 운영 만족도로 표시
    if (currentSurvey && (!currentSurvey.avg_instructor_satisfaction || currentSurvey.avg_instructor_satisfaction === 0)) {
      return '운영 만족도';
    }

    // 기본 강사 이름이 있으면 여러 강사인지 확인하여 포맷
    if (instructorName && instructorName.trim() !== '') {
      // 쉼표로 구분된 여러 강사 이름 처리
      const instructorNames = instructorName.split(',').map(name => name.trim()).filter(name => name !== '');

      if (instructorNames.length > 1) {
        return `${instructorNames[0]} 외 ${instructorNames.length - 1}명`;
      }

      return instructorNames[0] || instructorName;
    }

    // 여러 강사가 있는 경우 처리 (향후 확장 가능)
    if (allInstructors && allInstructors.length > 0) {
      if (allInstructors.length === 1) {
        return allInstructors[0].name;
      } else {
        return `${allInstructors[0].name} 외 ${allInstructors.length - 1}명`;
      }
    }

    // 강사가 할당되지 않은 경우
    return '강사 미배정';
  };

  const filtersApplied = useMemo(
    () =>
      selectedYear !== 'all' ||
      selectedRound !== 'all' ||
      selectedProgramId !== null ||
      (canViewAll && selectedInstructor !== 'all'),
    [canViewAll, selectedProgramId, selectedInstructor, selectedRound, selectedYear],
  );

  const filtersAppliedRef = useRef(filtersApplied);

  useEffect(() => {
    filtersAppliedRef.current = filtersApplied;
  }, [filtersApplied]);

  const appliedSearchSurvey = useRef(false);

  // 프로필 정보 로드 (역할/강사 연결)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, instructor_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error && (error as any).code !== 'PGRST116') {
          throw error;
        }

        if (!data) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user.id, email: user.email, role: 'user' })
            .select('role, instructor_id')
            .single();

          if (insertError) {
            throw insertError;
          }

          setProfile(newProfile as Profile);
        } else {
          setProfile(data as Profile);
        }
      } catch (error) {
        console.error('Failed to load profile', error);
        toast({
          title: '프로필 조회 실패',
          description: '사용자 정보를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [toast, user]);

  // 관리자/운영/디렉터: 전체 강사 목록 로드
  useEffect(() => {
    const fetchAllInstructors = async () => {
      if (!canViewAll) return;
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name')
        .order('name');
      if (!error) {
        setAllInstructorsList((data || []).map((i) => ({ id: i.id as string, name: i.name as string })));
      } else {
        console.error('Failed to load instructors list', error);
        setAllInstructorsList([]);
      }
    };
    fetchAllInstructors();
  }, [canViewAll]);

  // 현재 강사 이름 로드
  useEffect(() => {
    const fetchCurrentInstructorName = async () => {
      if (!isInstructor || !profile?.instructor_id) {
        setCurrentInstructorName(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('instructors')
          .select('name')
          .eq('id', profile.instructor_id)
          .maybeSingle();

        if (!error && data) {
          setCurrentInstructorName(data.name);
        }
      } catch (error) {
        console.error('Failed to load instructor name:', error);
      }
    };

    fetchCurrentInstructorName();
  }, [isInstructor, profile?.instructor_id]);

  useEffect(() => {
    if (profileLoading) return;

    const restrictToInstructorId = !canViewAll && isInstructor ? profile?.instructor_id ?? null : null;

    const fetchBaseAggregates = async () => {
      try {
        const { aggregates: baseAggregates, summary: baseSummaryResult } =
          await SurveyAggregatesRepository.fetchAggregates({
            includeTestData: false,
            restrictToInstructorId,
          });

        // 질문이 있는 설문만 필터링
        const surveysWithQuestions = await Promise.all(
          baseAggregates.map(async (survey) => {
            const { count } = await supabase
              .from('survey_questions')
              .select('id', { count: 'exact', head: true })
              .eq('survey_id', survey.survey_id);

            return { survey, hasQuestions: (count || 0) > 0 };
          })
        );

        const validSurveys = surveysWithQuestions
          .filter(item => item.hasQuestions)
          .map(item => item.survey);

        setAllAggregates(validSurveys);
        setBaseSummary(baseSummaryResult);
      } catch (error) {
        console.error('Failed to load aggregated survey results', error);
        setAllAggregates([]);
        setBaseSummary(EMPTY_SURVEY_AGGREGATE_SUMMARY);
        if (!filtersAppliedRef.current) {
          toast({
            title: '데이터 조회 실패',
            description: '설문 집계 데이터를 불러오는데 실패했습니다.',
            variant: 'destructive',
          });
        }
      } finally {
        setHasBaseAggregates(true);
      }
    };

    setHasBaseAggregates(false);
    fetchBaseAggregates();
  }, [
    canViewAll,
    isInstructor,
    profile?.instructor_id,
    profileLoading,
    toast,
  ]);

  useEffect(() => {
    if (profileLoading) return;

    const restrictToInstructorId = !canViewAll && isInstructor ? profile?.instructor_id ?? null : null;
    const selectedYearNumber = selectedYear !== 'all' ? Number(selectedYear) : null;
    const selectedRoundNumber = selectedRound !== 'all' ? Number(selectedRound) : null;
    const yearFilter = selectedYearNumber;
    const roundFilter = selectedRoundNumber;
    // TODO: program_id로 필터링하도록 추후 survey_aggregates 조회 로직 수정 필요
    const courseNameFilter = selectedProgramId; // selectedProgramId controls filtering by course name
    const instructorFilter = canViewAll && selectedInstructor !== 'all' ? selectedInstructor : null;

    const noFiltersApplied =
      yearFilter === null &&
      roundFilter === null &&
      courseNameFilter === null &&
      (instructorFilter === null || instructorFilter === undefined);

    if (noFiltersApplied) {
      if (hasBaseAggregates) {
        fetchAggregatesWithInstructorNames(allAggregates).then(enhancedAggregates => {
          setAggregates(enhancedAggregates);
        });
        setSummary(baseSummary);
        setAggregatesLoading(false);
      } else {
        setAggregatesLoading(true);
      }
      return;
    }

    const fetchFilteredAggregates = async () => {
      setAggregatesLoading(true);
      try {
        const { aggregates: filteredAggregates, summary: filteredSummary } =
          await SurveyAggregatesRepository.fetchAggregates({
            year: yearFilter,
            round: roundFilter,
            courseName: courseNameFilter,
            instructorId: instructorFilter,
            restrictToInstructorId,
            includeTestData: false,
          });
        const enhancedAggregates = await fetchAggregatesWithInstructorNames(filteredAggregates);
        setAggregates(enhancedAggregates);
        setSummary(filteredSummary);
      } catch (error) {
        console.error('Failed to load aggregated survey results', error);
        if (!noFiltersApplied) {
          toast({
            title: '데이터 조회 실패',
            description: '설문 집계 데이터를 불러오는데 실패했습니다.',
            variant: 'destructive',
          });
        }
        setAggregates([]);
        setSummary(EMPTY_SURVEY_AGGREGATE_SUMMARY);
      } finally {
        setAggregatesLoading(false);
      }
    };

    fetchFilteredAggregates();
  }, [
    allAggregates,
    baseSummary,
    canViewAll,
    hasBaseAggregates,
    isInstructor,
    profile?.instructor_id,
    profileLoading,
    selectedProgramId,
    selectedInstructor,
    selectedRound,
    selectedYear,
    toast,
    fetchAggregatesWithInstructorNames,
  ]);

  useEffect(() => {
    if (aggregates.length === 0) return;
    if (appliedSearchSurvey.current) return;

    const surveyIdFromQuery = searchParams.get('surveyId');
    if (surveyIdFromQuery && aggregates.some((item) => item.survey_id === surveyIdFromQuery)) {
      setSelectedSurveyId(surveyIdFromQuery);
    }

    appliedSearchSurvey.current = true;
  }, [aggregates, searchParams]);

  const years = useMemo(() => {
    const unique = new Set<number>();
    allAggregates.forEach((item) => unique.add(item.education_year));
    return Array.from(unique).sort((a, b) => b - a);
  }, [allAggregates]);

  const rounds = useMemo(() => {
    const base = selectedYear === 'all'
      ? allAggregates
      : allAggregates.filter((item) => item.education_year.toString() === selectedYear);
    const unique = new Set<number>();
    base.forEach((item) => unique.add(item.education_round));
    return Array.from(unique).sort((a, b) => b - a);
  }, [allAggregates, selectedYear]);

  // 과정 옵션은 새로운 RPC를 통해 가져옴
  const selectedYearNumber = selectedYear !== 'all' ? Number(selectedYear) : null;
  const { options: courseOptions, loading: courseOptionsLoading } = useCourseOptions(selectedYearNumber);

  const instructors = useMemo(() => {
    return allInstructorsList;
  }, [allInstructorsList]);

  // 선택된 과정이 옵션에 없으면 초기화
  useEffect(() => {
    if (selectedProgramId && !courseOptions.some((opt) => opt.value === selectedProgramId)) {
      setSelectedProgramId(null);
    }
  }, [courseOptions, selectedProgramId]);

  useEffect(() => {
    if (aggregates.length === 0) {
      setSelectedSurveyId(null);
      return;
    }

    if (!selectedSurveyId || !aggregates.some((item) => item.survey_id === selectedSurveyId)) {
      setSelectedSurveyId(aggregates[0].survey_id);
    }
  }, [aggregates, selectedSurveyId]);

  const selectedSurvey = useMemo(
    () => aggregates.find((item) => item.survey_id === selectedSurveyId) ?? null,
    [aggregates, selectedSurveyId],
  );

  const handleSurveyChange = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    const params = new URLSearchParams(searchParams);
    if (surveyId) {
      params.set('surveyId', surveyId);
    } else {
      params.delete('surveyId');
    }
    setSearchParams(params);
  };

  const handleDownload = async (type: DownloadType) => {
    if (!selectedSurvey) {
      toast({
        title: '설문 선택 필요',
        description: '다운로드하려면 설문을 먼저 선택하세요.',
        variant: 'destructive',
      });
      return;
    }

    const jobId = `${type}-${Date.now()}`;
    setDownloadJob({
      id: jobId,
      type,
      status: 'running',
      progress: 0,
      message: '백그라운드 작업을 준비하고 있습니다.',
    });

    try {
      const { data: questionData, error: questionError } = await supabase
        .from('survey_questions')
        .select('id, question_text, question_type, order_index')
        .eq('survey_id', selectedSurvey.survey_id)
        .order('order_index');

      if (questionError) {
        throw questionError;
      }

      setDownloadJob((prev) => (prev && prev.id === jobId
        ? { ...prev, progress: 0.15, message: '질문 정보를 불러오는 중입니다.' }
        : prev));

      const questions = (questionData ?? []) as SurveyQuestionRow[];
      const allResponses: SurveyResponseRow[] = [];
      const allAnswers: QuestionAnswerRow[] = [];
      const chunkSize = 250;
      let fetched = 0;
      let total = 0;
      let offset = 0;

      // Fetch responses and answers in chunks so the UI can update progress.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let responseQuery = supabase
          .from('survey_responses')
          .select('id, submitted_at, respondent_email', { count: 'exact' })
          .eq('survey_id', selectedSurvey.survey_id)
          .order('submitted_at', { ascending: true })
          .range(offset, offset + chunkSize - 1);

        responseQuery = responseQuery.or('is_test.is.null,is_test.eq.false');

        const { data: responseChunk, error: responseError, count } = await responseQuery;
        if (responseError) {
          throw responseError;
        }

        const chunk = (responseChunk ?? []) as SurveyResponseRow[];
        if (total === 0) {
          total = count ?? chunk.length;
        }

        allResponses.push(...chunk);
        fetched += chunk.length;

        if (chunk.length > 0) {
          const responseIds = chunk.map((item) => item.id);
          const { data: answerChunk, error: answerError } = await supabase
            .from('question_answers')
            .select('question_id, response_id, answer_text, answer_value')
            .in('response_id', responseIds);

          if (answerError) {
            throw answerError;
          }

          allAnswers.push(...((answerChunk ?? []) as QuestionAnswerRow[]));
        }

        const progressBase = 0.2;
        const progressRange = 0.7;
        const progress = total > 0 ? fetched / total : 1;
        setDownloadJob((prev) => (prev && prev.id === jobId
          ? {
            ...prev,
            progress: Math.min(0.9, progressBase + progress * progressRange),
            message: `응답 ${Math.min(fetched, total)}/${total}건 처리 중...`,
          }
          : prev));

        offset += chunkSize;
        if (chunk.length < chunkSize) {
          break;
        }

        // Allow the UI to update between chunks.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const surveyInfo: SurveyResultData['survey'] = {
        id: selectedSurvey.survey_id,
        title: selectedSurvey.title,
        education_year: selectedSurvey.education_year,
        education_round: selectedSurvey.education_round,
        instructor_name: selectedSurvey.instructor_name ?? undefined,
        course_title: selectedSurvey.course_name ?? undefined,
      };

      const payload: SurveyResultData = {
        survey: surveyInfo,
        responses: allResponses,
        questions,
        answers: allAnswers,
      };

      setDownloadJob((prev) => (prev && prev.id === jobId
        ? { ...prev, progress: 0.95, message: 'CSV 파일을 생성하는 중입니다.' }
        : prev));

      const csv = type === 'responses'
        ? exportResponsesAsCSV(payload)
        : exportSummaryAsCSV(payload);
      const filename = generateCSVFilename(surveyInfo, type);
      downloadCSV(csv, filename);

      setDownloadJob({
        id: jobId,
        type,
        status: 'completed',
        progress: 1,
        message: '다운로드가 완료되었습니다.',
      });
      toast({
        title: '다운로드 시작',
        description: 'CSV 파일 다운로드가 완료되었습니다.',
      });
    } catch (error) {
      console.error('Download job failed', error);
      setDownloadJob({
        id: jobId,
        type,
        status: 'error',
        progress: 1,
        message: '다운로드에 실패했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
      toast({
        title: '다운로드 실패',
        description: 'CSV 파일을 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const detailSectionRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">설문 결과 분석</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            설문 응답의 주요 지표를 서버에서 집계한 데이터로 빠르게 확인할 수 있습니다.
          </p>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">필터</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 px-4 sm:px-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">연도</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 연도" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">전체 연도</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">차수</span>
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 차수" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">전체 차수</SelectItem>
                  {rounds.map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      {round}차
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">과정</span>
              <Select
                value={selectedProgramId ?? 'all'}
                onValueChange={(val) => setSelectedProgramId(val === 'all' ? null : val)}
                disabled={courseOptionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={courseOptionsLoading ? '로딩 중...' : '전체 과정'}>
                    {courseOptionsLoading ? '로딩 중...' : (
                      selectedProgramId
                        ? courseOptions.find(opt => opt.value === selectedProgramId)?.label ?? '전체 과정'
                        : '전체 과정'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">전체 과정</SelectItem>
                  {courseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">강사</span>
              <Select
                value={isInstructor && !canViewAll ? (profile?.instructor_id || 'all') : selectedInstructor}
                onValueChange={isInstructor && !canViewAll ? undefined : setSelectedInstructor}
                disabled={isInstructor && !canViewAll}
              >
                <SelectTrigger className={isInstructor && !canViewAll ? 'opacity-50' : ''}>
                  <SelectValue placeholder="전체 강사">
                    {isInstructor && !canViewAll && currentInstructorName
                      ? currentInstructorName
                      : selectedInstructor === 'all'
                        ? '전체 강사'
                        : instructors.find(i => i.id === selectedInstructor)?.name || '전체 강사'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">전체 강사</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isInstructor && !canViewAll && (
                <p className="text-xs text-muted-foreground mt-1">
                  강사는 자신의 결과만 조회할 수 있습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">요약 지표</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-4 sm:px-6">
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">총 설문 수</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatNumber(summary.totalSurveys)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">총 응답 수</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatNumber(summary.totalResponses)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">진행 중</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatNumber(summary.activeSurveys)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">완료</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatNumber(summary.completedSurveys)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">종합 만족도</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatSatisfaction(summary.avgOverall)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">강의 만족도</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatSatisfaction(summary.avgCourse)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">강사 만족도</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatSatisfaction(calculateAdjustedInstructorSatisfaction())}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">운영 만족도</p>
              <p className="text-lg sm:text-2xl font-semibold">{formatSatisfaction(summary.avgOperation)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">집계 결과</CardTitle>
            <span className="text-xs sm:text-sm text-muted-foreground">
              서버 집계를 통해 정렬된 설문 목록입니다.
            </span>
          </CardHeader>
          <CardContent className="overflow-x-auto px-2 sm:px-4 md:px-6">
            {aggregatesLoading ? (
              <div className="py-12 text-center text-muted-foreground">집계 데이터를 불러오는 중입니다...</div>
            ) : aggregates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">조건에 맞는 설문이 없습니다.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[450px] overflow-auto relative">
                  <Table className="min-w-[1000px] border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 shadow-sm">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="w-[200px] font-semibold text-center h-10 border-b">설문 제목</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">연도</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">차수</TableHead>
                        <TableHead className="w-[180px] font-semibold text-center h-10 border-b">과정명</TableHead>
                        <TableHead className="w-[120px] font-semibold text-center h-10 border-b">강사명</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">응답 수</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">종합</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">강의</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">강사</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">운영</TableHead>
                        <TableHead className="w-[100px] font-semibold text-center h-10 border-b">상태</TableHead>
                        <TableHead className="w-[80px] font-semibold text-center h-10 border-b">상세</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregates.map((item) => (
                        <TableRow
                          key={item.survey_id}
                          className={`hover:bg-muted/5 cursor-pointer transition-colors ${item.survey_id === selectedSurveyId ? 'bg-muted/40' : ''}`}
                          onClick={() => {
                            handleSurveyChange(item.survey_id);
                            setTimeout(() => {
                              detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                        >
                          <TableCell className="font-medium border-b">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[180px]" title={item.title}>
                                {item.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center border-b">{item.education_year}</TableCell>
                          <TableCell className="text-center border-b">{item.education_round}</TableCell>
                          <TableCell className="text-center border-b">
                            <span className="truncate max-w-[160px] block mx-auto" title={item.course_name || '-'}>
                              {item.course_name || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center border-b">
                            {formatInstructorNames(item.survey_id, item.instructor_name)}
                          </TableCell>
                          <TableCell className="text-center border-b">{formatNumber(item.response_count)}</TableCell>
                          <TableCell className="text-center border-b">{formatSatisfaction(item.avg_overall_satisfaction)}</TableCell>
                          <TableCell className="text-center border-b">{formatSatisfaction(item.avg_course_satisfaction)}</TableCell>
                          <TableCell className="text-center border-b">
                            {item.title.includes('[종료 설문]') || item.title.includes('운영')
                              ? '-'
                              : formatSatisfaction(item.avg_instructor_satisfaction)
                            }
                          </TableCell>
                          <TableCell className="text-center border-b">{formatSatisfaction(item.avg_operation_satisfaction)}</TableCell>
                          <TableCell className="text-center border-b">
                            <Badge variant={item.status === 'completed' ? 'secondary' : 'outline'} className="whitespace-nowrap">
                              {item.status === 'completed' ? '완료' : '진행 중'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center border-b">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/survey-detailed-analysis/${item.survey_id}`, { state: { from: 'survey-results' } });
                              }}
                            >
                              <BarIcon className="h-4 w-4 mr-1" />
                              분석
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card ref={detailSectionRef}>
          <CardHeader className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div>
              <CardTitle className="text-base sm:text-lg mb-1 sm:mb-2">선택한 설문 상세</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                설문 응답 목록은 페이지 단위로 불러오며, 대량 다운로드는 백그라운드 작업으로 처리됩니다.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {selectedSurvey && (
                <Button
                  onClick={() => navigate(`/survey-detailed-analysis/${selectedSurvey.survey_id}`, { state: { from: 'survey-results' } })}
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <BarIcon className="h-4 w-4 mr-1.5" />
                  상세 분석 보기
                </Button>
              )}
              <Button
                onClick={() => handleDownload('summary')}
                disabled={!selectedSurvey || (downloadJob?.status === 'running' && downloadJob.type === 'summary')}
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                요약 다운로드
              </Button>
              <Button
                onClick={() => handleDownload('responses')}
                disabled={!selectedSurvey || (downloadJob?.status === 'running' && downloadJob.type === 'responses')}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                응답 다운로드
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            {!selectedSurvey ? (
              <div className="py-8 sm:py-12 text-center text-xs sm:text-sm text-muted-foreground">
                표시할 설문을 선택하세요.
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-3 sm:gap-4 grid-cols-2">
                    <div className="rounded-lg border p-3 sm:p-4 bg-muted/20">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">설문 제목</p>
                      <p className="text-sm sm:text-base font-semibold truncate" title={selectedSurvey.title}>{selectedSurvey.title}</p>
                    </div>
                    <div className="rounded-lg border p-3 sm:p-4 bg-muted/20">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">응답 수</p>
                      <p className="text-sm sm:text-base font-semibold">{formatNumber(selectedSurvey.response_count)}</p>
                    </div>
                    <div className="rounded-lg border p-3 sm:p-4 bg-muted/20">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">기대 인원 대비 응답률</p>
                      <p className="text-sm sm:text-base font-semibold">
                        {selectedSurvey.expected_participants && selectedSurvey.expected_participants > 0
                          ? `${Math.round(
                            (selectedSurvey.response_count / selectedSurvey.expected_participants) * 100,
                          )}%`
                          : '-'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 sm:p-4 bg-muted/20">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">강사명</p>
                      <p className="text-sm sm:text-base font-semibold truncate">
                        {formatInstructorNames(selectedSurvey.survey_id, selectedSurvey.instructor_name)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      만족도 현황
                    </h4>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: '종합', value: selectedSurvey.avg_overall_satisfaction || 0, fill: 'hsl(var(--chart-1))' },
                            { name: '강의', value: selectedSurvey.avg_course_satisfaction || 0, fill: 'hsl(var(--chart-2))' },
                            { name: '강사', value: calculateAdjustedInstructorSatisfaction() || 0, fill: 'hsl(var(--chart-3))' },
                            { name: '운영', value: selectedSurvey.avg_operation_satisfaction || 0, fill: 'hsl(var(--chart-4))' },
                          ]}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, 10]} hide />
                          <YAxis dataKey="name" type="category" width={30} tick={{ fontSize: 12 }} />
                          <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                          {payload[0].payload.name}
                                        </span>
                                        <span className="font-bold text-muted-foreground">
                                          {payload[0].value ? Number(payload[0].value).toFixed(1) : '-'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} background={{ fill: 'hsl(var(--muted))' }}>
                            {[
                              'hsl(var(--chart-1))',
                              'hsl(var(--chart-2))',
                              'hsl(var(--chart-3))',
                              'hsl(var(--chart-4))'
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">종합 만족도</p>
                    <div className="flex items-end gap-2">
                      <p className="text-xl sm:text-2xl font-bold text-primary">
                        {formatSatisfaction(selectedSurvey.avg_overall_satisfaction)}
                      </p>
                      <span className="text-xs text-muted-foreground mb-1">/ 10</span>
                    </div>
                    <Progress value={(selectedSurvey.avg_overall_satisfaction || 0) * 10} className="h-1.5 mt-2" />
                  </div>
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">강의 만족도</p>
                    <div className="flex items-end gap-2">
                      <p className="text-xl sm:text-2xl font-bold">
                        {formatSatisfaction(selectedSurvey.avg_course_satisfaction)}
                      </p>
                      <span className="text-xs text-muted-foreground mb-1">/ 10</span>
                    </div>
                    <Progress value={(selectedSurvey.avg_course_satisfaction || 0) * 10} className="h-1.5 mt-2" />
                  </div>
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">강사 만족도</p>
                    <div className="flex items-end gap-2">
                      <p className="text-xl sm:text-2xl font-bold">
                        {selectedSurvey.title.includes('[종료 설문]') || selectedSurvey.title.includes('운영')
                          ? '-'
                          : formatSatisfaction(calculateAdjustedInstructorSatisfaction())
                        }
                      </p>
                      <span className="text-xs text-muted-foreground mb-1">/ 10</span>
                    </div>
                    <Progress value={(calculateAdjustedInstructorSatisfaction() || 0) * 10} className="h-1.5 mt-2" />
                  </div>
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">운영 만족도</p>
                    <div className="flex items-end gap-2">
                      <p className="text-xl sm:text-2xl font-bold">
                        {formatSatisfaction(selectedSurvey.avg_operation_satisfaction)}
                      </p>
                      <span className="text-xs text-muted-foreground mb-1">/ 10</span>
                    </div>
                    <Progress value={(selectedSurvey.avg_operation_satisfaction || 0) * 10} className="h-1.5 mt-2" />
                  </div>
                </div>

                {downloadJob && (
                  <div className="rounded-lg border p-3 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span>
                        {downloadJob.type === 'responses' ? '응답 다운로드' : '요약 다운로드'} 진행 상태
                      </span>
                      <span>{Math.round(downloadJob.progress * 100)}%</span>
                    </div>
                    <Progress value={Math.round(downloadJob.progress * 100)} />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {downloadJob.message}
                      {downloadJob.status === 'error' && downloadJob.error ? ` (${downloadJob.error})` : ''}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default SurveyResults;
