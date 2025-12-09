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
import { ArrowLeft, Send, KeyRound, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { InstructorInfoSection } from '@/components/InstructorInfoSection';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

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

interface Answer {
  questionId: string;
  answer: string | string[];
}

interface Section {
  id: string;
  name: string;
  description?: string;
  order_index: number;
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

const getQuestionsForSessionId = (sessionId: string, allQuestions: Question[]) => {
  if (sessionId === 'operation_common') {
    return allQuestions.filter((question) => question.scope === 'operation' || !question.session_id);
  }
  return allQuestions.filter((question) => question.session_id === sessionId);
};

interface SessionAutosaveData {
  answers: Record<string, string | string[]>;
  currentSessionIndex: number;
  currentQuestionIndex: number;
  updatedAt: number;
}

const SurveyParticipateSession = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const { session, loading: sessionLoading, checkSurveyCompletion, markSurveyCompleted, validateToken } =
    useAnonymousSession();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveySessions, setSurveySessions] = useState<SurveySession[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [tokenCode, setTokenCode] = useState('');
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const completedKey = surveyId ? `survey_completed_${surveyId}` : '';
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
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!template_id (
            id, name, is_course_evaluation
          )
        `)
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) {
        toast({
          title: '설문을 찾을 수 없습니다',
          description: '해당 설문이 존재하지 않거나 비활성화되었습니다.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setSurvey(surveyData);

      // 세션 데이터 로드
      const { data: sessionsData, error: sessionsError } = await (supabase as any)
        .from('survey_sessions')
        .select(`
          *,
          subject:subjects(id, title),
          instructor:instructors(id, name, email, photo_url, bio)
        `)
        .eq('survey_id', surveyId)
        .order('session_order');

      if (sessionsError) throw sessionsError;
      let sessionList = sessionsData || [];

      // 섹션 데이터 로드
      const { data: sectionsData } = await supabase
        .from('survey_sections')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');
      const sectionsList = sectionsData || [];
      setSections(sectionsList);

      // 질문 데이터 로드 (세션별 + 운영 공통 포함)
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

      const opQuestions = typedQuestions.filter((q) => q.scope === 'operation' || !q.session_id);
      if (opQuestions.length > 0) {
        const operationSession = {
          id: 'operation_common',
          survey_id: surveyId!,
          course_id: '',
          instructor_id: '',
          session_order: (sessionList.length || 0) + 1000,
          session_name: '운영/공통 문항',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          course: { id: '', title: '' },
          instructor: { id: '', name: '', email: '', photo_url: '', bio: '' }
        };
        sessionList = [...sessionList, operationSession as any];
      }

      let initialAnswers = typedQuestions.map((q) => ({
        questionId: q.id,
        answer: q.question_type === 'multiple_choice_multiple' ? [] : '',
      }));
      let restoredSessionIndex = 0;
      let restoredQuestionIndex = 0;

      setSurveySessions(sessionList);
      setAnswers(initialAnswers);
      setCurrentSessionIndex(restoredSessionIndex);
      setCurrentQuestionIndex(restoredQuestionIndex);
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

  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const getQuestionsForSession = useCallback((sessionId: string) => getQuestionsForSessionId(sessionId, questions), [questions]);
  const getGroupsForSession = useCallback(
    (sessionId: string) => groupQuestionsBySection(getQuestionsForSession(sessionId), sections),
    [getQuestionsForSession, sections]
  );

  useEffect(() => {
    if (surveySessions.length === 0) {
      setCurrentSessionIndex(0);
      return;
    }
    if (currentSessionIndex >= surveySessions.length) {
      setCurrentSessionIndex(surveySessions.length - 1);
    }
  }, [currentSessionIndex, surveySessions.length]);

  const activeSession = surveySessions[currentSessionIndex];
  const currentGroups = useMemo(
    () => (activeSession ? getGroupsForSession(activeSession.id) : []),
    [activeSession, getGroupsForSession]
  );

  useEffect(() => {
    if (currentGroups.length === 0) {
      if (currentQuestionIndex !== 0) {
        setCurrentQuestionIndex(0);
      }
      return;
    }
    if (currentQuestionIndex >= currentGroups.length) {
      setCurrentQuestionIndex(currentGroups.length - 1);
    }
  }, [currentGroups.length, currentQuestionIndex]);

  const currentQuestions = currentGroups[currentQuestionIndex] || [];
  const totalGroups = currentGroups.length;
  const totalQuestions = questions.length;
  const totalSessions = surveySessions.length;
  const answeredCount = useMemo(() => countAnsweredForQuestions(answers, questions), [answers, questions]);
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const currentSection = useMemo(() => {
    const first = currentQuestions[0];
    if (!first || !first.section_id) return null;
    return sectionMap.get(first.section_id) ?? null;
  }, [currentQuestions, sectionMap]);

  const validateCurrentQuestions = () => {
    for (const question of currentQuestions) {
      if (!question.is_required) continue;
      const answer = answers.find((a) => a.questionId === question.id);
      if (!isAnswerProvided(answer)) return false;
    }

    return true;
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 페이지 전환 시 자동 스크롤
  useEffect(() => {
    scrollToTop();
  }, [currentSessionIndex, currentQuestionIndex]);

  const handleNext = () => {
    if (!validateCurrentQuestions()) {
      toast({ title: '필수 항목을 완성해 주세요', description: '모든 필수 답변을 입력해 주세요.', variant: 'destructive' });
      return;
    }

    if (currentQuestionIndex < currentGroups.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      scrollToTop();
      return;
    }

    for (let nextIndex = currentSessionIndex + 1; nextIndex < surveySessions.length; nextIndex++) {
      const nextSession = surveySessions[nextIndex];
      const nextGroups = getGroupsForSession(nextSession.id);
      if (nextGroups.length > 0) {
        setCurrentSessionIndex(nextIndex);
        setCurrentQuestionIndex(0);
        scrollToTop();
        return;
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      scrollToTop();
      return;
    }

    for (let prevIndex = currentSessionIndex - 1; prevIndex >= 0; prevIndex--) {
      const prevSession = surveySessions[prevIndex];
      const prevGroups = getGroupsForSession(prevSession.id);
      if (prevGroups.length > 0) {
        setCurrentSessionIndex(prevIndex);
        setCurrentQuestionIndex(Math.max(prevGroups.length - 1, 0));
        scrollToTop();
        return;
      }
    }
  };

  const isLastQuestion = () => {
    if (currentSessionIndex !== surveySessions.length - 1) return false;
    return currentQuestionIndex === Math.max(currentGroups.length - 1, 0);
  };

  const sessionNavItems = useMemo(
    () =>
      surveySessions.map((session, index) => {
        const sessionQuestions = getQuestionsForSession(session.id);
        const total = sessionQuestions.length;
        const answered = countAnsweredForQuestions(answers, sessionQuestions);
        const completion = total > 0 ? Math.round((answered / total) * 100) : 0;
        const groups = groupQuestionsBySection(sessionQuestions, sections).map((group, groupIndex) => {
          const first = group[0];
          const section = first?.section_id ? sectionMap.get(first.section_id) : undefined;
          const label = section?.name ?? '기타 문항';
          const groupAnswered = countAnsweredForQuestions(answers, group);
          const groupCompletion = group.length > 0 ? Math.round((groupAnswered / group.length) * 100) : 0;
          return {
            index: groupIndex,
            label,
            answeredCount: groupAnswered,
            total: group.length,
            completion: groupCompletion,
          };
        });
        return {
          session,
          index,
          total,
          answered,
          completion,
          isCurrent: index === currentSessionIndex,
          groups,
        };
      }),
    [answers, currentSessionIndex, getQuestionsForSession, sections, sectionMap, surveySessions]
  );

  const currentSessionMeta = sessionNavItems[currentSessionIndex];
  const stepItems = useMemo(
    () =>
      (currentSessionMeta?.groups || []).map((group) => ({
        ...group,
        isCurrent: group.index === currentQuestionIndex,
        isCompleted: group.total > 0 && group.answeredCount === group.total,
      })),
    [currentQuestionIndex, currentSessionMeta]
  );
  const currentGroupMeta = useMemo(
    () => stepItems.find((item) => item.index === currentQuestionIndex),
    [currentQuestionIndex, stepItems]
  );

  const handleManualSave = () => {
    // 임시 저장 기능 제거됨
  };

  const handleResetProgress = () => {
    // 진행 초기화 기능 제거됨
  };

  const handleSessionSelect = (index: number, groupIndex = 0) => {
    setCurrentSessionIndex(index);
    setCurrentQuestionIndex(groupIndex);
    scrollToTop();
  };

  // 온라인 상태 감지
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [showTestResultDialog, setShowTestResultDialog] = useState(false);

  const isTestMode = searchParams.get('mode') === 'test';

  const handleSubmit = async () => {
    if (!validateCurrentQuestions()) {
      toast({ title: '필수 항목을 완성해 주세요', description: '모든 필수 답변을 입력해 주세요.', variant: 'destructive' });
      return;
    }

    if (isTestMode) {
      setSubmitting(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setSubmitting(false);
      setShowTestResultDialog(true);
      return;
    }

    console.log('🚀 세션 설문 제출 시작:', { surveyId, answersCount: answers.length });
    setSubmitting(true);
    try {
      // 설문 존재 여부 확인
      if (!survey || !survey.id) {
        throw new Error('설문 정보를 찾을 수 없습니다.');
      }

      // 세션별로 답변을 그룹화
      const sessionGroups = new Map<string, Answer[]>();
      const validAnswers = answers.filter((a) =>
        Array.isArray(a.answer) ? a.answer.length > 0 : String(a.answer || '').trim() !== ''
      );

      for (const answer of validAnswers) {
        const question = questions.find(q => q.id === answer.questionId);
        if (!question) continue;

        // 운영 문항이거나 session_id가 없는 경우 'operation_common'으로 그룹화
        const sessionKey = question.session_id || 'operation_common';

        if (!sessionGroups.has(sessionKey)) {
          sessionGroups.set(sessionKey, []);
        }
        sessionGroups.get(sessionKey)!.push(answer);
      }

      console.log('📋 세션별 답변 그룹:', sessionGroups.size, '개 세션');

      // 각 세션별로 별도의 응답 생성
      for (const [sessionId, sessionAnswers] of sessionGroups.entries()) {
        const actualSessionId = sessionId === 'operation_common' ? null : sessionId;

        console.log(`📝 세션 ${sessionId} 응답 데이터 삽입 중... (${sessionAnswers.length}개 답변)`);

        // survey_responses에 직접 삽입 (session_id 포함)
        const { data: responseData, error: responseError } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: survey.id,
            session_id: actualSessionId,
            respondent_email: null,
            submitted_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (responseError) {
          console.error('❌ 응답 데이터 삽입 실패:', responseError);
          throw responseError;
        }

        const responseId = responseData.id;
        console.log(`✅ 세션 ${sessionId} 응답 데이터 삽입 성공:`, responseId);

        if (sessionAnswers.length > 0) {
          const answersData = sessionAnswers.map((a) => ({
            response_id: responseId,
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
                console.error('❌ 답변 삽입 오류:', error);
                throw error;
              }
            }
            console.log('✅ 폴백으로 답변 삽입 완료');
          } else {
            console.log('✅ RPC로 답변 일괄 삽입 성공');
          }
        }
      }

      // 설문 완료 처리
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

      console.log('🎉 세션 설문 제출 완료! 총', sessionGroups.size, '개 세션 응답 생성');
      toast({ title: '설문 참여 완료!', description: '소중한 의견을 주셔서 감사합니다.' });
      navigate('/survey-complete', { replace: true });
    } catch (error) {
      console.error('💥 세션 설문 제출 중 오류 발생:', error);
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
        const scale = parseInt((answer?.answer as string) || '0', 10);
        return (
          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 sm:gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <Button
                key={v}
                type="button"
                variant={scale === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAnswerChange(question.id, v.toString())}
                className="touch-friendly text-xs h-8 sm:text-sm sm:h-10"
              >
                {v}
              </Button>
            ))}
          </div>
        );
      }
      default:
        return <div>지원하지 않는 질문 유형입니다.</div>;
    }
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

  if (!survey || surveySessions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">설문을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground mb-4">요청하신 설문이 존재하지 않거나 삭제되었습니다.</p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/')} className="w-full">홈으로 돌아가기</Button>
          </div>
          <div className="pt-4 border-t mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground w-full hover:text-destructive hover:bg-destructive/5"
              onClick={() => {
                if (confirm('설문 진행 데이터가 초기화됩니다. 계속하시겠습니까?')) {
                  // 세션형은 autosaveKey 변수가 없으므로 직접 키 조합
                  if (surveyId) localStorage.removeItem(`survey_autosave_${surveyId}`);
                  if (completedKey) localStorage.removeItem(completedKey);
                  window.location.reload();
                }
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              설문 데이터 초기화 (오류 해결용)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleTestComplete = () => {
    setShowTestResultDialog(false);
    console.log('🧪 [TEST MODE] 세션 설문 제출 시뮬레이션 완료');
    toast({ title: '[테스트] 설문 제출 완료', description: '테스트 모드이므로 데이터가 저장되지 않았습니다.' });
    navigate('/survey-complete', { replace: true });
  };

  const currentSessionData = surveySessions[currentSessionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground text-xs px-4 py-2 text-center font-medium sticky top-0 z-[60]">
          📡 인터넷 연결이 끊겼습니다. 연결되면 자동으로 저장됩니다.
        </div>
      )}
      {isTestMode && (
        <div className="bg-orange-100 text-orange-800 text-xs px-4 py-1 text-center font-medium border-b border-orange-200">
          🧪 테스트 모드입니다. 응답 데이터가 저장되지 않습니다.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6 lg:py-12">
        <Dialog open={showTestResultDialog} onOpenChange={setShowTestResultDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="px-0 pt-0">
              <CardTitle>🧪 테스트 제출 데이터 확인</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md overflow-x-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify({
                    surveyId,
                    answers: answers.filter(a => Array.isArray(a.answer) ? a.answer.length > 0 : String(a.answer).trim() !== '').map(a => ({
                      questionId: a.questionId,
                      value: a.answer
                    })),
                    submittedAt: new Date().toISOString()
                  }, null, 2)}
                </pre>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestResultDialog(false)}>돌아가기</Button>
                <Button onClick={handleTestComplete}>테스트 승인 및 완료처리</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            나가기
          </Button>
          <div className="text-xs text-muted-foreground sm:text-sm">
            전체 진행 {answeredCount} / {totalQuestions}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <div className="mb-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">{survey.title}</h1>
                {survey.description && (
                  <p className="text-muted-foreground">{survey.description}</p>
                )}
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <div className="text-xs text-muted-foreground sm:text-sm">
                세션 {currentSessionIndex + 1} / {totalSessions} • {Math.round(progress)}% 진행
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card className="mb-6 border border-primary/20 bg-primary/5">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {currentSessionData.session_name}
                      </span>
                      {currentSessionMeta && (
                        <span className="text-xs font-medium text-primary/80">
                          {currentSessionMeta.completion}% 완료
                        </span>
                      )}
                    </div>
                    {currentSessionData.subject?.title && (
                      <div className="text-sm text-muted-foreground">과목: {currentSessionData.subject.title}</div>
                    )}
                  </div>
                  {currentSessionMeta && (
                    <div className="text-right text-xs text-muted-foreground sm:text-sm">
                      {currentSessionMeta.answered} / {currentSessionMeta.total} 문항 완료
                    </div>
                  )}
                </div>
                {currentSessionMeta && <Progress value={currentSessionMeta.completion} className="h-1.5" />}
              </CardHeader>
              {currentSessionData.instructor && (
                <CardContent className="pt-0">
                  <InstructorInfoSection instructor={currentSessionData.instructor} />
                </CardContent>
              )}
            </Card>

            <Card className="max-w-full">
              <CardHeader className="space-y-2 px-4 sm:px-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  {totalGroups > 0 ? (
                    <>
                      <span>
                        섹션 {Math.min(currentQuestionIndex + 1, totalGroups)} / {totalGroups}
                      </span>
                      <span className="hidden text-muted-foreground sm:inline">•</span>
                      <span>{currentGroupMeta?.completion ?? 0}% 완료</span>
                    </>
                  ) : (
                    <span>등록된 섹션이 없습니다</span>
                  )}
                </div>
                <CardTitle className="break-words text-base sm:text-lg">
                  {currentGroupMeta?.label ?? '문항 그룹'}
                </CardTitle>
                {currentSection?.description && (
                  <p className="break-words text-sm text-muted-foreground">{currentSection.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
                {currentQuestions.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">이 세션에는 질문이 없습니다.</div>
                ) : (
                  currentQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-3 rounded-lg border bg-muted/30 p-4">
                      <Label className="block break-words text-sm leading-relaxed sm:text-base">
                        {currentQuestions.length > 1 && (
                          <span className="mr-2 text-sm text-muted-foreground">{index + 1}.</span>
                        )}
                        {question.question_text}
                        {question.is_required && <span className="ml-1 text-destructive">*</span>}
                      </Label>
                      <div className="max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                    </div>
                  ))
                )}

                <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentSessionIndex === 0 && currentQuestionIndex === 0}
                    className="touch-friendly flex-1 sm:flex-none sm:min-w-[110px]"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    이전
                  </Button>

                  <div className="text-center text-xs text-muted-foreground sm:flex-1">
                    세션 {currentSessionIndex + 1} / {totalSessions}
                  </div>

                  {isLastQuestion() ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="touch-friendly flex-1 sm:flex-none sm:min-w-[120px]"
                    >
                      {submitting ? (
                        '제출 중...'
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          제출하기
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handleNext} className="touch-friendly flex-1 sm:flex-none sm:min-w-[110px]">
                      다음
                      <ChevronRight className="ml-2 h-4 w-4" />
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

export default SurveyParticipateSession;
