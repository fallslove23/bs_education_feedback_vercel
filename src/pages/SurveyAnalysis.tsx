import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from "@/components/layouts";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Mail, Users, BarChart3, TrendingUp, ArrowLeft, Activity, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChartEmptyState } from '@/components/charts';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Database } from '@/integrations/supabase/types';

type SurveyAnalysisRow = Database['public']['Functions']['get_survey_analysis']['Returns'][number];

interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
  respondent_email: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
  photo_url: string;
}

interface QuestionAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  answer_value: any;
  response_id: string;
  created_at?: string;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  survey_id: string;
  order_index: number;
  satisfaction_type: string;
}

interface Profile {
  role: string;
  instructor_id: string;
}

interface QuestionTypeDistributionItem {
  question_type: string;
  response_count: number;
}

interface SurveySummary {
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
  question_type_distribution: QuestionTypeDistributionItem[];
}

interface ChartItem {
  name: string;
  value: number;
  percentage: number;
}

type QuestionDetail =
  | { kind: 'empty'; totalAnswers: number; emptyMessage: string }
  | { kind: 'chart'; totalAnswers: number; chartData: ChartItem[] }
  | { kind: 'rating'; totalAnswers: number; chartData: ChartItem[]; average: string }
  | { kind: 'text'; totalAnswers: number; answers: QuestionAnswer[] };

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  rating: '평점형',
  scale: '척도형',
  multiple_choice: '복수 선택',
  single_choice: '단일 선택',
  text: '서술형',
};

const parseOptions = (options: unknown): string[] => {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.filter((option): option is string => typeof option === 'string');
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) {
        return parsed.filter((option): option is string => typeof option === 'string');
      }
    } catch (error) {
      return [options];
    }
  }
  return [];
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? fallback : value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const toNullableBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }
  return null;
};

const parseQuestionTypeDistribution = (value: unknown): QuestionTypeDistributionItem[] => {
  if (!value) return [];

  const distributionArray: unknown[] | null = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : null;
          } catch (error) {
            return null;
          }
        })()
      : null;

  if (!distributionArray) {
    return [];
  }

  return distributionArray
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const questionType = toNullableString(entry.question_type);

      if (!questionType) {
        return null;
      }

      return {
        question_type: questionType,
        response_count: toNumber(entry.response_count),
      } satisfies QuestionTypeDistributionItem;
    })
    .filter((item): item is QuestionTypeDistributionItem => item !== null);
};

const normalizeSummaries = (rows: any[] | null): SurveySummary[] => {
  if (!rows) return [];
  return rows
    .map((row) => {
      // get_survey_analysis가 { survey_info, response_count, satisfaction_scores, feedback_text } 형태로 반환
      const surveyInfo = row.survey_info as any;
      const surveyId = surveyInfo?.id || surveyInfo?.survey_id;

      if (!surveyId) {
        return null;
      }

      const title = surveyInfo?.title || '제목 없음';

      return {
        survey_id: surveyId,
        title,
        description: surveyInfo?.description || null,
        education_year: surveyInfo?.education_year || 0,
        education_round: surveyInfo?.education_round || 0,
        course_name: surveyInfo?.course_name || null,
        status: surveyInfo?.status || null,
        instructor_id: surveyInfo?.instructor_id || null,
        instructor_name: surveyInfo?.instructor_name || null,
        expected_participants: surveyInfo?.expected_participants || null,
        is_test: surveyInfo?.is_test || false,
        response_count: row.response_count || 0,
        last_response_at: surveyInfo?.last_response_at || null,
        avg_overall_satisfaction: null, // satisfaction_scores에서 가져와야 함
        avg_course_satisfaction: null,
        avg_instructor_satisfaction: null,
        avg_operation_satisfaction: null,
        question_count: surveyInfo?.question_count || 0,
        question_type_distribution: [],
      };
    })
    .filter((summary): summary is SurveySummary => summary !== null);
};
const SurveyAnalysis = () => {
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [allSummaries, setAllSummaries] = useState<SurveySummary[]>([]);
  const [surveySummaries, setSurveySummaries] = useState<SurveySummary[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [questionDetails, setQuestionDetails] = useState<Record<string, QuestionDetail>>({});
  const [questionLoading, setQuestionLoading] = useState<Record<string, boolean>>({});
  const [selectedSurvey, setSelectedSurvey] = useState<string>('none');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [includeTestData, setIncludeTestData] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'responses'>('overview');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingResults, setSendingResults] = useState(false);

  const isAdmin = userRoles.includes('admin');
  const isOperator = userRoles.includes('operator');
  const isDirector = userRoles.includes('director');
  const isInstructor = userRoles.includes('instructor');
  const canViewAll = isAdmin || isOperator || isDirector;

  const instructorFilter = useMemo(() => {
    if (!canViewAll) {
      return profile?.instructor_id ?? null;
    }
    return selectedInstructor !== 'all' ? selectedInstructor : null;
  }, [canViewAll, profile?.instructor_id, selectedInstructor]);

  const selectedSurveyData = useMemo(
    () => surveySummaries.find((summary) => summary.survey_id === selectedSurvey) || null,
    [surveySummaries, selectedSurvey]
  );

  const questionTypeChartData = useMemo(() => {
    if (!selectedSurveyData) return [] as ChartItem[];
    const total = selectedSurveyData.question_type_distribution.reduce(
      (sum, item) => sum + item.response_count,
      0
    );
    return selectedSurveyData.question_type_distribution.map((item) => ({
      name: QUESTION_TYPE_LABELS[item.question_type] ?? item.question_type,
      value: item.response_count,
      percentage: total > 0 ? Math.round((item.response_count / total) * 100) : 0,
    }));
  }, [selectedSurveyData]);

  const availableYears = useMemo(() => {
    const filtered = allSummaries.filter((summary) => {
      if (instructorFilter && summary.instructor_id !== instructorFilter) return false;
      return true;
    });
    const years = Array.from(new Set(filtered.map((summary) => summary.education_year)));
    return years.sort((a, b) => b - a);
  }, [allSummaries, instructorFilter]);

  const availableRounds = useMemo(() => {
    let filtered = allSummaries;
    if (instructorFilter) {
      filtered = filtered.filter((summary) => summary.instructor_id === instructorFilter);
    }
    if (selectedYear !== 'all') {
      const year = Number(selectedYear);
      filtered = filtered.filter((summary) => summary.education_year === year);
    }
    const rounds = Array.from(new Set(filtered.map((summary) => summary.education_round)));
    return rounds.sort((a, b) => b - a);
  }, [allSummaries, instructorFilter, selectedYear]);

  const availableCourses = useMemo(() => {
    let filtered = allSummaries;
    if (instructorFilter) {
      filtered = filtered.filter((summary) => summary.instructor_id === instructorFilter);
    }
    if (selectedYear !== 'all') {
      filtered = filtered.filter((summary) => summary.education_year === Number(selectedYear));
    }
    if (selectedRound !== 'all') {
      filtered = filtered.filter((summary) => summary.education_round === Number(selectedRound));
    }
    const courses = Array.from(
      new Set(
        filtered
          .map((summary) => summary.course_name)
          .filter((courseName): courseName is string => Boolean(courseName))
      )
    );
    return courses.sort((a, b) => a.localeCompare(b));
  }, [allSummaries, instructorFilter, selectedYear, selectedRound]);
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, instructor_id')
        .eq('id', user.id)
        .maybeSingle();

      if (error && (error as any).code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        toast({
          title: '프로필 조회 실패',
          description: '사용자 정보를 불러오지 못했습니다.',
          variant: 'destructive',
        });
      }
      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast({
        title: '프로필 조회 실패',
        description: '사용자 정보를 불러오지 못했습니다.',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const fetchAllInstructors = useCallback(async () => {
    if (!canViewAll) return;
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name, email, photo_url')
        .order('name');

      if (error) throw error;
      setAllInstructors(data || []);
    } catch (error) {
      console.error('Error fetching all instructors:', error);
      toast({
        title: '강사 목록 조회 실패',
        description: '강사 목록을 불러오지 못했습니다.',
        variant: 'destructive',
      });
    }
  }, [canViewAll, toast]);

  const fetchAvailableSummaries = useCallback(async () => {
    if (!canViewAll && !profile?.instructor_id) return;
    try {
      // 설문 목록을 가져오기 위해 surveys 테이블에서 직접 조회
      let query = supabase
        .from('surveys')
        .select(`
          id,
          title,
          description,
          education_year,
          education_round,
          course_name,
          status,
          instructor_id,
          expected_participants,
          is_test,
          created_at,
          updated_at
        `);

      if (!canViewAll && profile?.instructor_id) {
        query = query.eq('instructor_id', profile.instructor_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // 데이터를 SurveySummary 형태로 변환
      const summaries = (data || []).map(survey => ({
        survey_id: survey.id,
        title: survey.title || '제목 없음',
        description: survey.description,
        education_year: survey.education_year || 0,
        education_round: survey.education_round || 0,
        course_name: survey.course_name,
        status: survey.status,
        instructor_id: survey.instructor_id,
        instructor_name: null, // 나중에 조인으로 가져올 수 있음
        expected_participants: survey.expected_participants,
        is_test: survey.is_test || false,
        response_count: 0, // 나중에 계산
        last_response_at: null,
        avg_overall_satisfaction: null,
        avg_course_satisfaction: null,
        avg_instructor_satisfaction: null,
        avg_operation_satisfaction: null,
        question_count: 0,
        question_type_distribution: [],
      }));

      setAllSummaries(summaries);
    } catch (error) {
      console.error('Error fetching available survey summaries:', error);
      toast({
        title: '설문 목록 조회 실패',
        description: '필터 정보를 불러오지 못했습니다.',
        variant: 'destructive',
      });
    }
  }, [canViewAll, profile?.instructor_id, toast]);

  const fetchSurveySummaries = useCallback(async () => {
    if (!canViewAll && !profile?.instructor_id) return;
    setSummaryLoading(true);
    try {
      const yearFilter = selectedYear !== 'all' ? Number(selectedYear) : null;
      const roundFilter = selectedRound !== 'all' ? Number(selectedRound) : null;
      const courseFilter = selectedCourse !== 'all' ? selectedCourse : null;
      const instructorIdForQuery = instructorFilter ?? null;

      const normalizedYear = yearFilter !== null && !Number.isNaN(yearFilter) ? yearFilter : null;
      const normalizedRound = roundFilter !== null && !Number.isNaN(roundFilter) ? roundFilter : null;

      const rpcParams = {
        survey_id_param: selectedSurvey
      };

      const { data, error } = await supabase
        .rpc('get_survey_analysis', rpcParams);

      if (error) throw error;

      const summaries = normalizeSummaries(data);

      setSurveySummaries(summaries);

      if (summaries.length === 0) {
        setSelectedSurvey('none');
      } else if (!summaries.some((summary) => summary.survey_id === selectedSurvey)) {
        setSelectedSurvey(summaries[0].survey_id);
      }
    } catch (error) {
      console.error('Error fetching survey summaries:', error);
      toast({
        title: '설문 요약 조회 실패',
        description: '설문 요약 정보를 불러오지 못했습니다.',
        variant: 'destructive',
      });
    } finally {
      setSummaryLoading(false);
      setLoading(false);
    }
  }, [canViewAll, profile?.instructor_id, instructorFilter, includeTestData, selectedYear, selectedRound, selectedCourse, selectedSurvey, toast]);

  const fetchSurveyQuestions = useCallback(async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (error) throw error;
      setSurveyQuestions(data || []);
      setQuestionDetails({});
      setQuestionLoading({});
    } catch (error) {
      console.error('Error fetching survey questions:', error);
      toast({
        title: '질문 조회 실패',
        description: '질문 목록을 불러오지 못했습니다.',
        variant: 'destructive',
      });
    }
  }, [toast]);
  const fetchQuestionDetail = useCallback(
    async (question: SurveyQuestion) => {
      if (!selectedSurvey || selectedSurvey === 'none') return;
      if (questionDetails[question.id] || questionLoading[question.id]) return;

      setQuestionLoading((prev) => ({ ...prev, [question.id]: true }));
      try {
        const { data: answersData, error } = await supabase
          .from('question_answers')
          .select('id, question_id, answer_text, answer_value, response_id, created_at')
          .eq('question_id', question.id);

        if (error) throw error;
        const questionAnswers = answersData || [];
        const totalAnswers = questionAnswers.length;

        if (question.question_type === 'multiple_choice' || question.question_type === 'single_choice') {
          const options = parseOptions(question.options);
          const answerCounts: Record<string, number> = {};
          options.forEach((option) => {
            answerCounts[option] = 0;
          });
          questionAnswers.forEach((answer) => {
            if (typeof answer.answer_text === 'string' && answerCounts[answer.answer_text] !== undefined) {
              answerCounts[answer.answer_text] += 1;
            }
          });
          const chartData = Object.entries(answerCounts).map(([option, count]) => ({
            name: option,
            value: count,
            percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
          }));
          const hasValues = chartData.some((item) => item.value > 0);

          setQuestionDetails((prev) => ({
            ...prev,
            [question.id]: hasValues
              ? { kind: 'chart', totalAnswers, chartData }
              : {
                  kind: 'empty',
                  totalAnswers,
                  emptyMessage: '응답이 없어 선택형 결과를 표시할 수 없습니다. 다른 설문을 선택하거나 응답을 수집해 주세요.',
                },
          }));
          return;
        }

        if (question.question_type === 'rating' || question.question_type === 'scale') {
          const ratings = questionAnswers
            .map((answer) => {
              if (typeof answer.answer_text === 'string') {
                const parsed = parseFloat(answer.answer_text);
                return Number.isFinite(parsed) ? parsed : null;
              }
              if (typeof answer.answer_value === 'number') {
                return answer.answer_value;
              }
              return null;
            })
            .filter((rating): rating is number => rating !== null);

          if (ratings.length === 0) {
            setQuestionDetails((prev) => ({
              ...prev,
              [question.id]: {
                kind: 'empty',
                totalAnswers,
                emptyMessage: '평점 응답이 없어 차트를 표시할 수 없습니다.',
              },
            }));
            return;
          }

          const distribution: Record<number, number> = {};
          const scaleMax = 5;
          for (let score = 1; score <= scaleMax; score += 1) {
            distribution[score] = ratings.filter((value) => Math.round(value) === score).length;
          }

          const chartData = Object.entries(distribution).map(([score, count]) => ({
            name: `${score}점`,
            value: count,
            percentage: ratings.length > 0 ? Math.round((count / ratings.length) * 100) : 0,
          }));

          setQuestionDetails((prev) => ({
            ...prev,
            [question.id]: {
              kind: 'rating',
              totalAnswers,
              chartData,
              average: (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1),
            },
          }));
          return;
        }

        const textAnswers = [...questionAnswers]
          .filter((answer) => typeof answer.answer_text === 'string' && answer.answer_text.trim().length > 0)
          .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 10);

        if (textAnswers.length === 0) {
          setQuestionDetails((prev) => ({
            ...prev,
            [question.id]: {
              kind: 'empty',
              totalAnswers,
              emptyMessage: '텍스트 응답이 없어 결과를 표시할 수 없습니다.',
            },
          }));
          return;
        }

        setQuestionDetails((prev) => ({
          ...prev,
          [question.id]: {
            kind: 'text',
            totalAnswers,
            answers: textAnswers,
          },
        }));
      } catch (error) {
        console.error('Error fetching question detail:', error);
        toast({
          title: '문항 분석 실패',
          description: '문항 상세 데이터를 불러오지 못했습니다.',
          variant: 'destructive',
        });
      } finally {
        setQuestionLoading((prev) => ({ ...prev, [question.id]: false }));
      }
    },
    [selectedSurvey, questionDetails, questionLoading, toast]
  );

  const fetchResponsesAndAnswers = useCallback(
    async (surveyId: string) => {
      setResponsesLoading(true);
      try {
        const { data: responsesData, error: responsesError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', surveyId)
          .order('submitted_at', { ascending: false });

        if (responsesError) throw responsesError;
        setResponses(responsesData || []);

        if (responsesData && responsesData.length > 0) {
          const { data: answersData, error: answersError } = await supabase
            .from('question_answers')
            .select('*')
            .in(
              'response_id',
              responsesData.map((response) => response.id)
            );

          if (answersError) throw answersError;
          setAnswers(answersData || []);
        } else {
          setAnswers([]);
        }
      } catch (error) {
        console.error('Error fetching responses:', error);
        toast({
          title: '응답 조회 실패',
          description: '응답 데이터를 불러오지 못했습니다.',
          variant: 'destructive',
        });
      } finally {
        setResponsesLoading(false);
      }
    },
    [toast]
  );
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile || canViewAll) {
      fetchAllInstructors();
      fetchAvailableSummaries();
      fetchSurveySummaries();
    }
  }, [profile, canViewAll, fetchAllInstructors, fetchAvailableSummaries, fetchSurveySummaries]);

  useEffect(() => {
    fetchAvailableSummaries();
    fetchSurveySummaries();
  }, [selectedInstructor, includeTestData, fetchAvailableSummaries, fetchSurveySummaries]);

  useEffect(() => {
    fetchSurveySummaries();
  }, [selectedYear, selectedRound, selectedCourse, fetchSurveySummaries]);

  useEffect(() => {
    if (selectedSurvey && selectedSurvey !== 'none') {
      fetchSurveyQuestions(selectedSurvey);
      setQuestionDetails({});
      setQuestionLoading({});
      if (activeTab === 'responses') {
        fetchResponsesAndAnswers(selectedSurvey);
      }
    } else {
      setSurveyQuestions([]);
      setQuestionDetails({});
      setQuestionLoading({});
      setResponses([]);
      setAnswers([]);
    }
  }, [selectedSurvey, fetchSurveyQuestions, activeTab, fetchResponsesAndAnswers]);

  useEffect(() => {
    if (activeTab === 'responses' && selectedSurvey && selectedSurvey !== 'none') {
      fetchResponsesAndAnswers(selectedSurvey);
    }
  }, [activeTab, selectedSurvey, fetchResponsesAndAnswers]);

  const handleQuestionAccordionChange = (value: string) => {
    if (!value) return;
    const question = surveyQuestions.find((item) => item.id === value);
    if (question) {
      fetchQuestionDetail(question);
    }
  };
  const handleSendResults = async () => {
    if (!selectedSurveyData) {
      toast({
        title: '오류',
        description: '결과를 전송할 설문을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: '오류',
        description: '발송할 수신자를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setSendingResults(true);
    try {
      const { error } = await supabase.functions.invoke('send-survey-results', {
        body: {
          surveyId: selectedSurveyData.survey_id,
          recipients: selectedRecipients,
          summary: {
            ...selectedSurveyData,
            filters: {
              year: selectedYear,
              round: selectedRound,
              course: selectedCourse,
              includeTestData,
            },
          },
        },
      });

      if (error) throw error;

      toast({
        title: '✅ 이메일 전송 완료!',
        description: `${selectedRecipients.length}명에게 설문 결과가 성공적으로 전송되었습니다.`,
      });

      setEmailDialogOpen(false);
      setSelectedRecipients([]);
    } catch (error) {
      console.error('Error sending results:', error);
      toast({
        title: '오류',
        description: '결과 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setSendingResults(false);
    }
  };

  const handleDownloadResults = () => {
    if (!selectedSurveyData) {
      toast({
        title: '다운로드 실패',
        description: '다운로드할 설문을 먼저 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const exportData = {
      summary: selectedSurveyData,
      filters: {
        year: selectedYear,
        round: selectedRound,
        course: selectedCourse,
        includeTestData,
      },
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = selectedSurveyData.title.replace(/[^a-zA-Z0-9가-힣-_]+/g, '_');
    link.download = `${selectedSurveyData.education_year}년_${selectedSurveyData.education_round}차_${safeTitle}_요약.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: '다운로드 완료',
      description: '서버 집계 데이터를 JSON으로 다운로드했습니다.',
    });
  };

  const desktopActions = [
    <Button
      key="back"
      variant="outline"
      size="sm"
      className="rounded-full px-3"
      onClick={() => history.back()}
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      뒤로
    </Button>,
    ...(selectedSurvey && selectedSurvey !== 'none' && !isInstructor
      ? [
          <Button
            key="share"
            variant="outline"
            size="sm"
            className="rounded-full px-3"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            결과 공유
          </Button>,
          <Button
            key="download"
            variant="outline"
            size="sm"
            className="rounded-full px-3"
            onClick={handleDownloadResults}
          >
            <Download className="h-4 w-4 mr-2" />
            다운로드
          </Button>,
        ]
      : []),
  ];

  return (
    <DashboardLayout
      title="설문 결과 분석"
      subtitle="설문과 응답을 분석합니다."
      totalCount={surveySummaries.length}
      actions={desktopActions}
      loading={loading || summaryLoading}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          {canViewAll && (
            <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="강사 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 강사</SelectItem>
                {allInstructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전체 연도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전체 차수" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {availableRounds.map((round) => (
                <SelectItem key={round} value={round.toString()}>
                  {round}차
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="전체 과정" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {availableCourses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch id="include-test-data" checked={includeTestData} onCheckedChange={setIncludeTestData} />
            <label htmlFor="include-test-data" className="text-sm text-muted-foreground">
              테스트 데이터 포함
            </label>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              설문 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            {surveySummaries.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                조건에 맞는 설문이 없습니다. 필터를 변경해 보세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {surveySummaries.map((survey) => (
                  <Card
                    key={survey.survey_id}
                    className={`cursor-pointer transition-all ${
                      selectedSurvey === survey.survey_id ? 'border-primary shadow-md' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedSurvey(survey.survey_id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {survey.education_year}년 {survey.education_round}차
                        </span>
                        <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                          {survey.status === 'active' ? '활성' : survey.status === 'completed' ? '완료' : survey.status || '대기'}
                        </Badge>
                      </div>
                      <h3 className="font-medium line-clamp-2">{survey.title}</h3>
                      {survey.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{survey.description}</p>
                      )}
                      {survey.is_test && (
                        <Badge variant="outline" className="text-[10px]">
                          테스트 데이터
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {selectedSurvey && selectedSurveyData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {selectedSurveyData.title}
                  {selectedSurveyData.is_test && <Badge variant="outline">테스트</Badge>}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {selectedSurveyData.education_year}년 {selectedSurveyData.education_round}차
                  </span>
                  <Badge variant={selectedSurveyData.status === 'active' ? 'default' : 'secondary'}>
                    {selectedSurveyData.status === 'active'
                      ? '활성'
                      : selectedSurveyData.status === 'completed'
                      ? '완료'
                      : selectedSurveyData.status || '대기'}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedSurveyData.response_count}명 응답
                  </span>
                  {selectedSurveyData.expected_participants && selectedSurveyData.expected_participants > 0 && (
                    <span className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      예정 인원 {selectedSurveyData.expected_participants}명
                    </span>
                  )}
                </div>
              </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">개요</TabsTrigger>
                <TabsTrigger value="questions">질문별 분석</TabsTrigger>
                <TabsTrigger value="responses">개별 응답</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="flex items-center p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Users className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">총 응답</p>
                          <p className="text-2xl font-bold">{selectedSurveyData.response_count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <BarChart3 className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">질문 수</p>
                          <p className="text-2xl font-bold">{selectedSurveyData.question_count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">응답률</p>
                          <p className="text-2xl font-bold">
                            {selectedSurveyData.expected_participants && selectedSurveyData.expected_participants > 0
                              ? Math.round(
                                  (selectedSurveyData.response_count / selectedSurveyData.expected_participants) * 100
                                )
                              : 0}
                            %
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Activity className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">평균 만족도</p>
                          <p className="text-2xl font-bold">
                            {selectedSurveyData.avg_overall_satisfaction !== null
                              ? selectedSurveyData.avg_overall_satisfaction.toFixed(1)
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">문항 타입별 응답 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {questionTypeChartData.length === 0 ? (
                      <ChartEmptyState description="문항 응답 데이터가 없어 분포를 표시할 수 없습니다." />
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={questionTypeChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                          {questionTypeChartData.map((item) => (
                            <div key={item.name} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{item.name}</span>
                                <span>
                                  {item.value}개 ({item.percentage}%)
                                </span>
                              </div>
                              <Progress value={item.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="questions" className="space-y-4">
                {surveyQuestions.length === 0 ? (
                  <ChartEmptyState description="등록된 문항이 없습니다." />
                ) : (
                  <Accordion type="single" collapsible className="w-full" onValueChange={handleQuestionAccordionChange}>
                    {surveyQuestions.map((question, index) => {
                      const detail = questionDetails[question.id];
                      const loadingDetail = questionLoading[question.id];
                      return (
                        <AccordionItem key={question.id} value={question.id}>
                          <AccordionTrigger className="text-left">
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-medium">Q{index + 1}. {question.question_text}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline">{question.question_type}</Badge>
                                {detail && <span>{detail.totalAnswers}개 응답</span>}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {loadingDetail && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                문항 데이터를 불러오는 중입니다...
                              </div>
                            )}
                            {!loadingDetail && detail && (
                              <div className="space-y-4">
                                {detail.kind === 'empty' && (
                                  <ChartEmptyState description={detail.emptyMessage} />
                                )}
                                {detail.kind === 'chart' && (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={detail.chartData}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="name" />
                                          <YAxis allowDecimals={false} />
                                          <Tooltip />
                                          <Bar dataKey="value" />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2">
                                      {detail.chartData.map((item) => (
                                        <div key={item.name} className="space-y-1">
                                          <div className="flex justify-between text-sm">
                                            <span>{item.name}</span>
                                            <span>
                                              {item.value}개 ({item.percentage}%)
                                            </span>
                                          </div>
                                          <Progress value={item.percentage} className="h-2" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {detail.kind === 'rating' && (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="text-center">
                                      <div className="text-4xl font-bold text-primary mb-2">{detail.average}</div>
                                      <p className="text-muted-foreground">평균 평점</p>
                                    </div>
                                    <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie
                                            data={detail.chartData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, percentage }) => `${name}: ${percentage}%`}
                                          >
                                            {detail.chartData.map((_, idx) => (
                                              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                          </Pie>
                                          <Tooltip />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                )}
                                {detail.kind === 'text' && (
                                  <div className="space-y-2">
                                    <p className="font-medium">최근 응답 ({detail.answers.length}개)</p>
                                    <div className="space-y-2">
                                      {detail.answers.map((answer) => (
                                        <div key={answer.id} className="p-3 bg-muted/50 rounded-lg">
                                          <p className="text-sm">{answer.answer_text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </TabsContent>

              <TabsContent value="responses">
                {responsesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    응답 데이터를 불러오는 중입니다...
                  </div>
                ) : responses.length === 0 ? (
                  <ChartEmptyState description="응답이 없습니다." />
                ) : (
                  <div className="space-y-4">
                    {responses.map((response, index) => (
                      <Card key={response.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">응답 #{index + 1}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(response.submitted_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {surveyQuestions.map((question) => {
                              const answer = answers.find(
                                (item) => item.response_id === response.id && item.question_id === question.id
                              );
                              return (
                                <div key={question.id} className="border-l-2 border-muted pl-4">
                                  <p className="font-medium text-sm">{question.question_text}</p>
                                  <p className="text-sm text-muted-foreground">{answer?.answer_text || '답변 없음'}</p>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>설문 결과 이메일 전송</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">선택한 설문의 결과를 이메일로 전송합니다.</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">수신자 선택</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allInstructors.map((instructor) => (
                    <div key={instructor.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`instructor-${instructor.id}`}
                        checked={selectedRecipients.includes(instructor.email)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRecipients((prev) => [...prev, instructor.email]);
                          } else {
                            setSelectedRecipients((prev) => prev.filter((email) => email !== instructor.email));
                          }
                        }}
                      />
                      <label
                        htmlFor={`instructor-${instructor.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={instructor.photo_url} alt={instructor.name} />
                          <AvatarFallback>{instructor.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        {instructor.name} ({instructor.email})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSendResults} disabled={sendingResults}>
                  {sendingResults ? '전송 중...' : '전송'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SurveyAnalysis;
