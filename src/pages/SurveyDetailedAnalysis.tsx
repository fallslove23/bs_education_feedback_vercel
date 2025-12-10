import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowLeft, Download, Mail, Printer, Loader2, ChevronDown, Trash2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { SurveyDetailRepository } from '@/repositories/surveyDetailRepository';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatSatisfaction, formatSatisfactionType } from "@/utils/satisfaction";
import { SendSurveyResultsDialog } from '@/components/SendSurveyResultsDialog';

interface Survey {
  id: string;
  title: string;
  education_year: number;
  education_round: number;
  status: string;
  course_name?: string | null;
  instructor_id?: string | null;
  operator_name?: string | null;
  operator_contact?: string | null;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
  photo_url?: string | null;
}

// 강사별 필터 옵션
interface InstructorOption {
  key: string;
  label: string;
  instructorId: string;
  courseName?: string;
}

// 과목(강사+세션명에서 Part/세부 평가명을 제거한 그룹) 옵션
interface SubjectOption {
  key: string;        // 드롭다운 value
  label: string;      // 표시용 "강사 - 과목"
  sessionIds: string[]; // 이 과목에 속하는 세션 ID들(Part.1/2 등 포함)
}

const RATING_QUESTION_TYPES = new Set(['rating', 'scale']);
const SCORE_RANGE = Array.from({ length: 10 }, (_value, index) => index + 1);
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatAverage(value: number | null | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(1);
  }
  return '-';
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return value;
  }
}


const SurveyDetailedAnalysis = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, userRoles } = useAuth();



  // 사용자 권한 관련
  const [profile, setProfile] = useState<{ instructor_id: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const canViewAll = useMemo(
    () => (userRoles?.includes('admin') || userRoles?.includes('operator') || userRoles?.includes('director')) ?? false,
    [userRoles]
  );

  const isAdmin = useMemo(
    () => userRoles?.includes('admin') ?? false,
    [userRoles]
  );

  const isInstructor = useMemo(
    () => userRoles?.includes('instructor') ?? false,
    [userRoles]
  );

  // 데이터 상태
  const [detailStats, setDetailStats] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // 강사별/과목별 필터링 상태
  const [instructorOptions, setInstructorOptions] = useState<InstructorOption[]>([]);
  const [activeInstructor, setActiveInstructor] = useState<string>('all');
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [activeSubjectKey, setActiveSubjectKey] = useState<string>('all');
  const [sessionsByInstructor, setSessionsByInstructor] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  // 상태 추가
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);
  const [deletingResponseId, setDeletingResponseId] = useState<string | null>(null);
  const [isResponsesOpen, setIsResponsesOpen] = useState(false);

  // 프로필 정보 로드
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('instructor_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(data);
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

  const loadSurvey = useCallback(async () => {
    if (!surveyId) return;

    setLoadingSurvey(true);
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('id, title, education_year, education_round, status, course_name, instructor_id, operator_name, operator_contact')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData as Survey);

      if (surveyData?.instructor_id) {
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructors')
          .select('id, name, email, photo_url')
          .eq('id', surveyData.instructor_id)
          .single();

        if (instructorError) throw instructorError;
        setInstructor(instructorData as Instructor);
      } else {
        setInstructor(null);
      }
    } catch (err) {
      console.error('Error loading survey:', err);
      setSurvey(null);
    } finally {
      setLoadingSurvey(false);
    }
  }, [surveyId]);

  // 강사별 옵션 로드
  const loadInstructorOptions = useCallback(async () => {
    if (!surveyId) return;
    try {
      // 강사 사용자의 경우 자신의 데이터만 필터링
      const restrictToInstructorId = !canViewAll && isInstructor ? profile?.instructor_id ?? null : null;

      // 해당 설문의 세션들에서 고유한 강사 정보 추출 (운영 세션 제외)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('survey_sessions')
        .select(`
          id,
          instructor_id,
          session_name,
          subject_id,
          subjects(title)
        `)
        .eq('survey_id', surveyId)
        .not('instructor_id', 'is', null)
        .not('subject_id', 'is', null);  // subject_id가 없는 세션 제외

      if (sessionsError) throw sessionsError;

      const uniqueInstructors = new Set<string>();
      const instructorMap = new Map<string, { name: string; course: string }>();

      // 운영 세션 제외하고 강사 추출
      for (const session of sessionsData || []) {
        const instructorId = (session as any).instructor_id;
        const subjectTitle = (session as any).subjects?.title || (session as any).session_name || '';
        const isOperation = subjectTitle.includes('운영') ||
          ((session as any).session_name && (session as any).session_name.includes('운영'));

        if (instructorId && !isOperation) {
          // 강사 사용자의 경우 자신의 데이터만 포함
          if (restrictToInstructorId && instructorId !== restrictToInstructorId) {
            continue;
          }
          uniqueInstructors.add(instructorId);
        }
      }

      if (uniqueInstructors.size > 0) {
        const { data: instructorsData } = await supabase
          .from('instructors')
          .select('id, name')
          .in('id', Array.from(uniqueInstructors));

        instructorsData?.forEach((inst: any) => {
          const session = (sessionsData as any)?.find((s: any) =>
            s.instructor_id === inst.id
          );
          const sessionName = session?.subjects?.title || session?.session_name || '';

          instructorMap.set(inst.id, {
            name: inst.name,
            course: sessionName
          });
        });
      }

      const options: InstructorOption[] = Array.from(instructorMap.entries()).map(([id, info]) => ({
        key: id,
        label: info.name,
        instructorId: id,
        courseName: info.course,
      }));

      setInstructorOptions(options);
    } catch (err) {
      console.error('Error loading instructor options:', err);
      setInstructorOptions([]);
    }
  }, [surveyId, canViewAll, isInstructor, profile?.instructor_id]);

  // 과목(강사-과목) 옵션 로드
  const loadSessions = useCallback(async () => {
    if (!surveyId) return;
    try {
      // 강사 사용자의 경우 자신의 데이터만 필터링
      const restrictToInstructorId = !canViewAll && isInstructor ? profile?.instructor_id ?? null : null;

      // 세션 데이터와 과목 정보를 함께 조회
      const { data: sessData, error: sessError } = await supabase
        .from('survey_sessions')
        .select('id, session_name, instructor_id, subject_id, subjects(title)')
        .eq('survey_id', surveyId)
        .not('subject_id', 'is', null)  // subject_id가 없는 세션 제외
        .order('session_name', { ascending: true });

      if (sessError) throw sessError;

      // 운영 만족도 세션과 강사 세션을 분리
      const operationSessions: any[] = [];
      const instructorSessions: any[] = [];

      (sessData || []).forEach((s: any) => {
        const subjectTitle = s.subjects?.title || '';
        const isOperation = subjectTitle.includes('운영');

        if (isOperation) {
          operationSessions.push(s);
        } else {
          // 운영 만족도가 아닌 세션만 강사 세션으로 분류
          instructorSessions.push(s);
        }
      });

      // 강사 사용자의 경우 자신의 데이터만 필터링
      let filteredInstructorSessions = instructorSessions;
      let filteredOperationSessions = operationSessions;

      if (restrictToInstructorId) {
        filteredInstructorSessions = instructorSessions.filter((s: any) =>
          s.instructor_id === restrictToInstructorId
        );
        filteredOperationSessions = operationSessions.filter((s: any) =>
          s.instructor_id === restrictToInstructorId
        );
      }

      const allInstructorIds = Array.from(new Set([
        ...filteredInstructorSessions.map((s: any) => s.instructor_id),
        ...filteredOperationSessions.map((s: any) => s.instructor_id)
      ].filter(id => id)));

      let nameMap = new Map<string, string>();
      if (allInstructorIds.length) {
        const { data: instData } = await supabase
          .from('instructors')
          .select('id, name')
          .in('id', allInstructorIds);
        instData?.forEach((i: any) => nameMap.set(i.id, i.name || ''));
      }

      const options: SubjectOption[] = [];
      const byInstructor = new Map<string, string[]>();

      // 강사-과목 조합으로 그룹화
      const instructorSubjectMap = new Map<string, {
        sessions: string[],
        instructor_id: string,
        subject_title: string
      }>();

      filteredInstructorSessions.forEach((s: any) => {
        const key = `${s.instructor_id}_${s.subject_id}`;
        const existing = instructorSubjectMap.get(key);
        const subjectTitle = s.subjects?.title || s.session_name || '과목';

        if (existing) {
          existing.sessions.push(s.id);
        } else {
          instructorSubjectMap.set(key, {
            sessions: [s.id],
            instructor_id: s.instructor_id,
            subject_title: subjectTitle
          });
        }

        if (s.instructor_id) {
          const instArr = byInstructor.get(s.instructor_id) ?? [];
          instArr.push(s.id);
          byInstructor.set(s.instructor_id, instArr);
        }
      });

      // 그룹화된 강사-과목 옵션 생성
      instructorSubjectMap.forEach((group, key) => {
        const instr = nameMap.get(group.instructor_id) ?? '';
        const label = instr ? `${instr} - ${group.subject_title}` : group.subject_title;

        options.push({
          key: `instructor_subject_${key}`,
          label,
          sessionIds: group.sessions,
        });
      });

      // 운영 만족도를 instructor_id별로 그룹화
      const operationByInstructor = new Map<string, string[]>();
      filteredOperationSessions.forEach((s: any) => {
        const instrId = s.instructor_id || 'no_instructor';
        const sessions = operationByInstructor.get(instrId) || [];
        sessions.push(s.id);
        operationByInstructor.set(instrId, sessions);

        if (s.instructor_id) {
          const instArr = byInstructor.get(s.instructor_id) ?? [];
          instArr.push(s.id);
          byInstructor.set(s.instructor_id, instArr);
        }
      });

      // 그룹화된 운영 만족도 옵션 생성
      operationByInstructor.forEach((sessionIds, instrId) => {
        const operatorName = instrId !== 'no_instructor' && nameMap.get(instrId)
          ? nameMap.get(instrId)
          : survey?.operator_name || '운영자';

        const operationLabel = `${operatorName} - 운영 만족도`;

        options.push({
          key: `operation_${instrId}`,
          label: operationLabel,
          sessionIds: sessionIds,
        });
      });

      setSubjectOptions(options);
      setSessionsByInstructor(Object.fromEntries(byInstructor));
    } catch (err) {
      console.error('Error loading sessions:', err);
      setSubjectOptions([]);
    }
  }, [surveyId, survey?.operator_name, canViewAll, isInstructor, profile?.instructor_id]);

  const loadDetailStats = useCallback(async () => {
    if (!surveyId) return;

    setInitialLoading(true);
    setError(null);

    try {
      // 먼저 설문에 질문이 있는지 확인
      const { count: questionCount, error: checkError } = await supabase
        .from('survey_questions')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', surveyId);

      if (checkError) throw checkError;

      // 질문이 없으면 에러 표시
      if (!questionCount || questionCount === 0) {
        setError('이 설문에는 질문이 없습니다. 설문 구성을 확인해주세요.');
        return;
      }

      const stats = await SurveyDetailRepository.fetchSurveyDetailStats({
        surveyId,
        includeTestData: false, // 테스트 데이터 제외
        responseLimit: 9999,
        distributionLimit: 9999,
        textLimit: 9999,
      });

      setDetailStats(stats);
    } catch (err) {
      console.error('Error loading detail stats:', err);
      setError('분석 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setInitialLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId, loadSurvey]);

  useEffect(() => {
    if (surveyId && !profileLoading) {
      loadInstructorOptions();
      loadSessions();
    }
  }, [surveyId, loadInstructorOptions, loadSessions, profileLoading]);

  // URL 쿼리 파라미터에서 instructorId를 읽어 필터 자동 설정
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const instructorIdFromUrl = searchParams.get('instructorId');

    if (instructorIdFromUrl && instructorOptions.length > 0) {
      const matchedOption = instructorOptions.find(opt => opt.instructorId === instructorIdFromUrl);
      if (matchedOption) {
        setActiveInstructor(matchedOption.key);
      }
    }
  }, [location.search, instructorOptions]);

  // 강사 사용자인 경우 자신의 ID로 필터 자동 설정
  useEffect(() => {
    if (!canViewAll && isInstructor && profile?.instructor_id && instructorOptions.length > 0) {
      const myOption = instructorOptions.find(opt => opt.instructorId === profile.instructor_id);
      if (myOption) {
        setActiveInstructor(myOption.key);
      }
    }
  }, [canViewAll, isInstructor, profile?.instructor_id, instructorOptions]);

  useEffect(() => {
    if (!canViewAll && isInstructor && profile?.instructor_id && subjectOptions.length > 0) {
      // 자신과 관련된 과목이 있으면 첫 번째 것으로 자동 설정
      const mySubjects = subjectOptions.filter(opt =>
        opt.label.includes(instructorOptions.find(iOpt => iOpt.instructorId === profile.instructor_id)?.label.split(' - ')[0] || '')
      );
      if (mySubjects.length > 0) {
        setActiveTab(mySubjects[0].key);
      }
    }
  }, [canViewAll, isInstructor, profile?.instructor_id, subjectOptions, instructorOptions]);

  const displayedSubjectOptions = useMemo(() => {
    if (activeInstructor === 'all') return subjectOptions;
    const ids = new Set(sessionsByInstructor[activeInstructor] ?? []);
    return subjectOptions.filter(opt => opt.sessionIds.some(id => ids.has(id)));
  }, [activeInstructor, subjectOptions, sessionsByInstructor]);

  useEffect(() => {
    const availableKeys = new Set(displayedSubjectOptions.map(o => o.key));
    if (activeSubjectKey !== 'all' && !availableKeys.has(activeSubjectKey)) {
      setActiveSubjectKey('all');
    }
  }, [activeInstructor, displayedSubjectOptions, activeSubjectKey]);

  useEffect(() => {
    if (surveyId) {
      loadDetailStats();
    }
  }, [surveyId, loadDetailStats]);

  const handleSendResults = useCallback(() => {
    setSendDialogOpen(true);
  }, []);

  const handleDeleteAnswer = useCallback(async (answerId: string) => {
    if (!isAdmin) {
      toast({
        title: '권한 없음',
        description: '관리자만 답변을 삭제할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('question_answers')
        .delete()
        .eq('id', answerId);

      if (error) throw error;

      toast({
        title: '삭제 완료',
        description: '답변이 성공적으로 삭제되었습니다.',
      });

      // 데이터 새로고침
      loadDetailStats();
    } catch (err) {
      console.error('Error deleting answer:', err);
      toast({
        title: '삭제 실패',
        description: '답변 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [isAdmin, toast, loadDetailStats]);

  const handleDeleteResponse = useCallback(async (responseId: string) => {
    if (!isAdmin) {
      toast({
        title: '권한 없음',
        description: '관리자만 응답을 삭제할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // survey_responses 삭제 시 question_answers도 cascade로 함께 삭제됨
      const { error } = await supabase
        .from('survey_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: '삭제 완료',
        description: '응답이 성공적으로 삭제되었습니다.',
      });

      // 데이터 새로고침
      loadDetailStats();
    } catch (err) {
      console.error('Error deleting response:', err);
      toast({
        title: '삭제 실패',
        description: '응답 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [isAdmin, toast, loadDetailStats]);

  const generateCSV = useCallback(() => {
    if (!survey || !detailStats) return '';

    let csv = '설문 상세 분석 결과\n';
    csv += `설문명: ${survey.title}\n`;
    csv += `교육년도: ${survey.education_year}년\n`;
    csv += `교육차수: ${survey.education_round}차\n`;
    csv += `총 응답 수: ${detailStats.summary.responseCount}\n\n`;

    csv += `전체 만족도,${formatAverage(detailStats.summary.avgOverall)}/10\n`;
    csv += `과목 만족도,${formatAverage(detailStats.summary.avgCourse)}/10\n`;
    csv += `강사 만족도,${formatAverage(detailStats.summary.avgInstructor)}/10\n`;
    csv += `운영 만족도,${formatAverage(detailStats.summary.avgOperation)}/10\n\n`;

    if (detailStats.textAnswers.items.length > 0) {
      csv += '피드백 내용\n';
      detailStats.textAnswers.items.forEach((answer: any, index: number) => {
        csv += `${index + 1},"${answer.answerText.replace(/"/g, '""')}"\n`;
      });
    }

    return csv;
  }, [detailStats, survey]);

  const handleDownload = useCallback(() => {
    const csv = generateCSV();
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `survey_analysis_${survey?.title || 'results'}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generateCSV, survey?.title]);

  // 주제(과목/운영) 우선 필터 → 없으면 강사 필터
  const selectedSessionIds = useMemo(() => {
    if (activeSubjectKey && activeSubjectKey !== 'all') {
      const opt = subjectOptions.find(o => o.key === activeSubjectKey);
      return opt?.sessionIds ?? [];
    }
    if (activeInstructor !== 'all') return sessionsByInstructor[activeInstructor] ?? [];
    return null;
  }, [activeSubjectKey, activeInstructor, subjectOptions, sessionsByInstructor]);

  // 세션 ID 기준 필터링 - 분포 데이터
  const filteredQuestions = useMemo(() => {
    const items = detailStats?.distributions?.items || [];
    if (!selectedSessionIds) return items;
    const sessionSet = new Set(selectedSessionIds);
    return items.filter((q: any) => !q.sessionId || sessionSet.has(q.sessionId));
  }, [detailStats, selectedSessionIds]);

  // 세션 ID 기준 필터링 - 텍스트 데이터
  const filteredTextAnswers = useMemo(() => {
    const items = detailStats?.textAnswers?.items || [];
    if (!selectedSessionIds) return items;
    const sessionSet = new Set(selectedSessionIds);
    return items.filter((a: any) => !a.sessionId || sessionSet.has(a.sessionId));
  }, [detailStats, selectedSessionIds]);

  // 세션 ID 기준 필터링 - 응답 데이터
  const filteredResponses = useMemo(() => {
    const items = detailStats?.responses?.items || [];
    if (!selectedSessionIds) return items;
    const sessionSet = new Set(selectedSessionIds);
    return items.filter((r: any) => !r.sessionId || sessionSet.has(r.sessionId));
  }, [detailStats, selectedSessionIds]);

  // 텍스트 피드백 그룹핑
  const textFeedbacks = useMemo(() => {
    if (!filteredTextAnswers.length) return [];

    // 질문별로 그룹핑
    const grouped = filteredTextAnswers.reduce((acc: any, answer: any) => {
      if (!acc[answer.questionId]) {
        acc[answer.questionId] = {
          questionId: answer.questionId,
          questionText: answer.questionText,
          satisfactionType: answer.satisfactionType,
          orderIndex: answer.orderIndex,
          answers: []
        };
      }
      acc[answer.questionId].answers.push(answer);
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) =>
      (a.orderIndex || 0) - (b.orderIndex || 0)
    );
  }, [filteredTextAnswers]);

  // 평점 분석
  const ratingAnalysis = useMemo(() => {
    return filteredQuestions
      .filter((question: any) => RATING_QUESTION_TYPES.has(question.questionType))
      .map((question: any) => {
        const chartData = SCORE_RANGE.map((score) => ({
          name: `${score}점`,
          value: question.ratingDistribution[score] || 0,
          percentage: question.totalAnswers > 0
            ? Math.round(((question.ratingDistribution[score] || 0) / question.totalAnswers) * 100)
            : 0,
        }));

        return {
          question: {
            id: question.questionId,
            question_text: question.questionText,
            satisfaction_type: question.satisfactionType,
            order_index: question.orderIndex,
          },
          average: question.average || 0,
          totalAnswers: question.totalAnswers,
          distribution: question.ratingDistribution,
          chartData
        };
      });
  }, [filteredQuestions]);

  // 선택한 강사 기준 요약값 재계산
  const filteredSummary = useMemo(() => {
    if (!detailStats) return null;
    if (activeInstructor === 'all' || !selectedSessionIds || selectedSessionIds.length === 0) return null;

    const isRating = (q: any) => RATING_QUESTION_TYPES.has(q.questionType);

    // 선택된 세션의 평점 문항만 수집
    const sessionSet = new Set(selectedSessionIds);
    const qs = (detailStats?.distributions?.items || []).filter((q: any) => {
      if (!isRating(q)) return false;
      return !q.sessionId || sessionSet.has(q.sessionId);
    });

    const weightedAvg = (items: any[], typeFilter?: string) => {
      const filtered = items.filter((q: any) => {
        if (q == null) return false;
        const avg = Number(q.average);
        if (!Number.isFinite(avg)) return false;
        if (!typeFilter) return true;
        const t = (q.satisfactionType || '').toLowerCase();
        return t === typeFilter;
      });

      const { wsum, wcount } = filtered.reduce(
        (acc: { wsum: number; wcount: number }, q: any) => {
          const count = Number(q.totalAnswers) || 0;
          const avg = Number(q.average) || 0;
          return { wsum: acc.wsum + avg * count, wcount: acc.wcount + count };
        },
        { wsum: 0, wcount: 0 }
      );

      return wcount > 0 ? wsum / wcount : null;
    };

    // 선택된 세션의 질문에 답변한 고유 응답 ID 수집
    const uniqueResponseIds = new Set<string>();
    (detailStats?.distributions?.items || []).forEach((q: any) => {
      if (q.sessionId && sessionSet.has(q.sessionId)) {
        // 각 질문의 응답 ID들을 수집
        if (q.responseIds && Array.isArray(q.responseIds)) {
          q.responseIds.forEach((id: string) => uniqueResponseIds.add(id));
        }
      }
    });

    // 텍스트 답변에서도 응답 ID 수집
    (detailStats?.textAnswers?.items || []).forEach((a: any) => {
      if (a.sessionId && sessionSet.has(a.sessionId) && a.responseId) {
        uniqueResponseIds.add(a.responseId);
      }
    });

    // uniqueResponseIds가 없으면 filteredResponses 길이 사용
    const responseCount = uniqueResponseIds.size > 0 ? uniqueResponseIds.size : filteredResponses.length;

    return {
      responseCount,
      avgOverall: weightedAvg(qs),
      avgCourse: weightedAvg(qs, 'course'),
      avgInstructor: weightedAvg(qs, 'instructor'),
      avgOperation: weightedAvg(qs, 'operation'),
    };
  }, [detailStats, activeInstructor, selectedSessionIds, filteredResponses]);

  const summaryToShow = filteredSummary ?? detailStats?.summary;

  if (!surveyId) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">유효한 설문 ID가 제공되지 않았습니다.</p>
      </div>
    );
  }

  if (loadingSurvey || initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">설문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleNavigateBack = () => {
    const from = (location.state as { from?: string } | undefined)?.from;
    if (from === 'survey-management') {
      navigate('/surveys-v2');
    } else {
      navigate('/dashboard/results');
    }
  };

  const renderSummaryCard = (title: string, value: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {value !== '-' && (
          <Progress value={Number(value) * 10} className="mt-2" />
        )}
      </CardContent>
    </Card>
  );

  const renderRatingChart = (analysis: typeof ratingAnalysis[0]) => {
    const chartData = SCORE_RANGE.map((score) => ({
      name: `${score}점`,
      value: analysis.distribution[score] || 0,
      percentage: analysis.totalAnswers > 0 ? Math.round(((analysis.distribution[score] || 0) / analysis.totalAnswers) * 100) : 0,
    }));

    return (
      <div className="w-full">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsBarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value: number | string, _name, props) => {
                const percentage = props?.payload?.percentage ?? 0;
                return [`${value}개 (${percentage}%)`, '응답 수'];
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="space-y-2 w-full sm:w-auto">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="sm" onClick={handleNavigateBack} className="flex-shrink-0 mt-1 print:hidden">
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로 가기
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold break-words break-keep leading-tight">{survey.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pl-1">
            <div className="flex items-center gap-2">
              <span>{survey.education_year}년 {survey.education_round}차</span>
              <span className="hidden sm:inline text-muted-foreground/50">|</span>
              <span>{survey.course_name}</span>
            </div>
            <Badge variant={survey.status === 'completed' ? 'secondary' : 'outline'}>
              {survey.status === 'completed' ? '완료' : '진행 중'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end print:hidden">
          <Button variant="outline" onClick={handleDownload} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">CSV 다운로드</span>
            <span className="sm:hidden">다운로드</span>
          </Button>
          <Button onClick={handleSendResults} className="flex-1 sm:flex-none">
            <Mail className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">결과 전송</span>
            <span className="sm:hidden">전송</span>
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="flex-none">
            <Printer className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">인쇄</span>
          </Button>
        </div>
      </div>

      {/* 강사별 필터 */}
      {instructorOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              강사 또는 과목을 선택하여 상세 분석을 확인하세요.
              {!canViewAll && isInstructor && (
                <Badge variant="secondary" className="text-xs">
                  내 데이터만 표시
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">강사 선택</label>
                <Select
                  value={activeInstructor}
                  onValueChange={setActiveInstructor}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="강사 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">전체 강사</SelectItem>
                    {instructorOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">과목/운영 선택</label>
                <Select
                  value={activeSubjectKey}
                  onValueChange={setActiveSubjectKey}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="과목/운영 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">전체</SelectItem>
                    {displayedSubjectOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!detailStats ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">분석할 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 응답 수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryToShow?.responseCount ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">종합 만족도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatAverage(summaryToShow?.avgOverall)}</div>
                <Progress value={(summaryToShow?.avgOverall || 0) * 10} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">과목 만족도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAverage(summaryToShow?.avgCourse)}</div>
                <Progress value={(summaryToShow?.avgCourse || 0) * 10} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">강사 만족도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAverage(summaryToShow?.avgInstructor)}</div>
                <Progress value={(summaryToShow?.avgInstructor || 0) * 10} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">운영 만족도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAverage(summaryToShow?.avgOperation)}</div>
                <Progress value={(summaryToShow?.avgOperation || 0) * 10} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* 평점별 분석 */}
          {ratingAnalysis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>평가별 분석</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {ratingAnalysis.length}개 평가 항목의 상세 분석 결과입니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {ratingAnalysis.map((analysis, index) => (
                    <div key={analysis.question.id} className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium mb-1">
                            {String(index + 1).padStart(2, '0')}. {analysis.question.question_text}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>평균: {formatAverage(analysis.average)}/10</span>
                            <span>{analysis.totalAnswers}개 응답</span>
                            {analysis.question.satisfaction_type && (
                              <Badge variant="outline" className="text-xs">
                                {formatSatisfactionType(analysis.question.satisfaction_type)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {formatAverage(analysis.average)}
                          </div>
                          <div className="text-xs text-muted-foreground">/ 10</div>
                        </div>
                      </div>
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={200}>
                          <RechartsBarChart data={analysis.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                              formatter={(value: number | string, _name, props) => {
                                const percentage = props?.payload?.percentage ?? 0;
                                return [`${value}개 (${percentage}%)`, '응답 수'];
                              }}
                            />
                            <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 텍스트 피드백 */}
          {textFeedbacks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>텍스트 피드백</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const feedbackCount = textFeedbacks.reduce((total: number, group: any) => total + (group.answers?.length || 0), 0);
                    return `${feedbackCount}개의 피드백이 있습니다.`;
                  })()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                  {textFeedbacks.map((group: any) => (
                    <div key={group.questionId} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                        {group.questionText}
                        {group.satisfactionType && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {formatSatisfactionType(group.satisfactionType)}
                          </Badge>
                        )}
                      </h4>
                      <div className="space-y-2">
                        {group.answers.map((answer: any, index: number) => (
                          <div key={answer.answerId} className="p-3 bg-muted/50 rounded-lg relative group">
                            <p className="text-sm pr-8">{answer.answerText}</p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(answer.createdAt)}
                            </div>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => setDeletingAnswerId(answer.answerId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                <ConfirmDialog
                                  open={deletingAnswerId === answer.answerId}
                                  onOpenChange={(open) => !open && setDeletingAnswerId(null)}
                                  title="답변 삭제"
                                  description="이 답변을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                                  primaryAction={{
                                    label: '삭제',
                                    variant: 'destructive',
                                    onClick: () => {
                                      handleDeleteAnswer(answer.answerId);
                                      setDeletingAnswerId(null);
                                    }
                                  }}
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 응답 목록 */}
          <Collapsible open={isResponsesOpen} onOpenChange={setIsResponsesOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle>응답 목록</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {filteredResponses.length}개 응답
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isResponsesOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredResponses.slice(0, 50).map((response: any) => (
                      <div key={response.id} className="flex items-center justify-between p-2 bg-muted/30 rounded relative group">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {response.respondentEmail || '익명 응답자'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(response.submittedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {response.isTest && (
                            <Badge variant="outline" className="text-xs">
                              테스트
                            </Badge>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => setDeletingResponseId(response.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              <ConfirmDialog
                                open={deletingResponseId === response.id}
                                onOpenChange={(open) => !open && setDeletingResponseId(null)}
                                title="응답 삭제"
                                description={`${response.respondentEmail || '익명 응답자'}의 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 해당 응답의 모든 답변이 함께 삭제됩니다.`}
                                primaryAction={{
                                  label: '삭제',
                                  variant: 'destructive',
                                  onClick: () => {
                                    handleDeleteResponse(response.id);
                                    setDeletingResponseId(null);
                                  }
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {/* 이메일 전송 다이얼로그 */}
      <SendSurveyResultsDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        surveyId={surveyId!}
        surveyTitle={survey.title}
        responseCount={detailStats?.summary?.responseCount || 0}
        instructorId={profile?.instructor_id}
        isInstructor={isInstructor}
      />
    </div>
  );
};

export default SurveyDetailedAnalysis;