import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Download,
  Share2,
  Star,
  Target,
  BookOpen,
  BarChart3,
  Loader2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CourseStatsCards from '@/components/course-reports/CourseStatsCards';
import InstructorStatsSection from '@/components/course-reports/InstructorStatsSection';
import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { KeywordCloud } from '@/components/course-reports/KeywordCloud';
import { YearFilter, CourseFilter } from '@/components/filters';
import { useFilterState } from '@/hooks/useFilterState';
import { useCourseReportsData } from '@/hooks/useCourseReportsData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateCourseReportPDF } from '@/utils/pdfExport';
import { ChartErrorBoundary, PageErrorBoundary, HookErrorBoundary, DataProcessingErrorBoundary } from '@/components/error-boundaries';
import { fetchDashboardCounts, type DashboardCounts } from '@/repositories/dashboardRepository';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

const CURRENT_YEAR = new Date().getFullYear();

const toFixedOrZero = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined) return 0;
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  
  const rounded = Number(value.toFixed(digits));
  return Number.isFinite(rounded) && !Number.isNaN(rounded) ? rounded : 0;
};

// Safe integer formatter with fallback
const formatInt = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  if (typeof value !== 'number') return '0';
  if (!Number.isFinite(value) || Number.isNaN(value)) return '0';
  return value.toLocaleString();
};

const CourseReports: React.FC = () => {
  return (
    <PageErrorBoundary pageName="Course Reports">
      <CourseReportsContent />
    </PageErrorBoundary>  
  );
};

const CourseReportsContent: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRoles } = useAuth();
  const isMobile = useIsMobile();
  
  // Use new filter state hook with URL synchronization
  const { filters, updateFilter } = useFilterState({
    defaultYear: CURRENT_YEAR,
    syncToUrl: true,
  });

  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('');
  const [selectedCourseLabel, setSelectedCourseLabel] = useState<string>('전체 과정');
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  const {
    summary,
    previousSummary,
    trend,
    instructorStats,
    previousInstructorStats,
    textualResponses,
    availableSessions,  // Changed from availableCourses
    availableRounds,
    availableInstructors,
    loading,
    isInstructor,
    instructorId,
    instructorName,
  } = useCourseReportsData(
    filters.year || CURRENT_YEAR,
    selectedSessionKey, // Now passing sessionKey instead of courseName
    null, // round - not using round filter for now
    '', // instructor - not filtering by instructor in this view
    false,
  );

  // Fetch dashboard counts when year or sessionKey changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const loadDashboardCounts = async () => {
        setLoadingCounts(true);
        console.log('🔍 Fetching dashboard counts:', { year: filters.year || CURRENT_YEAR, sessionKey: selectedSessionKey || null });
        
        try {
          const counts = await fetchDashboardCounts(
            filters.year || CURRENT_YEAR,
            selectedSessionKey || null
          );
          console.log('✅ Dashboard counts received:', counts);
          setDashboardCounts(counts);
        } catch (error) {
          console.error('❌ Failed to load dashboard counts:', error);
          toast({
            title: '오류',
            description: '대시보드 통계를 불러오지 못했습니다.',
            variant: 'destructive',
          });
        } finally {
          setLoadingCounts(false);
        }
      };

      loadDashboardCounts();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters.year, selectedSessionKey, toast]);

  // Sync session key from filters.courseId (which now contains sessionKey UUID)
  useEffect(() => {
    setSelectedSessionKey(filters.courseId || '');
    setSelectedCourseLabel((filters as any).meta?.courseTitle || '전체 과정');
  }, [filters.courseId, (filters as any).meta?.courseTitle]);

  const currentCourseName = useMemo(() => {
    return selectedCourseLabel || '전체 과정';
  }, [selectedCourseLabel]);

  const satisfactionChartData = useMemo(() => {
    if (!dashboardCounts || !dashboardCounts.avg_score) return [] as Array<{ name: string; value: number; color: string }>;

    // Use the same avg_score for all three categories as a simplified version
    // In a real implementation, you might want to fetch separate scores
    const avgValue = toFixedOrZero(dashboardCounts.avg_score);

    const data = [
      { name: '강사 만족도', value: avgValue, color: 'hsl(var(--chart-1))' },
      { name: '과정 만족도', value: avgValue, color: 'hsl(var(--chart-2))' },
      { name: '운영 만족도', value: avgValue, color: 'hsl(var(--chart-3))' },
    ];

    return data
      .filter((item) => Number.isFinite(item.value) && !Number.isNaN(item.value) && item.value > 0)
      .map(item => ({
        ...item,
        value: Number.isFinite(item.value) ? item.value : 0
      }));
  }, [dashboardCounts]);

  const trendChartData = useMemo(() => {
    if (!Array.isArray(trend)) return [];
    return trend
      .map((point, index) => {
        const instructorVal = toFixedOrZero(point.avgInstructorSatisfaction);
        const courseVal = toFixedOrZero(point.avgCourseSatisfaction);
        const operationVal = toFixedOrZero(point.avgOperationSatisfaction);
        return {
          name: point.educationRound ? `${point.educationRound}차` : `기준 ${index + 1}`,
          '강사 만족도': Number.isFinite(instructorVal) ? instructorVal : 0,
          '과정 만족도': Number.isFinite(courseVal) ? courseVal : 0,
          '운영 만족도': Number.isFinite(operationVal) ? operationVal : 0,
        };
      })
      .filter(item => item['강사 만족도'] > 0 || item['과정 만족도'] > 0 || item['운영 만족도'] > 0);
  }, [trend]);

  const instructorStatsDisplay = useMemo(() => {
    // 운영 만족도 전용 강사 ID 목록 (실제 강의를 하지 않고 운영 세션만 담당)
    const operationalOnlyInstructors = new Set([
      '1a72370e-ec17-4338-b501-aed48a7ace5b', // 최효동
    ]);
    
    const result = instructorStats
      .filter((stat) => !operationalOnlyInstructors.has(stat.instructorId ?? ''))
      .map((stat) => ({
        instructor_id: stat.instructorId ?? '',
        instructor_name: stat.instructorName,
        survey_count: stat.surveyCount,
        response_count: stat.responseCount,
        avg_satisfaction: toFixedOrZero(stat.avgSatisfaction),
      }));
    console.log('👨‍🏫 Instructor stats display:', result);
    return result;
  }, [instructorStats]);

  const previousInstructorStatsDisplay = useMemo(() => {
    // 운영 만족도 전용 강사 제외
    const operationalOnlyInstructors = new Set([
      '1a72370e-ec17-4338-b501-aed48a7ace5b', // 최효동
    ]);
    
    return previousInstructorStats
      .filter((stat) => !operationalOnlyInstructors.has(stat.instructorId ?? ''))
      .map((stat) => ({
        instructor_id: stat.instructorId ?? '',
        instructor_name: stat.instructorName,
        survey_count: stat.surveyCount,
        response_count: stat.responseCount,
        avg_satisfaction: toFixedOrZero(stat.avgSatisfaction),
      }));
  }, [previousInstructorStats]);

  const overallSatisfaction = useMemo(() => {
    if (!dashboardCounts || !dashboardCounts.avg_score) return 0;
    return toFixedOrZero(dashboardCounts.avg_score);
  }, [dashboardCounts]);

  const satisfactionChange = useMemo(() => {
    // Previous year comparison is not implemented in new RPC
    // Could be added later if needed
    return null;
  }, []);

  const handleInstructorClick = async (instructorIdValue: string) => {
    if (!instructorIdValue) return;
    
    try {
      // 1. surveys 테이블에서 직접 instructor_id로 조회
      let baseQuery = supabase
        .from('surveys')
        .select('id, title, created_at')
        .eq('education_year', filters.year || CURRENT_YEAR)
        .order('created_at', { ascending: false });

      if (selectedSessionKey) {
        baseQuery = baseQuery.eq('session_id', selectedSessionKey);
      }

      const surveyFromMain = baseQuery.eq('instructor_id', instructorIdValue);
      
      // 2. survey_sessions를 통한 조회
      const surveyFromSessions = supabase
        .from('survey_sessions')
        .select('survey_id, surveys!inner(id, title, created_at, education_year, session_id)')
        .eq('instructor_id', instructorIdValue);

      // 두 쿼리를 병렬로 실행
      const [mainResult, sessionsResult] = await Promise.all([
        surveyFromMain,
        surveyFromSessions
      ]);

      // 결과 합치기
      const allSurveys: Array<{id: string, title: string, created_at: string}> = [];
      
      if (mainResult.data && mainResult.data.length > 0) {
        allSurveys.push(...mainResult.data.map(s => ({ 
          id: s.id, 
          title: s.title,
          created_at: s.created_at 
        })));
      }
      
      if (sessionsResult.data && sessionsResult.data.length > 0) {
        const sessionSurveys = sessionsResult.data
          .map(ss => ss.surveys)
          .filter((s): s is NonNullable<typeof s> => {
            if (!s || typeof s !== 'object' || !('id' in s)) return false;
            const survey = s as any;
            // 연도와 세션 필터 적용
            if (survey.education_year !== (filters.year || CURRENT_YEAR)) return false;
            if (selectedSessionKey && survey.session_id !== selectedSessionKey) return false;
            return true;
          })
          .map(s => ({ 
            id: (s as any).id, 
            title: (s as any).title,
            created_at: (s as any).created_at
          }));
        
        allSurveys.push(...sessionSurveys);
      }

      // 중복 제거 및 최신순 정렬
      const uniqueSurveys = Array.from(
        new Map(allSurveys.map(s => [s.id, s])).values()
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (uniqueSurveys.length === 0) {
        toast({
          title: '설문이 없습니다',
          description: '해당 강사의 설문을 찾을 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      // 여러 설문이 있고 과정 필터가 없는 경우 안내 메시지 표시
      if (uniqueSurveys.length > 1 && !selectedSessionKey) {
        toast({
          title: '여러 설문 중 최근 설문 표시',
          description: '해당 강사의 여러 설문 중 최근 설문을 표시합니다. 다른 설문을 보려면 과정 필터를 사용하세요.',
          duration: 5000,
        });
      }

      // 첫 번째(최신) 설문의 상세 분석 페이지로 이동
      navigate(`/survey-detailed-analysis/${uniqueSurveys[0].id}?instructorId=${instructorIdValue}`);
    } catch (error) {
      console.error('Error in handleInstructorClick', error);
      toast({
        title: '오류',
        description: '강사 설문을 여는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const hasExportable = useMemo(() => {
    return (dashboardCounts?.survey_count ?? 0) > 0;
  }, [dashboardCounts]);

  const showNoResponsesBanner = useMemo(() => {
    return !!selectedSessionKey && !loading && !loadingCounts && !!dashboardCounts && (dashboardCounts.survey_count === 0);
  }, [selectedSessionKey, loading, loadingCounts, dashboardCounts]);

  const handleShareReport = () => {
    if (!hasExportable) {
      toast({
        title: '공유할 데이터가 없습니다.',
        description: '데이터를 불러온 후 다시 시도해 주세요.',
        variant: 'destructive',
      });
      return;
    }

    const shareData = {
      title: `${filters.year || CURRENT_YEAR}년 ${currentCourseName} 결과 보고서`,
      text: `${filters.year || CURRENT_YEAR}년 ${currentCourseName} 결과를 확인해보세요.`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
          toast({
            title: '링크 복사 완료',
            description: '보고서 링크가 클립보드에 복사되었습니다.',
          });
        });
      }
    } catch (error) {
      console.error('Share report error', error);
      toast({
        title: '공유 실패',
        description: '결과를 공유하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handlePDFExport = () => {
    if (!hasExportable) {
      toast({
        title: '내보낼 데이터가 없습니다.',
        description: '데이터를 불러온 후 다시 시도해 주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      generateCourseReportPDF({
        reportTitle: `${currentCourseName} 결과 보고서`,
        year: filters.year || CURRENT_YEAR,
        round: undefined,
        courseName: currentCourseName,
        totalSurveys: dashboardCounts?.survey_count ?? 0,
        totalResponses: dashboardCounts?.respondent_count ?? 0,
        instructorCount: dashboardCounts?.instructor_count ?? 0,
        avgInstructorSatisfaction: dashboardCounts?.avg_score ? toFixedOrZero(dashboardCounts.avg_score) : 0,
        avgCourseSatisfaction: dashboardCounts?.avg_score ? toFixedOrZero(dashboardCounts.avg_score) : 0,
        avgOperationSatisfaction: dashboardCounts?.avg_score ? toFixedOrZero(dashboardCounts.avg_score) : 0,
        instructorStats: instructorStatsDisplay.map((stat) => ({
          name: stat.instructor_name,
          surveyCount: stat.survey_count,
          responseCount: stat.response_count,
          avgSatisfaction: stat.avg_satisfaction,
        })),
      });

      toast({
        title: 'PDF 다운로드 완료',
        description: '과정 결과 보고서 PDF가 생성되었습니다.',
      });
    } catch (error) {
      console.error('PDF export error', error);
      toast({
        title: 'PDF 내보내기 실패',
        description: '보고서를 PDF로 내보내는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const content = (loading || loadingCounts) ? (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
      데이터를 불러오는 중입니다...
    </div>
  ) : dashboardCounts ? (
    <>
      {showNoResponsesBanner && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          선택한 세션 조건에서 집계된 응답이 없어 요약 지표가 0으로 표시됩니다.
        </div>
      )}
      
      <CourseStatsCards
        key={`${selectedSessionKey || 'all'}-${filters.year || CURRENT_YEAR}`}
        totalSurveys={dashboardCounts?.survey_count || 0}
        totalResponses={dashboardCounts?.respondent_count || 0}
        instructorCount={instructorStatsDisplay.length > 0 ? instructorStatsDisplay.length : (dashboardCounts?.instructor_count || 0)}
        avgSatisfaction={dashboardCounts?.avg_score ? toFixedOrZero(dashboardCounts.avg_score) : 0}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              영역별 만족도
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">강사, 과정, 운영 만족도를 비교해 보세요.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] sm:h-[280px] lg:h-[320px] p-2 sm:p-4">
            <ChartErrorBoundary fallbackDescription="만족도 차트를 표시할 수 없습니다.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={satisfactionChartData}
                  layout="vertical"
                  margin={{ 
                    top: 5, 
                    right: isMobile ? 5 : 10, 
                    left: isMobile ? 10 : 5, 
                    bottom: 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    domain={[0, 10]}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value}점`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    tick={{ fontSize: isMobile ? 9 : 9, fill: 'hsl(var(--foreground))' }}
                    width={isMobile ? 70 : 80}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}점`, '만족도']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: isMobile ? '6px 10px' : '8px 12px',
                      fontSize: isMobile ? '10px' : '12px'
                    }}
                    cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 8, 8, 0]}
                    maxBarSize={40}
                  >
                    {satisfactionChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              만족도 요약
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">전체 과정의 핵심 지표를 한눈에 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="text-xs sm:text-sm text-muted-foreground">과정명</span>
                <span className="font-semibold truncate ml-2">{currentCourseName}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="text-xs sm:text-sm text-muted-foreground">교육 연도</span>
                <span className="font-semibold">{filters.year || CURRENT_YEAR}년</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="text-xs sm:text-sm text-muted-foreground">응답한 인원수</span>
                <span className="font-semibold">{formatInt(dashboardCounts?.respondent_count)}명</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="text-xs sm:text-sm text-muted-foreground">참여 강사</span>
                <span className="font-semibold">{formatInt(dashboardCounts?.instructor_count)}명</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 sm:pt-4">
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground">종합 만족도</div>
                  {satisfactionChange && (
                    <div
                      className={`text-xs font-medium ${
                        satisfactionChange.diff >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {satisfactionChange.diff >= 0 ? '▲' : '▼'} {Math.abs(satisfactionChange.diff).toFixed(1)}점
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-3xl sm:text-4xl font-bold text-primary">{overallSatisfaction.toFixed(1)}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/ 10점</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {trendChartData.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              만족도 추이
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">차수별 만족도 변화를 확인해 보세요.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] sm:h-[280px] lg:h-80 p-2 sm:p-4 md:p-6">
            <ChartErrorBoundary fallbackDescription="만족도 추이 차트를 표시할 수 없습니다. 데이터를 확인해 주세요.">
              <AreaChart
                data={trendChartData}
                dataKeys={[
                  { key: '강사 만족도', label: '강사 만족도', color: 'hsl(var(--chart-1))' },
                  { key: '과정 만족도', label: '과정 만족도', color: 'hsl(var(--chart-2))' },
                  { key: '운영 만족도', label: '운영 만족도', color: 'hsl(var(--chart-3))' },
                ]}
                xAxisLabel="교육 차수"
                yAxisLabel="만족도 점수"
              />
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      )}

      {instructorStatsDisplay.length > 0 && (
        <InstructorStatsSection
          instructorStats={instructorStatsDisplay}
          previousStats={previousInstructorStatsDisplay}
          comparisonLabel={previousSummary?.educationRound ? `${previousSummary.educationRound}차` : '이전 회차'}
          onInstructorClick={handleInstructorClick}
        />
      )}

      {textualResponses.length > 0 && <KeywordCloud textualResponses={textualResponses} />}
    </>
  ) : (
    <Card className="border-dashed text-center">
      <CardContent className="py-12">
        <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">분석할 설문 데이터가 없습니다.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          선택한 연도에 완료된 설문이 없습니다. 다른 연도를 선택해 보세요.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <HookErrorBoundary hookName="useCourseReportsData">
      <div className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-primary">설문 결과 분석</h1>
                  <p className="text-sm text-muted-foreground">
                    설문 응답자 주요 지표를 서비스에서 진행한 데이터로 제공합니다.
                  </p>
                </div>
              </div>
              {dashboardCounts && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{filters.year || CURRENT_YEAR}년 전체 과정</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span>{dashboardCounts.survey_count.toLocaleString()}개 설문</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span>{dashboardCounts.respondent_count.toLocaleString()}명 응답</span>
                </div>
              )}
            </div>
            {dashboardCounts && (
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShareReport} 
                  className="bg-white/70"
                  disabled={!hasExportable}
                  title={!hasExportable ? '내보낼 데이터가 없습니다' : ''}
                >
                  <Share2 className="mr-2 h-4 w-4" /> 공유하기
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePDFExport} 
                  className="bg-white/70"
                  disabled={!hasExportable}
                  title={!hasExportable ? '내보낼 데이터가 없습니다' : ''}
                >
                  <Download className="mr-2 h-4 w-4" /> PDF 다운로드
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* New Filter System */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-card to-card/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle>필터</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <YearFilter
              value={filters.year}
              onChange={(year) => updateFilter('year', year)}
              includeAll={false}
            />
            <CourseFilter
              value={filters.courseId}
              onChange={(sessionKey, label) => {
                updateFilter('courseId', sessionKey, { courseTitle: label });
                setSelectedCourseLabel(label || '전체 과정');
              }}
              year={filters.year}
              includeAll={true}
            />
          </CardContent>
        </Card>

        <ChartErrorBoundary fallbackDescription="보고서 렌더링 중 오류가 발생했습니다.">
          {content}
        </ChartErrorBoundary>
      </div>
    </HookErrorBoundary>
  );
};

export default CourseReports;
