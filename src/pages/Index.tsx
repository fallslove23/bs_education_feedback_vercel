import { useState, useEffect, useCallback, useMemo, useRef, KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar, Users, BookOpen, FileText, Filter, Search, Hourglass, ArrowRight } from 'lucide-react';
import { MobileOptimizedContainer } from '@/components/MobileOptimizedContainer';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  instructor_id?: string;
  course_id?: string;
  course_name?: string;
  survey_instructors?: Array<{
    instructors: {
      id: string;
      name: string;
    };
  }>;
  instructors?: {
    id: string;
    name: string;
  };
  courses?: {
    title: string;
  };
}

interface Course {
  id: string;
  title: string;
}

interface Instructor {
  id: string;
  name: string;
}

const SURVEY_SELECT_FIELDS = `
  id,
  title,
  description,
  status,
  created_at,
  start_date,
  end_date,
  instructor_id,
  course_id,
  course_name,
  survey_instructors (
    instructors (id, name)
  ),
  instructors (id, name)
`;

const Index = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('today');
  const [recentSurveys, setRecentSurveys] = useState<Survey[]>([]);
  const [closingSoonSurveys, setClosingSoonSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const skipUrlSyncRef = useRef(false);
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuth();

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: '전체 상태' },
      { value: 'active', label: '진행중' },
      { value: 'public', label: '공개' },
      { value: 'completed', label: '완료' },
    ],
    [],
  );

  useEffect(() => {
    skipUrlSyncRef.current = true;
    const q = searchParams.get('q') ?? '';
    const statusParam = searchParams.get('status') ?? 'all';
    const instructorParam = searchParams.get('instructor') ?? 'all';
    const courseParam = searchParams.get('course') ?? 'all';
    const timeParam = (searchParams.get('time') ?? 'today') as 'today' | 'all';

    const allowedStatus = statusOptions.some((option) => option.value === statusParam) ? statusParam : 'all';
    const allowedTime = timeParam === 'all' ? 'all' : 'today';

    setSearchTerm(q);
    setStatusFilter(allowedStatus);
    setInstructorFilter(instructorParam);
    setCourseFilter(courseParam);
    setTimeFilter(allowedTime);
  }, [searchParams, statusOptions]);

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('q', searchTerm);
    }
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    if (instructorFilter !== 'all') {
      params.set('instructor', instructorFilter);
    }
    if (courseFilter !== 'all') {
      params.set('course', courseFilter);
    }
    if (timeFilter !== 'today') {
      params.set('time', timeFilter);
    }

    const current = searchParams.toString();
    const next = params.toString();
    if (current !== next) {
      setSearchParams(params, { replace: true });
    }
  }, [searchTerm, statusFilter, instructorFilter, courseFilter, timeFilter, searchParams, setSearchParams]);

  useEffect(() => {
    if (timeFilter === 'today') {
      if (searchTerm) {
        setSearchTerm('');
      }
      if (statusFilter !== 'all') {
        setStatusFilter('all');
      }
      if (instructorFilter !== 'all') {
        setInstructorFilter('all');
      }
      if (courseFilter !== 'all') {
        setCourseFilter('all');
      }
    }
  }, [timeFilter, searchTerm, statusFilter, instructorFilter, courseFilter]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      let query = supabase.from('surveys').select(SURVEY_SELECT_FIELDS);

      if (timeFilter === 'all') {
        if (statusFilter === 'all') {
          query = query.in('status', ['active', 'public']);
        } else {
          query = query.eq('status', statusFilter);
        }

        if (courseFilter !== 'all') {
          query = query.eq('course_id', courseFilter);
        }

        if (instructorFilter !== 'all') {
          query = query.or(`instructor_id.eq.${instructorFilter},survey_instructors.instructor_id.eq.${instructorFilter}`);
        }

        const sanitizedSearchTerm = searchTerm.replace(/,/g, '\\,').trim();
        if (sanitizedSearchTerm) {
          query = query.or(`title.ilike.%${sanitizedSearchTerm}%,description.ilike.%${sanitizedSearchTerm}%`);
        }
      } else {
        query = query.in('status', ['active', 'public']);
      }

      if (timeFilter === 'today') {
        // DB 쿼리 대신 받아온 데이터에서 JS로 필터링합니다.
        // 이를 통해 "오늘 시작한 설문" 뿐만 아니라 "오늘 진행 중인(걸쳐있는) 설문"까지 포함합니다.
        // 또한 UTC/KST 시간대 변환 문제도 JS Date 객체로 더 유연하게 처리할 수 있습니다.
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      let filteredData = data ?? [];

      if (timeFilter === 'today') {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        filteredData = filteredData.filter((survey) => {
          // start_date가 없으면 created_at을 시작일로 간주
          const startDate = survey.start_date
            ? new Date(survey.start_date)
            : new Date(survey.created_at);

          // end_date가 없으면(null) 무기한으로 간주하여 아주 먼 미래로 설정
          const endDate = survey.end_date
            ? new Date(survey.end_date)
            : new Date(8640000000000000); // Max Date

          // [오늘 시작, 오늘 끝] 기간과 [설문 시작, 설문 끝] 기간이 겹치는지 확인
          // 조건: 설문 시작 <= 오늘 끝 AND 설문 끝 >= 오늘 시작
          return startDate <= endOfToday && endDate >= startOfToday;
        });
      }

      setSurveys(filteredData);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setFetchError('설문 데이터를 불러오는 중 오류가 발생했습니다.');
      setSurveys([]);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '설문 목록을 불러오지 못했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, courseFilter, instructorFilter, searchTerm, timeFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data: courseData, error: courseError } = await (supabase as any)
          .from('courses')
          .select('id, title')
          .order('title');

        if (courseError) {
          throw courseError;
        }

        setCourses(courseData || []);
      } catch (error) {
        console.warn('Error fetching courses:', error);
        setCourses([]);
      }

      try {
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructors')
          .select('id, name')
          .order('name');

        if (instructorError) {
          throw instructorError;
        }

        setInstructors(instructorData || []);
      } catch (error) {
        console.warn('Error fetching instructors:', error);
        setInstructors([]);
      }
    };

    loadFilterOptions();
  }, []);

  const fetchRecommendations = useCallback(async () => {
    try {
      setRecommendationsLoading(true);

      const { data: recentData, error: recentError } = await supabase
        .from('surveys')
        .select(SURVEY_SELECT_FIELDS)
        .in('status', ['active', 'public'])
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentError) {
        throw recentError;
      }

      setRecentSurveys(recentData || []);

      const now = new Date();
      const upcomingLimit = new Date(now);
      upcomingLimit.setDate(upcomingLimit.getDate() + 7);
      const nowIso = now.toISOString();
      const upcomingIso = upcomingLimit.toISOString();

      const { data: closingSoonData, error: closingSoonError } = await supabase
        .from('surveys')
        .select(SURVEY_SELECT_FIELDS)
        .in('status', ['active', 'public'])
        .not('end_date', 'is', null)
        .gte('end_date', nowIso)
        .lte('end_date', upcomingIso)
        .order('end_date', { ascending: true })
        .limit(4);

      if (closingSoonError) {
        throw closingSoonError;
      }

      setClosingSoonSurveys(closingSoonData || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecentSurveys([]);
      setClosingSoonSurveys([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const filterSummaryBadges = useMemo(() => {
    if (timeFilter === 'today') {
      return [] as string[];
    }

    const badges: string[] = ['전체 설문'];

    const statusLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? '전체 상태';
    badges.push(`상태: ${statusLabel}`);

    const courseLabel = courseFilter === 'all'
      ? '전체 과정'
      : courses.find((course) => course.id === courseFilter)?.title ?? '선택한 과정';
    badges.push(`과정: ${courseLabel}`);

    const instructorLabel = instructorFilter === 'all'
      ? '전체 강사'
      : instructors.find((instructor) => instructor.id === instructorFilter)?.name ?? '선택한 강사';
    badges.push(`강사: ${instructorLabel}`);

    if (searchTerm) {
      badges.push(`검색: ${searchTerm}`);
    }

    return badges;
  }, [timeFilter, statusFilter, courseFilter, instructorFilter, searchTerm, courses, instructors, statusOptions]);

  const emptyStateMessage = useMemo(() => {
    if (loading) {
      return '설문을 불러오는 중입니다...';
    }

    if (fetchError) {
      return fetchError;
    }

    if (timeFilter === 'today') {
      return '오늘 진행중인 설문이 없습니다.';
    }

    if (searchTerm) {
      return '검색 조건에 맞는 설문조사가 없습니다.';
    }

    if (courseFilter !== 'all' && instructorFilter !== 'all') {
      return '선택한 과정과 강사에 해당하는 설문이 없습니다.';
    }
    if (courseFilter !== 'all') {
      return '선택한 과정에 진행중인 설문조사가 없습니다.';
    }
    if (instructorFilter !== 'all') {
      return '선택한 강사의 설문조사가 없습니다.';
    }
    if (statusFilter !== 'all') {
      return '선택한 상태의 설문조사가 없습니다.';
    }

    return '현재 진행중인 설문조사가 없습니다.';
  }, [loading, fetchError, timeFilter, searchTerm, courseFilter, instructorFilter, statusFilter]);

  const getInstructorNames = (survey: Survey): string | null => {
    let instructorName = '';

    if (survey.survey_instructors && survey.survey_instructors.length > 0) {
      const names = survey.survey_instructors
        .map((item) => item.instructors?.name)
        .filter(Boolean) as string[];
      if (names.length > 0) {
        instructorName = names.join(', ');
      }
    }

    if (!instructorName && survey.instructors?.name) {
      instructorName = survey.instructors.name;
    }

    return instructorName || null;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setInstructorFilter('all');
    setCourseFilter('all');
  };

  const getStatusBadge = (status: string, endDate?: string | null): JSX.Element => {
    // 종료 날짜가 있고 현재 시간이 종료 날짜를 지났으면 "완료"로 표시
    if (endDate) {
      const now = new Date();
      const end = new Date(endDate);
      if (now > end) {
        return <Badge variant="secondary" className="font-sans">완료됨</Badge>;
      }
    }

    switch (status) {
      case 'active':
        return <Badge variant="default" className="font-sans">진행중</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="font-sans">완료</Badge>;
      default:
        return <Badge variant="outline" className="font-sans">준비중</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const handleSurveyNavigation = (surveyId: string) => {
    navigate(`/survey/${surveyId}`);
  };

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    surveyId: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSurveyNavigation(surveyId);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <MobileOptimizedContainer>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-primary font-display">BS/SS 교육과정 설문 피드백</h1>
              <div className="flex items-center gap-2">
                {authUser ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/default-redirect')}
                    className="font-sans"
                  >
                    대시보드
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="font-sans"
                  >
                    로그인
                  </Button>
                )}
              </div>
            </div>
            {filterSummaryBadges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {filterSummaryBadges.map((badgeLabel, index) => (
                  <Badge key={`${badgeLabel}-${index}`} variant="outline" className="font-sans">
                    {badgeLabel}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2 font-display">BS/SS 교육과정 설문 피드백</h2>
                <p className="text-muted-foreground font-sans">
                  참여 가능한 설문조사 목록입니다. 설문조사를 클릭하여 참여해주세요.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start rounded-lg bg-muted p-1">
                <Button
                  variant={timeFilter === 'today' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFilter('today')}
                  className="px-4 py-2"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  오늘 설문
                </Button>
                <Button
                  variant={timeFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFilter('all')}
                  className="px-4 py-2"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  전체 설문
                </Button>
              </div>
            </div>

            {timeFilter === 'all' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-sm h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-display">
                      <Clock className="h-5 w-5 text-primary" />
                      최근 생성 설문
                    </CardTitle>
                    <CardDescription className="font-sans">
                      막 등록된 설문을 빠르게 찾아보세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recommendationsLoading ? (
                      <p className="text-sm text-muted-foreground text-center font-sans">
                        추천 설문을 불러오는 중입니다.
                      </p>
                    ) : recentSurveys.length > 0 ? (
                      <div className="space-y-3">
                        {recentSurveys.map((survey) => {
                          const instructorName = getInstructorNames(survey);
                          return (
                            <div
                              key={survey.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSurveyNavigation(survey.id)}
                              onKeyDown={(event) => handleCardKeyDown(event, survey.id)}
                              className="rounded-lg border bg-muted/40 p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground flex-1 truncate" title={survey.title}>
                                  {survey.title}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  생성일 {formatDate(survey.created_at)}
                                </span>
                              </div>
                              {instructorName && (
                                <p className="mt-1 text-xs text-muted-foreground truncate" title={instructorName}>
                                  강사: {instructorName}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center font-sans">
                        최근에 생성된 설문이 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-display">
                      <Hourglass className="h-5 w-5 text-primary" />
                      마감 임박
                    </CardTitle>
                    <CardDescription className="font-sans">
                      마감이 가까운 설문을 놓치지 마세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recommendationsLoading ? (
                      <p className="text-sm text-muted-foreground text-center font-sans">
                        추천 설문을 불러오는 중입니다.
                      </p>
                    ) : closingSoonSurveys.length > 0 ? (
                      <div className="space-y-3">
                        {closingSoonSurveys.map((survey) => {
                          const instructorName = getInstructorNames(survey);
                          return (
                            <div
                              key={survey.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSurveyNavigation(survey.id)}
                              onKeyDown={(event) => handleCardKeyDown(event, survey.id)}
                              className="rounded-lg border bg-muted/40 p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground flex-1 truncate" title={survey.title}>
                                  {survey.title}
                                </span>
                                {survey.end_date && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    마감 {formatDate(survey.end_date)}
                                  </span>
                                )}
                              </div>
                              {instructorName && (
                                <p className="mt-1 text-xs text-muted-foreground truncate" title={instructorName}>
                                  강사: {instructorName}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate" title={survey.course_name || '기타 과정'}>
                                  {survey.course_name || '기타 과정'}
                                </span>
                                <div className="shrink-0">
                                  {getStatusBadge(survey.status, survey.end_date)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center font-sans">
                        마감이 임박한 설문이 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {timeFilter === 'all' && (
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-display">
                  <Filter className="h-5 w-5 text-primary" />
                  설문 필터
                </CardTitle>
                <CardDescription className="font-sans">
                  검색어나 조건을 선택해 원하는 설문을 찾아보세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium font-sans" htmlFor="survey-search">
                      검색어
                    </label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="survey-search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="설문 제목이나 설명을 입력하세요"
                        className="pl-9 font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium font-sans">상태</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue placeholder="상태를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="font-sans">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium font-sans">강사</label>
                    <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue placeholder="강사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-sans">
                          전체 강사
                        </SelectItem>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id} className="font-sans">
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium font-sans">과정</label>
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue placeholder="과정을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-sans">
                          전체 과정
                        </SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id} className="font-sans">
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground font-sans">
                    총 {surveys.length}개의 설문이 검색되었습니다.
                  </span>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="font-sans">
                    필터 초기화
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {surveys.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/30">
              <p className="text-muted-foreground text-lg font-sans">{emptyStateMessage}</p>
              {!loading && !fetchError && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {timeFilter === 'today' && (
                    <Button variant="outline" onClick={() => setTimeFilter('all')} className="font-sans">
                      전체 설문 보기
                    </Button>
                  )}
                  {(searchTerm || statusFilter !== 'all' || instructorFilter !== 'all' || courseFilter !== 'all') && (
                    <Button variant="outline" onClick={resetFilters} className="font-sans">
                      필터 초기화
                    </Button>
                  )}
                </div>
              )}
              {fetchError && (
                <Button variant="outline" onClick={() => fetchData()} className="mt-4 font-sans">
                  다시 불러오기
                </Button>
              )}
            </div>
          ) : (
            <>
              {(() => {
                const groupedSurveys = surveys.reduce((groups, survey) => {
                  const courseName = survey.course_name || '기타';
                  if (!groups[courseName]) {
                    groups[courseName] = [];
                  }
                  groups[courseName].push(survey);
                  return groups;
                }, {} as Record<string, Survey[]>);

                return Object.entries(groupedSurveys).map(([courseName, courseSurveys]) => (
                  <div key={courseName} className="mb-8">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {courseName}
                        <Badge variant="secondary" className="ml-2 font-sans">
                          {courseSurveys.length}개
                        </Badge>
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {courseSurveys.map((survey) => (
                        <Link
                          key={survey.id}
                          to={`/survey/${survey.id}`}
                          aria-label={`${survey.title} 설문 참여하기`}
                          className="group block h-full cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Card className="flex h-full cursor-pointer flex-col transition-shadow group-hover:shadow-lg">
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                <CardTitle className="text-lg font-display truncate" title={survey.title}>
                                  {survey.title}
                                </CardTitle>
                                {getStatusBadge(survey.status, survey.end_date)}
                              </div>
                              {survey.description && (
                                <CardDescription className="font-sans truncate" title={survey.description}>
                                  {survey.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="flex h-full flex-col justify-between">
                              <div className="space-y-2 text-sm font-sans">
                                {(() => {
                                  const instructorName = getInstructorNames(survey);
                                  if (!instructorName) {
                                    return null;
                                  }
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span className="truncate" title={instructorName}>
                                        강사: {instructorName}
                                      </span>
                                    </div>
                                  );
                                })()}
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>생성일: {formatDate(survey.created_at)}</span>
                                </div>
                                {(survey.start_date || survey.end_date) && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      {survey.start_date && `시작: ${formatDate(survey.start_date)}`}
                                      {survey.start_date && survey.end_date && ' | '}
                                      {survey.end_date && `종료: ${formatDate(survey.end_date)}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 flex items-center justify-between text-primary font-medium font-sans">
                                <span>설문 참여하기</span>
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </main>
      </div>
    </MobileOptimizedContainer>
  );
};

export default Index;