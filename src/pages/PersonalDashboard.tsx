import { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Award, BarChart3, TrendingUp, Users, Download, HelpCircle, ListChecks,
  Lightbulb, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInstructorStats } from '@/hooks/useInstructorStats';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMyStats } from '@/hooks/useMyStats';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartEmptyState } from '@/components/charts';
import { getCombinedRecordMetrics } from '@/utils/surveyStats';
import { supabase } from '@/integrations/supabase/client';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  extra?: React.ReactNode;
}

function StatCard({ label, value, icon, extra }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-2xl md:text-3xl font-bold">{value}</p>
              {extra}
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full border border-dashed border-border/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            NO DATA
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">집계된 데이터가 없습니다</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              아직 통계 데이터가 수집되지 않았습니다. 설문이 완료되면 이곳에 표시됩니다.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DisabledFiltersNotice() {
  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          조회 조건
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>개인 통계 페이지에서는 본인 데이터만 조회됩니다</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription className="text-xs">
          필터를 사용하여 특정 연도 또는 과정의 통계를 확인할 수 있습니다
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

interface PersonalDashboardProps {
  targetInstructorId?: string;
}

export default function PersonalDashboard({ targetInstructorId }: PersonalDashboardProps) {
  const { instructorId: authInstructorId } = useAuth();
  const instructorId = targetInstructorId ?? authInstructorId;
  const { data: myStatsData } = useMyStats();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Source Surveys State
  const [showSourceSurveys, setShowSourceSurveys] = useState(false);
  const [sourceSurveys, setSourceSurveys] = useState<any[]>([]);
  const [sourceSurveysLoading, setSourceSurveysLoading] = useState(false);

  const filters = useMemo(() => ({
    year: selectedYear === 'all' ? 'all' as const : Number(selectedYear),
    round: 'all' as const,
    course: selectedCourse,
  }), [selectedYear, selectedCourse]);

  const stats = useInstructorStats({
    instructorId: instructorId ?? undefined,
    includeTestData: false,
    filters,
    enabled: Boolean(instructorId),
  });

  const radarData = useMemo(() => {
    if (!stats.courseBreakdown || stats.courseBreakdown.length === 0) return [];

    const calculateWeightedAvg = (key: 'avgInstructor' | 'avgCourse' | 'avgOperation' | 'avgSatisfaction') => {
      let totalVal = 0;
      let totalRes = 0;
      stats.courseBreakdown.forEach(item => {
        const val = item[key];
        if (val !== null && val > 0) {
          totalVal += val * item.responses;
          totalRes += item.responses;
        }
      });
      return totalRes === 0 ? 0 : Number((totalVal / totalRes).toFixed(1));
    };

    const data = [
      { subject: '강사 역량', value: calculateWeightedAvg('avgInstructor'), fullMark: 10 },
      { subject: '교육 내용', value: calculateWeightedAvg('avgCourse'), fullMark: 10 },
      { subject: '종합 만족도', value: calculateWeightedAvg('avgSatisfaction'), fullMark: 10 },
    ];

    return data.filter(item => item.value > 0);
  }, [stats.courseBreakdown]);

  const loadSourceSurveys = async (ids: string[]) => {
    if (ids.length === 0) {
      setSourceSurveys([]);
      return;
    }
    setSourceSurveysLoading(true);
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSourceSurveys(data || []);
    } catch (error) {
      console.error('Error loading source surveys:', error);
      toast({
        title: "설문 목록 로딩 실패",
        description: "설문 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setSourceSurveysLoading(false);
    }
  };

  const handleDownload = useCallback(() => {
    const csvRows = [
      ['구분', '값'],
      ['총 설문', stats.summary.totalSurveys],
      ['총 응답', stats.summary.totalResponses],
      ['평균 만족도', stats.summary.avgSatisfaction.toFixed(1)],
      ['활성 설문', stats.summary.activeSurveys],
      [''],
      ['연도별 추이'],
      ['기간', '만족도', '응답수'],
      ...stats.trend.map(t => [t.period, t.satisfaction.toFixed(1), t.responses]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `개인통계_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast({ title: '다운로드 완료', description: 'CSV 파일이 다운로드되었습니다.' });
  }, [stats.summary, stats.trend, toast]);

  if (!instructorId) {
    return (
      <Alert>
        <AlertTitle>접근 불가</AlertTitle>
        <AlertDescription>
          강사 계정이 연결되지 않았습니다. 관리자에게 문의하세요.
        </AlertDescription>
      </Alert>
    );
  }

  if (stats.loading) {
    return <LoadingState />;
  }

  if (stats.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>오류 발생</AlertTitle>
        <AlertDescription>{stats.error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats.hasData) {
    return (
      <div className="space-y-6">
        <DisabledFiltersNotice />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          {stats.filteredRecords[0]?.instructorName && (
            <Badge variant="secondary" className="text-sm">
              {stats.filteredRecords[0].instructorName}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allIds = Array.from(new Set(stats.filteredRecords.flatMap(r => r.surveyIds)));
              loadSourceSurveys(allIds);
              setShowSourceSurveys(true);
            }}
            disabled={!stats.hasData}
          >
            <ListChecks className="h-4 w-4 mr-2" />
            집계 데이터 보기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!stats.hasData}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">조회 조건</CardTitle>
          <CardDescription className="text-xs">
            연도와 과정을 선택하여 통계를 필터링할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">연도</p>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="연도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {stats.availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">과정</p>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="과정 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {stats.availableCourses.map(course => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          label="총 설문"
          value={stats.summary.totalSurveys}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="총 응답"
          value={stats.summary.totalResponses}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          label="평균 만족도"
          value={`${stats.summary.avgSatisfaction.toFixed(1)}점`}
          extra={<Badge variant="secondary">{stats.summary.satisfactionPercentage}%</Badge>}
        />
        <StatCard
          icon={<Award className="h-5 w-5 text-amber-500" />}
          label="활성 설문"
          value={stats.summary.activeSurveys}
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trend">추이</TabsTrigger>
          <TabsTrigger value="distribution">분포</TabsTrigger>
          <TabsTrigger value="courses">과정별</TabsTrigger>
          <TabsTrigger value="questions">질문별</TabsTrigger>
        </TabsList>

        {/* Trend Chart */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>만족도 추이</CardTitle>
              <CardDescription>기간별 평균 만족도와 응답 수</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.trend.length === 0 ? (
                <ChartEmptyState description="추이 데이터가 없습니다" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <LineChart data={stats.trend} margin={{
                    top: 20,
                    right: isMobile ? 10 : 30,
                    left: isMobile ? -20 : 0,
                    bottom: isMobile ? 5 : 5
                  }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                    <XAxis
                      dataKey="period"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 60 : 30}
                      axisLine={false}
                      tickLine={false}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                      width={isMobile ? 30 : 40}
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const courses = data.courses || [];
                          return (
                            <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-xl ring-1 ring-border max-w-[200px] sm:max-w-[280px]">
                              <p className="mb-2 font-semibold text-sm text-foreground">{label}</p>
                              <div className="mb-3 flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-primary" />
                                <span className="font-bold text-lg text-primary">
                                  {Number(data.average).toFixed(1)}점
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  / {data.responses}명 응답
                                </span>
                              </div>

                              {courses.length > 0 && (
                                <div className="border-t border-border/50 pt-2 mt-1">
                                  <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">진행 과정</p>
                                  <ul className="text-xs space-y-1">
                                    {courses.slice(0, 5).map((c: string, i: number) => (
                                      <li key={i} className="flex items-start gap-1.5 text-foreground/80">
                                        <span className="mt-1.5 h-0.5 w-0.5 rounded-full bg-foreground/40 shrink-0" />
                                        <span className="leading-tight">{c}</span>
                                      </li>
                                    ))}
                                    {courses.length > 5 && (
                                      <li className="text-muted-foreground text-[11px] pl-2 pt-0.5">
                                        외 {courses.length - 5}개 과정
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>응답 분포</CardTitle>
              <CardDescription>평점별 응답 비율</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.ratingDistribution.length === 0 ? (
                <ChartEmptyState description="분포 데이터가 없습니다" />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-[280px] w-full sm:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.ratingDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 55 : 70}
                          outerRadius={isMobile ? 90 : 120}
                          paddingAngle={3}
                          cornerRadius={6}
                          label={({ name, percent }) => {
                            return percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '';
                          }}
                          labelLine={false}
                        >
                          {stats.ratingDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={RATING_COLORS[index % RATING_COLORS.length]}
                              stroke="hsl(var(--background))"
                              strokeWidth={3}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: isMobile ? '12px' : '14px',
                          }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => [`${value}명`, '응답']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-6 w-full max-w-3xl px-2">
                    {stats.ratingDistribution.map((bucket, index) => (
                      <div key={bucket.name} className="flex items-center gap-3 p-3 rounded-xl border bg-card/50 shadow-sm">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: RATING_COLORS[index % RATING_COLORS.length] }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-muted-foreground truncate">{bucket.name}</span>
                          <div className="flex items-end gap-1.5">
                            <span className="text-lg font-bold leading-none">{bucket.percentage}%</span>
                            <span className="text-xs text-muted-foreground mb-0.5">({bucket.value}명)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Breakdown */}
        {/* Course Breakdown & Analysis */}
        <TabsContent value="courses" className="space-y-6">
          {stats.courseBreakdown.length === 0 ? (
            <ChartEmptyState description="과정별 데이터가 없습니다" />
          ) : (
            <div className="grid gap-6 md:grid-cols-7">
              {/* Radar Chart Section */}
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    영역별 분석
                  </CardTitle>
                  <CardDescription>
                    {selectedCourse === 'all'
                      ? '전체 과정의 평균 영역별 강점 분석'
                      : `${selectedCourse} 과정의 영역별 분석`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="hsl(var(--muted))" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 10]}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickCount={6}
                        />
                        <Radar
                          name="평균 점수"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid hsl(var(--border))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-[-10px]">
                      <p className="text-sm font-medium text-foreground">
                        종합 평균: {(radarData.length > 0 ? (radarData.reduce((a, b) => a + b.value, 0) / radarData.length) : 0).toFixed(1)}점
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Table Section */}
              <Card className="md:col-span-4 flex flex-col">
                <CardHeader>
                  <CardTitle>과정별 상세 지표</CardTitle>
                  <CardDescription>세부 영역 점수 (10점 만점)</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[30%]">과정명</TableHead>
                          <TableHead className="text-center w-[15%]">강사</TableHead>
                          <TableHead className="text-center w-[15%]">내용</TableHead>
                          <TableHead className="text-center w-[15%]">운영</TableHead>
                          <TableHead className="text-right w-[15%]">총점</TableHead>
                          <TableHead className="text-right w-[10%] opacity-50"><Users className="h-3 w-3 ml-auto" /></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.courseBreakdown.map((course) => (
                          <TableRow key={course.course} className="hover:bg-muted/5">
                            <TableCell className="font-medium text-xs sm:text-sm">{course.course}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${(course.avgInstructor || 0) >= 9.5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''
                                }`}>
                                {course.avgInstructor?.toFixed(1) || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm">{course.avgCourse?.toFixed(1) || '-'}</TableCell>
                            <TableCell className="text-center text-xs sm:text-sm">{course.avgOperation?.toFixed(1) || '-'}</TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {course.avgSatisfaction.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {course.responses}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Question Insights */}
        <TabsContent value="questions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Best Items */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <ThumbsUp className="h-5 w-5" />
                  Best Highlights (강점)
                </CardTitle>
                <CardDescription>수강생들로부터 가장 높은 평가를 받은 Top 5 항목입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.questionInsights.questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ChartEmptyState className="h-16 opacity-20" />
                    <p className="mt-2 text-sm">데이터 없음</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.questionInsights.questions
                      .filter(q => q.average !== null)
                      .sort((a, b) => (b.average || 0) - (a.average || 0))
                      .slice(0, 5)
                      .map((q, idx) => (
                        <div key={idx} className="group">
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-start gap-3">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                {idx + 1}
                              </span>
                              <p className="text-sm font-medium leading-tight group-hover:text-blue-600 transition-colors">
                                {q.questionText}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
                              {q.average?.toFixed(1)}점
                            </span>
                          </div>
                          <div className="pl-8">
                            <Progress value={((q.average || 0) / 10) * 100} className="h-1.5 bg-blue-100 dark:bg-blue-900/20" indicatorClassName="bg-blue-500" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Worst Items */}
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <ThumbsDown className="h-5 w-5" />
                  Needs Attention (개선 필요)
                </CardTitle>
                <CardDescription>상대적으로 낮은 점수를 받아 개선이 필요한 항목입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.questionInsights.questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ChartEmptyState className="h-16 opacity-20" />
                    <p className="mt-2 text-sm">데이터 없음</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.questionInsights.questions
                      .filter(q => q.average !== null)
                      .sort((a, b) => (a.average || 0) - (b.average || 0))
                      .slice(0, 5)
                      .map((q, idx) => (
                        <div key={idx} className="group">
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-start gap-3">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                {idx + 1}
                              </span>
                              <p className="text-sm font-medium leading-tight group-hover:text-amber-600 transition-colors">
                                {q.questionText}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap ml-2">
                              {q.average?.toFixed(1)}점
                            </span>
                          </div>
                          <div className="pl-8">
                            <Progress value={((q.average || 0) / 10) * 100} className="h-1.5 bg-amber-100 dark:bg-amber-900/20" indicatorClassName="bg-amber-500" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Source Surveys Dialog */}
      <Dialog open={showSourceSurveys} onOpenChange={setShowSourceSurveys}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>통계 집계 대상 설문 목록</DialogTitle>
            <CardDescription>
              현재 통계 화면에 반영된 원본 설문 데이터입니다. 목록에 없는 설문은 통계에 포함되지 않았습니다.
            </CardDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0 py-4">
            {sourceSurveysLoading ? (
              <div className="flex justify-center p-8">
                <p>데이터를 불러오는 중...</p>
              </div>
            ) : sourceSurveys.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                집계된 설문 데이터가 없습니다.
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>설문 제목</TableHead>
                      <TableHead>과정</TableHead>
                      <TableHead>회차</TableHead>
                      <TableHead>강사명</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>생성일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceSurveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{survey.title}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {survey.education_year}-{survey.education_round}차
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {survey.course_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {survey.education_year}년 {survey.education_round}차
                        </TableCell>
                        <TableCell>{survey.instructor_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                            {survey.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(survey.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
