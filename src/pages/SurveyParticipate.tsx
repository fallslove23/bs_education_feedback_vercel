import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAnonymousSession } from '@/hooks/useAnonymousSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Send, KeyRound, AlertCircle, CheckCircle, FileText, ClipboardCheck, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { InstructorInfoSection } from '@/components/InstructorInfoSection';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import LoadingScreen from '@/components/LoadingScreen';
import { cn } from '@/lib/utils';

interface Survey {
  id: string;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  template_id?: string | null;
  instructor_id?: string | null;
}

interface SurveySession {
  id: string;
  survey_id: string;
  subject_id: string | null;
  instructor_id: string | null;
  session_order: number;
  session_name: string;
  subject?: {
    id: string;
    title: string;
  };
  instructor?: {
    id: string;
    name: string;
    email?: string;
    photo_url?: string;
    bio?: string;
  };
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  order_index: number;
  section_id?: string | null;
  session_id?: string | null;
  satisfaction_type?: string | null;
  scope: 'session' | 'operation';
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  bio?: string;
}

interface SessionAnswer {
  sessionId: string;
  questionAnswers: Answer[];
  attended: boolean;
}
interface Section {
  id: string;
  name: string;
  description?: string;
  order_index: number;
}
interface Answer {
  questionId: string;
  answer: string | string[];
}

const NO_SECTION_KEY = '__no_section__';

const groupQuestionsBySection = (questionsList: Question[], sectionsList: Section[]): Question[][] => {
  if (!questionsList || questionsList.length === 0) {
    return [];
  }

  const groups: Question[][] = [];
  const orderedSections = [...sectionsList].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const bySection = new Map<string, Question[]>();
  const sortedQuestions = [...questionsList].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  for (const question of sortedQuestions) {
    const key = (question.section_id as string | null) ?? NO_SECTION_KEY;
    if (!bySection.has(key)) {
      bySection.set(key, []);
    }
    bySection.get(key)!.push(question);
  }

  for (const section of orderedSections) {
    const list = bySection.get(section.id);
    if (list && list.length > 0) {
      groups.push(list);
    }
  }

  const noSectionList = bySection.get(NO_SECTION_KEY);
  if (noSectionList && noSectionList.length > 0) {
    groups.push(noSectionList);
  }

  return groups;
};

const clampIndex = (index: number, total: number) => {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index > total - 1) return total - 1;
  return index;
};

const isAnswerProvided = (answer?: Answer) => {
  if (!answer) return false;
  if (Array.isArray(answer.answer)) {
    return answer.answer.length > 0;
  }
  if (typeof answer.answer === 'string') {
    return answer.answer.trim() !== '';
  }
  return false;
};

const countAnsweredForQuestions = (answers: Answer[], questionList: Question[]) => {
  let count = 0;
  for (const question of questionList) {
    const answer = answers.find((a) => a.questionId === question.id);
    if (isAnswerProvided(answer)) {
      count++;
    }
  }
  return count;
};

interface SurveyAutosaveData {
  answers: Record<string, string | string[]>;
  currentStep: number;
  updatedAt: number;
  phase?: 'intro' | 'survey' | 'completed';
}

const SurveyParticipate = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const { session, loading: sessionLoading, checkSurveyCompletion, markSurveyCompleted, validateToken } =
    useAnonymousSession();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [surveySessions, setSurveySessions] = useState<SurveySession[]>([]);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [isCourseEvaluation, setIsCourseEvaluation] = useState(false);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [currentQuestionInstructor, setCurrentQuestionInstructor] = useState<Instructor | null>(null);
  const [tokenCode, setTokenCode] = useState('');
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveyPhase, setSurveyPhase] = useState<'intro' | 'survey' | 'completed'>('intro');

  const completedKey = surveyId ? `survey_completed_${surveyId}` : '';
  const autosaveKey = useMemo(() => (surveyId ? `survey_autosave_${surveyId}` : null), [surveyId]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const restoredOnceRef = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!surveyId || sessionLoading) return;

      const lsCompleted = completedKey && localStorage.getItem(completedKey) === '1';
      if (lsCompleted) {
        setAlreadyCompleted(true);
        setLoading(false);
        return;
      }

      if (session) {
        try {
          const isCompleted = await checkSurveyCompletion(surveyId);
          if (isCompleted) {
            setAlreadyCompleted(true);
            setLoading(false);
            return;
          }
        } catch {/* no-op */ }
      }

      const urlToken = searchParams.get('code');
      if (urlToken) {
        try {
          const isValid = await validateToken(surveyId, urlToken);
          if (!isValid) {
            toast({
              variant: 'destructive',
              title: '유효하지 않은 코드',
              description: '코드가 만료되었거나 이미 사용된 코드입니다. 계속 진행합니다.',
            });
          }
          setTokenValidated(true);
          setTokenCode(urlToken);
        } catch {/* 검증 실패해도 설문은 로드 */ }
      }

      await fetchSurveyData();
    };

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, session, sessionLoading, searchParams]);

  // 현재 스텝(그룹)의 첫 질문 기준으로 강사 정보 표시


  const handleTokenSubmit = async () => {
    if (!tokenCode.trim() || !surveyId) return;
    const isValid = await validateToken(surveyId, tokenCode.trim());
    if (isValid) {
      setTokenValidated(true);
      setNeedsToken(false);
      await fetchSurveyData();
      toast({ title: '코드 확인됨', description: '설문에 참여할 수 있습니다.' });
    } else {
      toast({ variant: 'destructive', title: '유효하지 않은 코드', description: '코드를 다시 확인해주세요.' });
    }
  };

  const fetchSurveyData = async () => {
    try {
      console.log('🔍 익명 사용자 설문 접근 시도 - Survey ID:', surveyId);

      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!template_id (
            id, name, is_course_evaluation
          )
        `)
        .eq('id', surveyId)
        .maybeSingle();

      // 세션 기반 설문인지 확인하고 자동 리다이렉션
      if (surveyData) {
        const { data: sessionsData } = await supabase
          .from('survey_sessions')
          .select('id')
          .eq('survey_id', surveyId)
          .limit(1);

        if (sessionsData && sessionsData.length > 0) {
          console.log('🔄 세션 기반 설문 감지, 자동 리다이렉션');
          const currentParams = searchParams.toString();
          const redirectUrl = `/survey-session/${surveyId}${currentParams ? `?${currentParams}` : ''}`;
          navigate(redirectUrl, { replace: true });
          return;
        }
      }

      if (surveyError) {
        console.error('❌ 익명 사용자 설문 접근 실패:', surveyError);
        // 더 구체적인 에러 처리
        if (surveyError.code === 'PGRST116') {
          toast({
            title: '설문을 찾을 수 없습니다',
            description: '설문이 존재하지 않거나 접근할 수 없습니다.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '설문 로딩 실패',
            description: '설문을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            variant: 'destructive',
          });
        }
        setError(surveyError.message);
        return;
      }
      if (!surveyData) {
        toast({
          title: '설문을 찾을 수 없습니다',
          description: '해당 설문이 존재하지 않거나 비활성화되었습니다.',
          variant: 'destructive',
        });
        setError('설문 데이터가 없습니다');
        return;
      }

      // 설문 시간 체크
      const timeZone = 'Asia/Seoul';
      const now = new Date();
      const startDate = surveyData.start_date ? new Date(surveyData.start_date) : null;
      const endDate = surveyData.end_date ? new Date(surveyData.end_date) : null;

      // 설문이 아직 시작되지 않은 경우
      if (startDate && now < startDate) {
        setError(`설문 시작 시간이 아직 되지 않았습니다. 설문 시작: ${startDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        return;
      }

      // 설문이 이미 종료된 경우
      if (endDate && now > endDate) {
        setError(`설문이 종료되었습니다. 설문 종료: ${endDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        return;
      }

      // 설문이 비활성 상태인 경우
      if (surveyData.status !== 'active' && surveyData.status !== 'public') {
        setError('현재 참여할 수 없는 설문입니다.');
        return;
      }

      setSurvey(surveyData);

      const isCourseEval = surveyData.survey_templates?.is_course_evaluation;
      setIsCourseEvaluation(!!isCourseEval);

      // 세션 기반 설문이면 세션 전용 참여 화면으로 이동
      if (surveyData.is_grouped) {
        navigate(`/survey-session/${surveyId}`, { replace: true });
        return;
      }
      const { data: sess } = await supabase
        .from('survey_sessions')
        .select('id')
        .eq('survey_id', surveyId)
        .limit(1);
      if (sess && sess.length > 0) {
        navigate(`/survey-session/${surveyId}`, { replace: true });
        return;
      }

      // 강사 정보 가져오기 - 단순하고 확실한 방법
      let instructorData = null;

      // survey_instructors 테이블에서 강사 정보 조회
      const { data: surveyInstructors, error: siError } = await supabase
        .from('survey_instructors')
        .select(`
          instructors (
            id,
            name,
            email,
            photo_url,
            bio
          )
        `)
        .eq('survey_id', surveyId);

      if (!siError && surveyInstructors && surveyInstructors.length > 0) {
        const instructors = surveyInstructors
          .map(si => si.instructors)
          .filter(Boolean) as Instructor[];

        if (instructors.length > 0) {
          instructorData = {
            id: instructors[0].id,
            name: instructors.map(i => i.name).join(', '),
            email: instructors[0].email,
            photo_url: instructors[0].photo_url,
            bio: instructors[0].bio
          };
        }
      }

      // 개별 instructor_id로 조회 (backup)
      if (!instructorData && surveyData.instructor_id) {
        const { data: singleInstructor } = await supabase
          .from('instructors')
          .select('*')
          .eq('id', surveyData.instructor_id)
          .maybeSingle();
        if (singleInstructor) instructorData = singleInstructor;
      }

      if (instructorData) setInstructor(instructorData);

      const { data: sectionsData } = await supabase
        .from('survey_sections')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');
      const sectionsList = sectionsData || [];
      setSections(sectionsList);

      const { data: questionsData } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      const typedQuestions = (questionsData || []).map((q) => ({
        ...q,
        scope: (q.scope as 'session' | 'operation') || 'session',
      }));
      setQuestions(typedQuestions);

      const groupsForSaved = groupQuestionsBySection(typedQuestions, sectionsList);
      let initialAnswers = typedQuestions.map((q) => ({
        questionId: q.id,
        answer: q.question_type === 'multiple_choice_multiple' ? [] : '',
      }));
      let restoredStep = 0;
      let restoredPhase: 'intro' | 'survey' | 'completed' | null = null;
      let restoredUpdatedAt: number | null = null;
      let restored = false;

      if (autosaveKey && typeof window !== 'undefined') {
        const rawSaved = localStorage.getItem(autosaveKey);
        if (rawSaved) {
          try {
            const parsed = JSON.parse(rawSaved) as SurveyAutosaveData;
            restored = true;
            if (parsed.answers) {
              initialAnswers = initialAnswers.map((answer) => {
                const savedValue = parsed.answers[answer.questionId];
                return savedValue !== undefined ? { ...answer, answer: savedValue } : answer;
              });
            }
            if (typeof parsed.currentStep === 'number') {
              restoredStep = clampIndex(parsed.currentStep, groupsForSaved.length);
            }
            if (typeof parsed.updatedAt === 'number') {
              restoredUpdatedAt = parsed.updatedAt;
            }
            if (parsed.phase === 'survey') {
              restoredPhase = 'survey';
            }
          } catch (parseError) {
            console.error('임시 저장 데이터 복원 실패:', parseError);
          }
        }
      }

      if (restoredUpdatedAt) {
        setLastSavedAt(restoredUpdatedAt);
      } else {
        setLastSavedAt(null);
      }

      if (restoredPhase === 'survey') {
        setSurveyPhase('survey');
      }

      setHasSavedProgress(restored);
      setAutoSaveStatus(restored ? 'saved' : 'idle');
      if (restored) {
        if (!restoredOnceRef.current) {
          toast({
            title: '임시 저장된 응답을 복원했습니다',
            description: '이전에 작성하던 위치에서 이어집니다.',
          });
          restoredOnceRef.current = true;
        }
      } else {
        restoredOnceRef.current = false;
      }

      setAnswers(initialAnswers);
      setCurrentStep(restoredStep);
    } catch (error) {
      console.error('Error fetching survey data:', error);
      toast({
        title: '오류가 발생했습니다',
        description: '설문 데이터를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => prev.map((a) => (a.questionId === questionId ? { ...a, answer: value } : a)));
  };

  const createEmptyAnswers = useCallback(() => {
    return questions.map((q) => ({
      questionId: q.id,
      answer: q.question_type === 'multiple_choice_multiple' ? [] : '',
    }));
  }, [questions]);

  const saveProgressToStorage = useCallback(
    (options?: { notify?: boolean }) => {
      if (!autosaveKey || typeof window === 'undefined') return;
      const payload: SurveyAutosaveData = {
        answers: answers.reduce<Record<string, string | string[]>>((acc, current) => {
          acc[current.questionId] = current.answer;
          return acc;
        }, {}),
        currentStep,
        updatedAt: Date.now(),
        phase: surveyPhase,
      };

      try {
        localStorage.setItem(autosaveKey, JSON.stringify(payload));
        setLastSavedAt(payload.updatedAt);
        setAutoSaveStatus('saved');
        setHasSavedProgress(true);
        if (options?.notify) {
          toast({ title: '임시 저장 완료', description: '진행 상황이 안전하게 저장되었습니다.' });
        }
      } catch (storageError) {
        console.error('임시 저장 실패:', storageError);
        setAutoSaveStatus('error');
        if (options?.notify) {
          toast({
            title: '임시 저장 실패',
            description: '브라우저 저장소에 접근할 수 없습니다.',
            variant: 'destructive',
          });
        }
      }
    },
    [answers, autosaveKey, currentStep, surveyPhase, toast]
  );

  const clearProgress = useCallback(
    (options?: { goToIntro?: boolean; notify?: boolean }) => {
      if (typeof window !== 'undefined') {
        if (autosaveKey) {
          localStorage.removeItem(autosaveKey);
        }
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
      }

      setAnswers(createEmptyAnswers());
      setCurrentStep(0);
      setAutoSaveStatus('idle');
      setLastSavedAt(null);
      setHasSavedProgress(false);
      restoredOnceRef.current = false;
      if (options?.goToIntro) {
        setSurveyPhase('intro');
      }
      if (options?.notify) {
        toast({ title: '임시 저장을 초기화했습니다', description: '처음부터 설문을 다시 진행할 수 있습니다.' });
      }
    },
    [autosaveKey, createEmptyAnswers, toast]
  );

  const questionGroups = useMemo(() => groupQuestionsBySection(questions, sections), [questions, sections]);
  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  useEffect(() => {
    if (questionGroups.length === 0) return;
    if (currentStep >= questionGroups.length) {
      setCurrentStep(questionGroups.length - 1);
    }
  }, [currentStep, questionGroups.length]);
  const currentQuestions = useMemo(() => questionGroups[currentStep] || [], [questionGroups, currentStep]);
  const totalSteps = questionGroups.length;

  useEffect(() => {
    if (!autosaveKey || typeof window === 'undefined') return;
    if (loading || surveyPhase !== 'survey') return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setAutoSaveStatus('saving');
    const timeoutId = window.setTimeout(() => {
      saveProgressToStorage();
      saveTimeoutRef.current = null;
    }, 1000);
    saveTimeoutRef.current = timeoutId;

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [answers, autosaveKey, loading, saveProgressToStorage, surveyPhase]);

  const lastSavedRelative = useMemo(() => {
    if (!lastSavedAt) return null;
    return formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true, locale: ko });
  }, [lastSavedAt]);

  const autosaveStatusMessage = useMemo(() => {
    if (autoSaveStatus === 'saving') return '자동 저장 중...';
    if (autoSaveStatus === 'error') return '임시 저장 실패';
    if (lastSavedRelative) {
      return `임시 저장 ${lastSavedRelative}`;
    }
    if (autoSaveStatus === 'saved') return '임시 저장 완료';
    return '자동 저장 대기 중';
  }, [autoSaveStatus, lastSavedRelative]);

  const stepItems = useMemo(
    () =>
      questionGroups.map((group, index) => {
        const firstQuestion = group[0];
        const section = firstQuestion?.section_id ? sectionMap.get(firstQuestion.section_id) : undefined;
        const label = section?.name ?? '기타 문항';
        const answeredCount = countAnsweredForQuestions(answers, group);
        const completion = group.length > 0 ? Math.round((answeredCount / group.length) * 100) : 0;
        return {
          index,
          label,
          answeredCount,
          total: group.length,
          completion,
          isCurrent: index === currentStep,
          isCompleted: group.length > 0 && answeredCount === group.length,
        };
      }),
    [answers, currentStep, questionGroups, sectionMap]
  );

  const handleStepSelect = (index: number) => {
    setCurrentStep(index);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleManualSave = () => {
    saveProgressToStorage({ notify: true });
  };

  const handleResetProgress = (goToIntro = false) => {
    clearProgress({ goToIntro, notify: true });
  };

  const handleResumeProgress = () => {
    setSurveyPhase('survey');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 현재 스텝의 첫 질문 기준으로 강사 정보 업데이트
  useEffect(() => {
    const update = async () => {
      const currentQuestion = currentQuestions[0];
      if (!currentQuestion) {
        setCurrentQuestionInstructor(null);
        return;
      }

      if (currentQuestion.satisfaction_type === 'instructor') {
        if (currentQuestion.session_id) {
          try {
            const { data: sessionData } = await supabase
              .from('survey_sessions')
              .select(`
                instructor_id,
                instructors (
                  id,
                  name,
                  email,
                  photo_url,
                  bio
                )
              `)
              .eq('id', currentQuestion.session_id)
              .maybeSingle();

            if (sessionData?.instructors) {
              setCurrentQuestionInstructor(sessionData.instructors as Instructor);
              return;
            }
          } catch (e) {
            console.error('Error fetching session instructor:', e);
          }
        }
        // 세션별 강사 정보가 없으면 기본 강사 사용
        setCurrentQuestionInstructor(instructor ?? null);
      } else {
        setCurrentQuestionInstructor(null);
      }
    };
    update();
  }, [currentQuestions, instructor]);

  const validateCurrentStep = () => {
    for (const question of currentQuestions) {
      if (question.is_required) {
        const a = answers.find((x) => x.questionId === question.id);
        if (!a || !a.answer) return false;
        if (Array.isArray(a.answer) && a.answer.length === 0) return false;
        if (typeof a.answer === 'string' && a.answer.trim() === '') return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast({ title: '필수 항목을 완성해 주세요', description: '모든 필수 질문에 답변해 주세요.', variant: 'destructive' });
      return;
    }
    setCurrentStep((p) => p + 1);
  };

  const handlePrevious = () => setCurrentStep((p) => p - 1);

  const isTestMode = searchParams.get('mode') === 'test';

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast({ title: '필수 항목을 완성해 주세요', description: '모든 필수 질문에 답변해 주세요.', variant: 'destructive' });
      return;
    }

    if (isTestMode) {
      setSubmitting(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('🧪 [TEST MODE] 설문 제출 시뮬레이션 완료');
      console.log('Answers:', answers);

      toast({ title: '[테스트] 설문 제출 완료', description: '테스트 모드이므로 데이터가 저장되지 않았습니다.' });

      // 테스트 모드에서는 로컬 스토리지 완료 마킹을 하지 않아 반복 테스트 가능하게 함
      // clearProgress({ notify: false }); // 테스트라 유지할지 클리어할지? 클리어하는게 깔끔하긴 함.
      clearProgress({ notify: false });

      // 완료 페이지로 이동 (테스트임을 알릴 수 있으면 좋지만 일단 완료 페이지만)
      navigate('/survey-complete', { replace: true });
      setSubmitting(false);
      return;
    }

    console.log('🚀 설문 제출 시작:', { surveyId, answersCount: answers.length });
    setSubmitting(true);
    try {
      // 설문 존재 여부 확인
      if (!survey || !survey.id) {
        throw new Error('설문 정보를 찾을 수 없습니다.');
      }

      console.log('📝 응답 데이터 삽입 중...');
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert({ survey_id: survey.id, respondent_email: null })
        .select('id')
        .single();

      if (responseError) {
        console.error('❌ 응답 데이터 삽입 실패:', responseError);
        throw responseError;
      }
      console.log('✅ 응답 데이터 삽입 성공:', responseData);

      const validAnswers = answers.filter((a) =>
        Array.isArray(a.answer) ? a.answer.length > 0 : String(a.answer || '').trim() !== ''
      );
      console.log('📋 유효한 답변:', validAnswers.length, '개');

      if (validAnswers.length > 0) {
        const answersData = validAnswers.map((a) => ({
          response_id: responseData.id,
          question_id: a.questionId,
          answer_text: Array.isArray(a.answer) ? a.answer.join(', ') : a.answer,
          answer_value: a.answer,
        }));
        console.log('💾 답변 데이터 일괄 삽입 중...', answersData.length, '개 항목');

        // RPC 함수를 사용한 서버 측 일괄 처리 + 폴백(insert)
        let saved = false;
        let lastError: any = null;
        let attempts = 0;
        while (attempts < 2 && !saved) {
          const { error } = await supabase.rpc('save_answers_bulk', { p_answers: answersData });
          if (!error) { saved = true; break; }
          lastError = error;
          const msg = (error as any)?.message || '';
          const code = (error as any)?.code;
          if (code === '57014' || /statement timeout/i.test(msg)) {
            attempts++;
            console.warn(`⏳ 타임아웃으로 재시도 (${attempts})...`);
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          break;
        }
        if (!saved) {
          console.warn('🧯 RPC 실패로 폴백 사용(question_answers 직접 삽입)');
          const chunkSize = 100;
          for (let i = 0; i < answersData.length; i += chunkSize) {
            const chunk = answersData.slice(i, i + chunkSize);
            const { error } = await supabase.from('question_answers').insert(chunk);
            if (error) {
              console.error('❌ 폴백 삽입 실패:', error);
              throw lastError || error;
            }
          }
        }
        console.log('✅ 답변 데이터 저장 완료');
      }

      if (session) {
        try {
          console.log('🎯 설문 완료 마킹 중...');
          await markSurveyCompleted(surveyId!);
          console.log('✅ 설문 완료 마킹 성공');
        } catch (markError) {
          console.error('⚠️ 설문 완료 마킹 실패 (비필수):', markError);
        }
      }
      if (completedKey) {
        localStorage.setItem(completedKey, '1');
        console.log('💾 로컬 스토리지 완료 표시 저장됨');
      }

      console.log('🎉 설문 제출 완료!');
      clearProgress({ notify: false });
      // setSurveyPhase('completed'); 
      navigate('/survey-complete', { replace: true });
    } catch (error) {
      console.error('💥 설문 제출 중 오류 발생:', error);
      console.error('오류 세부 정보:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      toast({
        title: '제출 중 오류가 발생했습니다',
        description: `오류: ${error?.message || '알 수 없는 오류'}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStepTitle = () => {
    const firstQuestion = currentQuestions[0];
    if (!firstQuestion) return '설문 응답';
    if (firstQuestion.section_id) {
      const section = sectionMap.get(firstQuestion.section_id);
      return section?.name || '설문 응답';
    }
    return '설문 응답';
  };
  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">설문을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">이미 참여 완료</h1>
          <p className="text-muted-foreground">이 설문에 이미 참여하셨습니다.</p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  if (needsToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>참여 코드 입력</CardTitle>
            <p className="text-sm text-muted-foreground">설문 참여를 위해 코드를 입력해주세요</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">참여 코드</Label>
              <Input
                id="token"
                placeholder="예: ABC123XY"
                value={tokenCode}
                onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
                className="text-center font-mono"
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>강사님께서 공유해주신 8자리 참여 코드를 입력해주세요.</AlertDescription>
            </Alert>
            <Button onClick={handleTokenSubmit} className="w-full" disabled={!tokenCode.trim()}>
              확인
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              취소
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">설문을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground mb-4">요청하신 설문이 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  // 설문 시작 화면
  if (surveyPhase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">{survey?.title}</CardTitle>
            {survey?.description && (
              <p className="text-muted-foreground leading-relaxed">
                {survey.description.replace(/강사 만족도/g, '과정 만족도')}
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 설문 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">{questions.length}</div>
                <div className="text-sm text-muted-foreground">총 문항 수</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">~{Math.ceil(questions.length * 0.5)}</div>
                <div className="text-sm text-muted-foreground">예상 소요시간 (분)</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">익명</div>
                <div className="text-sm text-muted-foreground">응답 방식</div>
              </div>
            </div>

            {/* 안내사항 */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="space-y-2">
                  <div className="font-medium">참여 안내사항</div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>모든 응답은 익명으로 처리되며 개인정보는 수집되지 않습니다</li>
                    <li>진솔하고 건설적인 의견을 작성해 주세요</li>
                    <li>응답은 자동으로 임시 저장되어 언제든 이어서 작성할 수 있습니다</li>
                    <li>모든 필수 문항에 응답해 주셔야 제출이 가능합니다</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {hasSavedProgress && (
              <Alert className="border-primary/30 bg-primary/5">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <div className="space-y-3 text-left">
                    <div className="font-medium text-primary">이전에 저장된 응답이 있습니다.</div>
                    <p className="text-sm text-muted-foreground">
                      {lastSavedRelative ? `마지막 저장: ${lastSavedRelative}` : '이어서 설문을 진행할 수 있습니다.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Button onClick={handleResumeProgress} className="sm:flex-1">
                        이어서 진행하기
                      </Button>
                      <Button variant="outline" onClick={() => handleResetProgress(true)} className="sm:flex-1">
                        새로 시작하기
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 시작 버튼 */}
            <div className="text-center space-y-4">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-3 text-lg"
                onClick={() => setSurveyPhase('survey')}
              >
                <Send className="w-5 h-5 mr-2" />
                설문 시작하기
              </Button>
              <p className="text-xs text-muted-foreground">
                시작 버튼을 클릭하시면 설문에 동의하신 것으로 간주됩니다
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 설문 완료 화면
  if (surveyPhase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-400">
              설문 참여 완료!
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              소중한 의견을 주셔서 진심으로 감사합니다
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 완료 메시지 */}
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                  응답이 성공적으로 제출되었습니다
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                  여러분의 의견은 교육 품질 향상을 위해 소중히 활용됩니다.
                  더 나은 교육 환경을 만들어 나가는데 큰 도움이 됩니다.
                </p>
              </div>
            </div>

            {/* 설문 정보 요약 */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <h4 className="font-medium">참여하신 설문</h4>
              <p className="text-sm text-muted-foreground">{survey?.title}</p>
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>• 총 {questions.length}개 문항 응답 완료</span>
                <span>• {new Date().toLocaleDateString('ko-KR')} 제출</span>
              </div>
            </div>

            {/* 추가 안내 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">참고사항</div>
                  <ul className="text-sm space-y-1">
                    <li>• 설문 결과는 익명으로 처리되어 통계 분석에만 사용됩니다</li>
                    <li>• 개별 응답 내용은 교육 개선 목적으로만 활용됩니다</li>
                    <li>• 추가 문의사항이 있으시면 교육 담당자에게 연락해 주세요</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* 홈으로 돌아가기 버튼 */}
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/')}
                className="px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                홈으로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 진행률 계산: 실제 답변 완성도 기반
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    const answeredCount = countAnsweredForQuestions(answers, questions);
    return (answeredCount / questions.length) * 100;
  }, [answers, questions]);
  const isLastStep = currentStep === totalSteps - 1;

  const renderQuestion = (question: Question) => {
    const answer = answers.find((a) => a.questionId === question.id);

    switch (question.question_type) {
      case 'text':
        return (
          <Input
            value={(answer?.answer as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="답변을 입력해 주세요"
            className="touch-friendly"
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={(answer?.answer as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="상세한 의견을 입력해 주세요"
            rows={4}
            className="touch-friendly"
          />
        );
      case 'multiple_choice':
        return (
          <RadioGroup value={(answer?.answer as string) || ''} onValueChange={(v) => handleAnswerChange(question.id, v)}>
            {question.options?.map((option: string, i: number) => (
              <div key={i} className="flex items-center space-x-2 touch-friendly">
                <RadioGroupItem value={option} id={`${question.id}-${i}`} className="touch-friendly" />
                <Label htmlFor={`${question.id}-${i}`} className="break-words cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'multiple_choice_multiple':
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, i: number) => {
              const selected = (answer?.answer as string[]) || [];
              const checked = selected.includes(option);
              return (
                <div key={i} className="flex items-center space-x-2 touch-friendly">
                  <Checkbox
                    id={`${question.id}-${i}`}
                    checked={checked}
                    onCheckedChange={(c) => {
                      const cur = (answer?.answer as string[]) || [];
                      handleAnswerChange(question.id, c ? [...cur, option] : cur.filter((x) => x !== option));
                    }}
                    className="touch-friendly"
                  />
                  <Label htmlFor={`${question.id}-${i}`} className="break-words cursor-pointer">
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );
      case 'rating': {
        const rating = parseInt((answer?.answer as string) || '0', 10);
        return (
          <div className="grid grid-cols-5 gap-2 sm:flex sm:space-x-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <Button
                key={v}
                type="button"
                variant={rating === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAnswerChange(question.id, v.toString())}
                className="touch-friendly text-sm h-10"
              >
                {v}
              </Button>
            ))}
          </div>
        );
      }
      case 'scale': {
        const min = question.options?.min ?? 1;
        const max = question.options?.max ?? 10;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <span className="break-words">전혀 그렇지 않다</span>
              <span className="break-words">매우 그렇다</span>
            </div>
            <RadioGroup
              value={(answer?.answer as string) || ''}
              onValueChange={(v) => handleAnswerChange(question.id, v)}
              className="grid grid-cols-5 sm:flex sm:items-center sm:justify-between gap-2"
            >
              {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
                <div key={v} className="flex flex-col items-center space-y-1 touch-friendly">
                  <span className="text-xs sm:text-sm font-medium">{v}</span>
                  <RadioGroupItem value={String(v)} id={`${question.id}-${v}`} className="touch-friendly" />
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      }
      default:
        return (
          <Input
            value={(answer?.answer as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="답변을 입력해 주세요"
          />
        );
    }
  };

  // 로딩 중
  if (loading) {
    return <LoadingScreen />;
  }

  // 에러 또는 설문 데이터 없음
  if (error || !survey) {
    const isTimeError = error && (error.includes('시작 시간이') || error.includes('종료되었습니다'));

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isTimeError ? 'bg-orange-100' : 'bg-destructive/10'
              }`}>
              {isTimeError ? (
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <h2 className="text-xl font-semibold mb-2 text-foreground">
              {isTimeError ? '설문 참여 시간 안내' : '설문 접근 오류'}
            </h2>

            <p className="text-muted-foreground mb-6 leading-relaxed">
              {error || '설문을 불러올 수 없습니다. 링크를 다시 확인하거나 관리자에게 문의해주세요.'}
            </p>

            {isTimeError && (
              <Alert className="mb-6 text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">안내사항</div>
                    <ul className="text-sm space-y-1">
                      <li>• 설문 참여는 지정된 시간에만 가능합니다</li>
                      <li>• 설문 시작 시간을 확인하시고 다시 방문해 주세요</li>
                      <li>• 문의사항은 교육 담당자에게 연락해 주세요</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                페이지 새로고침
              </Button>
              <Button onClick={() => window.location.href = '/'} className="w-full">
                메인 페이지로 이동
              </Button>
            </div>

            <div className="pt-4 border-t mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground w-full hover:text-destructive hover:bg-destructive/5"
                onClick={() => {
                  if (confirm('설문 진행 데이터가 초기화됩니다. 계속하시겠습니까?')) {
                    if (autosaveKey) localStorage.removeItem(autosaveKey);
                    if (completedKey) localStorage.removeItem(completedKey);
                    window.location.reload();
                  }
                }}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                설문 데이터 초기화 (오류 해결용)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        {isTestMode && (
          <div className="bg-orange-100 text-orange-800 text-xs px-4 py-1 text-center font-medium border-b border-orange-200">
            🧪 테스트 모드입니다. 응답 데이터가 저장되지 않습니다.
          </div>
        )}
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center gap-4 max-w-full overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-semibold break-words line-clamp-1">
              {survey.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-1">{getStepTitle()}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {stepItems.length > 0 && (
            <aside className="lg:w-72">
              <div className="hidden lg:block sticky top-28 space-y-4">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">섹션</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    진행 상황을 확인하고 원하는 섹션으로 이동하세요.
                  </p>
                </div>
                <div className="space-y-2">
                  {stepItems.map((item) => (
                    <button
                      key={item.index}
                      type="button"
                      onClick={() => handleStepSelect(item.index)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        item.isCurrent ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:bg-muted/60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                            item.isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.answeredCount} / {item.total} 완료
                          </div>
                          <Progress value={item.completion} className="h-1 mt-2" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleManualSave} className="justify-start">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    임시 저장
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetProgress()}
                    className="justify-start text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    진행 초기화
                  </Button>
                </div>
              </div>
            </aside>
          )}

          <div className="flex-1 lg:max-w-3xl">
            {stepItems.length > 0 && (
              <div className="lg:hidden mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">섹션 이동</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleManualSave}>
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      임시 저장
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetProgress()}
                      className="text-muted-foreground"
                      aria-label="진행 초기화"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {stepItems.map((item) => (
                    <button
                      key={item.index}
                      type="button"
                      onClick={() => handleStepSelect(item.index)}
                      className={cn(
                        'flex-shrink-0 min-w-[160px] rounded-lg border px-3 py-2 text-left transition',
                        item.isCurrent ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                            item.isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.index + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{item.completion}% 완료</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>{totalSteps > 0 ? `${currentStep + 1} / ${totalSteps}` : '0 / 0'}</span>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <span>{Math.round(progress)}% 완료</span>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-2 text-xs sm:text-sm',
                    autoSaveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {autoSaveStatus === 'saving' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : autoSaveStatus === 'error' ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate">{autosaveStatusMessage}</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {currentQuestionInstructor && (
              <div className="mb-6">
                <InstructorInfoSection instructor={currentQuestionInstructor} />
              </div>
            )}

            <Card className="max-w-full">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg break-words">
                  {currentQuestions.length > 1 ? `페이지 ${currentStep + 1}` : `질문 ${currentStep + 1}`}
                </CardTitle>
                {(() => {
                  const first = currentQuestions[0];
                  if (!first || !first.section_id) return null;
                  const section = sectionMap.get(first.section_id);
                  return section?.description ? (
                    <p className="text-muted-foreground text-sm break-words">{section.description}</p>
                  ) : null;
                })()}
              </CardHeader>

              <CardContent className="space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
                {currentQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">이 섹션에는 질문이 없습니다.</div>
                ) : (
                  currentQuestions.map((q, index) => (
                    <div key={q.id} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                      <Label className="text-sm sm:text-base break-words hyphens-auto leading-relaxed block">
                        {currentQuestions.length > 1 && (
                          <span className="text-sm text-muted-foreground mr-2">
                            {index + 1}.
                          </span>
                        )}
                        {q.question_text}
                        {q.is_required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <div className="max-w-full overflow-x-auto">{renderQuestion(q)}</div>
                    </div>
                  ))
                )}

                <div className="flex justify-between pt-6 gap-3 flex-wrap sm:flex-nowrap">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="touch-friendly flex-1 sm:flex-none sm:min-w-[100px] order-1"
                  >
                    이전
                  </Button>

                  {isLastStep ? (
                    <Button onClick={handleSubmit} disabled={submitting} className="touch-friendly flex-1 sm:flex-none sm:min-w-[120px] order-2">
                      {submitting ? '제출 중...' : (<><Send className="h-4 w-4 mr-2" />제출하기</>)}
                    </Button>
                  ) : (
                    <Button onClick={handleNext} className="touch-friendly flex-1 sm:flex-none sm:min-w-[100px] order-2">
                      다음
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SurveyParticipate;
