import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Eye, AlertTriangle, Copy } from 'lucide-react';
import { getSurveyUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { InstructorInfoSection } from '@/components/InstructorInfoSection';
import { Alert, AlertDescription } from '@/components/ui/alert';


interface Survey {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  template_id?: string;
  instructor_id?: string;
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  bio?: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  order_index: number;
  section_id?: string;
  satisfaction_type?: string;
  session_id?: string;
  scope?: string;
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

interface SectionWithSession {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  session_name?: string;
  course_title?: string;
}

const SurveyPreview = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [sections, setSections] = useState<SectionWithSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [currentQuestionInstructor, setCurrentQuestionInstructor] = useState<Instructor | null>(null);
  const [sessionInstructorMap, setSessionInstructorMap] = useState<Map<string, Instructor>>(new Map());
  const [sessionsMap, setSessionsMap] = useState<Map<string, { session_name?: string; course_title?: string; session_order?: number }>>(new Map());
  const [isCourseEvaluation, setIsCourseEvaluation] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (surveyId) {
      fetchSurveyData();
    }
  }, [surveyId]);

  // 현재 질문의 세션에 따른 강사 정보 업데이트
  useEffect(() => {
    const currentQuestion = questions[currentStep];
    if (currentQuestion?.session_id && sessionInstructorMap.has(currentQuestion.session_id)) {
      const sessionInstructor = sessionInstructorMap.get(currentQuestion.session_id);
      setCurrentQuestionInstructor(sessionInstructor);
    } else {
      setCurrentQuestionInstructor(instructor); // 기본 강사로 fallback
    }
  }, [currentStep, questions, sessionInstructorMap, instructor]);

  const fetchSurveyData = async () => {
    try {
      console.log('Fetching survey preview data for:', surveyId);
      
      // 설문 정보 가져오기 (상태나 날짜 제한 없이)
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!template_id (
            id,
            name,
            is_course_evaluation
          )
        `)
        .eq('id', surveyId)
        .maybeSingle();

      if (surveyError) throw surveyError;

      if (!surveyData) {
        toast({
          title: "설문을 찾을 수 없습니다",
          description: "해당 설문이 존재하지 않습니다.",
          variant: "destructive",
        });
        navigate('/surveys');
        return;
      }

      setSurvey(surveyData);

      // 강사 평가 템플릿 여부 확인
      const isCourseEval = surveyData.survey_templates?.is_course_evaluation;
      setIsCourseEvaluation(!!isCourseEval);

      // 강사 정보 가져오기 - 세션별 강사 정보 구조 고려
      console.log('강사 정보 조회 시작 - 설문 ID:', surveyId);
      
      // 현재 설문에 있는 모든 세션과 해당 강사 정보를 가져옴
      const { data: allSessionInstructors, error: sessionError } = await supabase
        .from('survey_sessions')
        .select(`
          id,
          session_name,
          instructor_id,
          instructors (
            id,
            name,
            email,
            photo_url,
            bio
          )
        `)
        .eq('survey_id', surveyId);

      console.log('세션별 강사 정보:', allSessionInstructors, 'Error:', sessionError);
      
      // 세션별 강사 정보를 저장하여 나중에 질문별로 매칭
      const newSessionInstructorMap = new Map();
      if (!sessionError && allSessionInstructors) {
        allSessionInstructors.forEach(session => {
          if (session.instructors) {
            newSessionInstructorMap.set(session.id, session.instructors);
          }
        });
      }
      setSessionInstructorMap(newSessionInstructorMap);
      
      // 기본 강사 정보 설정 (첫 번째 세션의 강사 또는 survey_instructors에서)
      let defaultInstructorData = null;
      
      // survey_instructors 테이블에서 강사 정보 조회 (백업)
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
          defaultInstructorData = instructors[0];
        }
      }
      
      // 세션에서 첫 번째 강사 가져오기 (우선순위)
      if (allSessionInstructors && allSessionInstructors.length > 0) {
        const firstSessionWithInstructor = allSessionInstructors.find(s => s.instructors);
        if (firstSessionWithInstructor?.instructors) {
          defaultInstructorData = firstSessionWithInstructor.instructors;
        }
      }

      // 개별 instructor_id로 조회 (최종 백업)
      if (!defaultInstructorData && surveyData.instructor_id) {
        console.log('개별 강사 ID로 조회:', surveyData.instructor_id);
        const { data: singleInstructor, error: instructorError } = await supabase
          .from('instructors')
          .select('*')
          .eq('id', surveyData.instructor_id)
          .maybeSingle();

        if (!instructorError && singleInstructor) {
          defaultInstructorData = singleInstructor;
        }
      }

      if (defaultInstructorData) {
        setInstructor(defaultInstructorData);
        console.log('기본 강사 정보 설정됨:', defaultInstructorData);
      } else {
        console.log('강사 정보를 찾을 수 없음');
      }

      // 섹션 가져오기
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (sectionsError) throw sectionsError;
      
      // 세션 정보 가져오기
      const { data: sessionsData } = await supabase
        .from('survey_sessions')
        .select(`
          id,
          session_name,
          session_order,
          subjects(title)
        `)
        .eq('survey_id', surveyId);

      // 세션 맵 생성: session_id -> { session_name, course_title, session_order }
      const sessionsMapTemp = new Map<string, { session_name?: string; course_title?: string; session_order?: number }>();
      (sessionsData || []).forEach((s: any) => {
        sessionsMapTemp.set(s.id, {
          session_name: s.session_name,
          course_title: s.courses?.title,
          session_order: s.session_order,
        });
      });
      setSessionsMap(sessionsMapTemp);

      // 섹션과 세션 정보를 결합 (중복 제목 방지를 위해 섹션에는 세션/과목명을 주입하지 않음)
      const transformedSections: SectionWithSession[] = (sectionsData || []).map(section => ({
        id: section.id,
        name: section.name,
        description: section.description,
        order_index: section.order_index,
      }));
      
      setSections(transformedSections);

      // 질문 가져오기
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (questionsError) throw questionsError;
      
      console.log('Preview Questions Data:', questionsData);
      console.log('Questions Length:', questionsData?.length || 0);
      
      setQuestions(questionsData || []);
      
      // currentStep 초기화 (질문이 있을 때만)
      if (questionsData && questionsData.length > 0) {
        setCurrentStep(0);
      }

      // 답변 초기화
      const initialAnswers = (questionsData || []).map(q => ({
        questionId: q.id,
        answer: q.question_type === 'multiple_choice_multiple' ? [] : ''
      }));
      
      console.log('Preview Initial Answers:', initialAnswers);
      setAnswers(initialAnswers);

    } catch (error) {
      console.error('Error fetching survey preview data:', error);
      toast({
        title: "오류가 발생했습니다",
        description: "설문 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      navigate('/surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => prev.map(answer => 
      answer.questionId === questionId ? { ...answer, answer: value } : answer
    ));
  };

  const validateCurrentStep = () => {
    const currentQuestions = getCurrentStepQuestions();
    
    for (const question of currentQuestions) {
      if (question.is_required) {
        const answer = answers.find(a => a.questionId === question.id);
        if (!answer || !answer.answer || 
           (Array.isArray(answer.answer) && answer.answer.length === 0) ||
           (typeof answer.answer === 'string' && answer.answer.trim() === '')) {
          return false;
        }
      }
    }
    return true;
  };

  // 섹션 기준으로 페이징: 섹션 1페이지, 추가 분할 없음
  const getQuestionGroups = () => {
    if (questions.length === 0) return [] as Question[][];

    const groups: Question[][] = [];

    // 섹션 순서
    const orderedSections = sections
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    // 섹션별 질문 버킷 (+ 섹션 미지정)
    const bySection = new Map<string, Question[]>();
    const NO_SECTION = '__no_section__';

    const sorted = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const q of sorted) {
      const key = (q.section_id as string) || NO_SECTION;
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key)!.push(q);
    }

    // 섹션 순서대로 섹션 하나 = 한 페이지
    for (const s of orderedSections) {
      const list = bySection.get(s.id) || [];
      if (list.length > 0) groups.push(list);
    }

    // 섹션 미지정 문항은 마지막 페이지로 묶음
    const noSectionList = bySection.get(NO_SECTION) || [];
    if (noSectionList.length > 0) groups.push(noSectionList);

    return groups;
  };

  const questionGroups = getQuestionGroups();

  const getCurrentStepQuestions = () => {
    return questionGroups[currentStep] || [];
  };

  const getTotalSteps = () => {
    console.log('Preview getTotalSteps - question groups:', questionGroups.length);
    return questionGroups.length;
  };

  const getStepTitle = () => {
    const currentQuestion = questions[currentStep];
    if (!currentQuestion) return "설문 미리보기";

    const section = currentQuestion.section_id
      ? sections.find(s => s.id === currentQuestion.section_id)
      : undefined;

    const sessionInfo = currentQuestion.session_id
      ? sessionsMap.get(currentQuestion.session_id)
      : undefined;

    const parts: string[] = [];
    const courseTitle = sessionInfo?.course_title?.trim();
    const sectionName = section?.name?.trim();

    const includesInsensitive = (full?: string, part?: string) =>
      !!full && !!part && full.toLowerCase().includes(part.toLowerCase());

    if (courseTitle && (!sectionName || !includesInsensitive(sectionName, courseTitle))) {
      parts.push(courseTitle);
    }

    if (sectionName) {
      parts.push(sectionName);
    } else if (sessionInfo?.session_name) {
      parts.push(sessionInfo.session_name);
    }

    if (parts.length === 0) return "설문 미리보기";
    return parts.join(' - ');
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 페이지 전환 시 자동 스크롤
  useEffect(() => {
    scrollToTop();
  }, [currentStep]);

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast({
        title: "필수 항목을 완성해 주세요",
        description: "모든 필수 질문에 답변해 주세요.",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handlePreviewComplete = () => {
    toast({
      title: "📋 미리보기 완료!",
      description: "설문 미리보기를 성공적으로 완료했습니다.",
      duration: 3000,
    });

    navigate('/surveys');
  };

  const renderQuestion = (question: Question) => {
    const answer = answers.find(a => a.questionId === question.id);
    
    switch (question.question_type) {
      case 'text':
        return (
          <Input
            value={answer?.answer as string || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="답변을 입력해 주세요"
            className="touch-friendly"
          />
        );
        
      case 'textarea':
        return (
          <Textarea
            value={answer?.answer as string || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="상세한 의견을 입력해 주세요"
            rows={4}
            className="touch-friendly"
          />
        );
        
      case 'multiple_choice':
        return (
          <RadioGroup
            value={answer?.answer as string || ''}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            {question.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2 touch-friendly">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} className="touch-friendly" />
                <Label htmlFor={`${question.id}-${index}`} className="break-words cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      case 'multiple_choice_multiple':
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, index: number) => {
              const selectedAnswers = answer?.answer as string[] || [];
              return (
                <div key={index} className="flex items-center space-x-2 touch-friendly">
                  <Checkbox
                    id={`${question.id}-${index}`}
                    checked={selectedAnswers.includes(option)}
                    onCheckedChange={(checked) => {
                      const currentAnswers = answer?.answer as string[] || [];
                      if (checked) {
                        handleAnswerChange(question.id, [...currentAnswers, option]);
                      } else {
                        handleAnswerChange(question.id, currentAnswers.filter(a => a !== option));
                      }
                    }}
                    className="touch-friendly"
                  />
                  <Label htmlFor={`${question.id}-${index}`} className="break-words cursor-pointer">{option}</Label>
                </div>
              );
            })}
          </div>
        );
        
      case 'rating':
        const rating = parseInt(answer?.answer as string) || 0;
        return (
          <div className="grid grid-cols-5 gap-2 sm:flex sm:space-x-2">
            {[1, 2, 3, 4, 5].map(value => (
              <Button
                key={value}
                type="button"
                variant={rating === value ? "default" : "outline"}
                size="sm"
                onClick={() => handleAnswerChange(question.id, value.toString())}
                className="touch-friendly text-sm h-10"
              >
                {value}
              </Button>
            ))}
          </div>
        );
        
      case 'scale':
        const min = question.options?.min || 1;
        const max = question.options?.max || 10;
        
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <span className="break-words">전혀 그렇지 않다</span>
              <span className="break-words">매우 그렇다</span>
            </div>
            <RadioGroup
              value={answer?.answer as string || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="grid grid-cols-5 sm:flex sm:items-center sm:justify-between gap-2"
            >
              {Array.from({ length: max - min + 1 }, (_, i) => {
                const value = min + i;
                return (
                  <div key={value} className="flex flex-col items-center space-y-1 touch-friendly">
                    <span className="text-xs sm:text-sm font-medium">{value}</span>
                    <RadioGroupItem value={String(value)} id={`${question.id}-${value}`} className="touch-friendly" />
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );
        
      default:
        return (
          <Input
            value={answer?.answer as string || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="답변을 입력해 주세요"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>설문을 불러오는 중...</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>설문을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const totalSteps = getTotalSteps();
  
  console.log('Preview Render - currentStep:', currentStep, 'totalSteps:', totalSteps, 'questions:', questions);
  
  // 진행률 계산: 실제 답변 완성도 기반
  const calculateProgress = () => {
    if (questions.length === 0) return 0;
    
    let answeredCount = 0;
    questions.forEach(question => {
      const answer = answers.find(a => a.questionId === question.id);
      if (answer && answer.answer) {
        if (Array.isArray(answer.answer) && answer.answer.length > 0) {
          answeredCount++;
        } else if (typeof answer.answer === 'string' && answer.answer.trim() !== '') {
          answeredCount++;
        }
      }
    });
    
    return (answeredCount / questions.length) * 100;
  };
  
  const progress = calculateProgress();

  const isLastStep = currentStep === totalSteps - 1;
  const currentQuestions = getCurrentStepQuestions();
  const currentSessionId = currentQuestions[0]?.session_id;
  const sessionDetails = Array.from(sessionsMap.entries())
    .map(([id, info]) => ({
      id,
      session_name: info.session_name,
      course_title: info.course_title,
      session_order: info.session_order,
      instructor: sessionInstructorMap.get(id) || null,
    }))
    .sort((a, b) => (a.session_order ?? 0) - (b.session_order ?? 0));
  const hasInstructorInfo = Boolean(currentQuestionInstructor || instructor);
  const hasSessionInfo = sessionDetails.length > 0;

  const renderInstructorSection = (className = 'mb-0') => {
    if (!hasInstructorInfo) {
      return null;
    }

    const instructorToShow = currentQuestionInstructor || instructor;

    return (
      <InstructorInfoSection
        instructor={instructorToShow}
        title={currentQuestionInstructor ? "현재 강사" : "강사 정보"}
        className={className}
      />
    );
  };

  const renderSessionInfoCard = (className = 'mb-0') => {
    if (!hasSessionInfo) {
      return null;
    }

    const cardClassName = ['border-primary/20', className].filter(Boolean).join(' ');

    return (
      <Card className={cardClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">세션 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionDetails.map(detail => {
            const isActive = detail.id === currentSessionId;
            const containerClass = [
              'rounded-lg border p-3 transition-colors',
              isActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
            ].join(' ');

            return (
              <div key={detail.id} className={containerClass}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-foreground">
                      {detail.course_title || detail.session_name || '세션'}
                    </p>
                    {detail.course_title && detail.session_name && (
                      <p className="text-xs text-muted-foreground">{detail.session_name}</p>
                    )}
                    {detail.instructor?.name && (
                      <p className="text-xs text-muted-foreground">담당: {detail.instructor.name}</p>
                    )}
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="shrink-0">
                      진행 중
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const handleCopyLink = async () => {
    if (!surveyId) return;

    const surveyUrl = getSurveyUrl(surveyId);

    if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) {
      toast({
        title: '클립보드를 지원하지 않습니다',
        description: '브라우저에서 복사 기능을 지원하지 않습니다. 링크를 직접 선택해 복사해 주세요.',
        variant: 'destructive',
      });
      setHasCopied(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(surveyUrl);
      toast({
        title: '링크 복사 완료',
        description: '설문 링크가 클립보드에 복사되었습니다.',
      });
      setHasCopied(true);
    } catch (error) {
      console.error('Failed to copy survey link:', error);
      toast({
        title: '링크 복사 실패',
        description: '브라우저 설정을 확인하거나 링크를 직접 복사해 주세요.',
        variant: 'destructive',
      });
      setHasCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center gap-4 max-w-full overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/surveys')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h1 className="text-sm sm:text-base md:text-lg font-semibold break-words line-clamp-1">{survey.title}</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-1">미리보기 모드 - {getStepTitle()}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 max-w-6xl overflow-hidden">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                이것은 설문 미리보기 모드입니다. 응답 데이터는 실제로 저장되지 않습니다.
              </AlertDescription>
            </Alert>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {currentStep + 1} / {totalSteps}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {Math.round(progress)}% 완료
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-6 lg:hidden">
              {renderInstructorSection()}
              {renderSessionInfoCard()}
            </div>

            <Card className="max-w-full">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg break-words">
                  {currentQuestions.length > 1 ? `페이지 ${currentStep + 1}` : `질문 ${currentStep + 1}`}
                </CardTitle>
                {(() => {
                  const cur = getCurrentStepQuestions();
                  const first = cur[0];
                  if (!first || !first.section_id) return null;
                  const s = sections.find((x) => x.id === first.section_id);
                  return s?.description ? <p className="text-muted-foreground text-sm break-words">{s.description}</p> : null;
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
                          <span className="text-sm text-muted-foreground mr-2">{index + 1}.</span>
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
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="touch-friendly flex-1 sm:flex-none sm:min-w-[100px] order-1"
                  >
                    이전
                  </Button>

                  {!isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="touch-friendly flex-1 sm:flex-none sm:min-w-[100px] order-2"
                    >
                      다음
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handlePreviewComplete}
                      className="touch-friendly flex-1 sm:flex-none sm:min-w-[140px] order-2 bg-green-600 hover:bg-green-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      미리보기 완료
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  설문 링크 공유
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={getSurveyUrl(surveyId!)} readOnly className="w-full" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleCopyLink} className="touch-friendly w-full sm:w-auto">
                    <Copy className="h-4 w-4 mr-2" />
                    링크 복사
                  </Button>
                  {hasCopied && (
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="touch-friendly w-full sm:w-auto"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      링크 재복사
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  복사 기능이 동작하지 않으면 위 링크를 직접 선택해 복사해 주세요.
                </p>
              </CardContent>
            </Card>
          </div>

          {(hasInstructorInfo || hasSessionInfo) && (
            <aside className="hidden lg:block space-y-6 lg:sticky lg:top-24 h-fit">
              {renderInstructorSection('mb-0')}
              {renderSessionInfoCard('mb-0')}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

export default SurveyPreview;