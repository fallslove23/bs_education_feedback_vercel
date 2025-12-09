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
} from 'recharts';
import { Award, BarChart3, TrendingUp, Users, Download, HelpCircle } from 'lucide-react';
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
import { ChartEmptyState } from '@/components/charts';
import { getCombinedRecordMetrics } from '@/utils/surveyStats';

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
                    top: 5,
                    right: isMobile ? 5 : 10,
                    left: isMobile ? -20 : 0,
                    bottom: isMobile ? 5 : 5
                  }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="period"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 60 : 30}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                      width={isMobile ? 40 : 60}
                      domain={[0, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: isMobile ? '12px' : '14px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="hsl(var(--primary))"
                      strokeWidth={isMobile ? 2 : 2}
                      name="만족도"
                      dot={{ fill: 'hsl(var(--primary))', r: isMobile ? 3 : 4 }}
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
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
                    <PieChart>
                      <Pie
                        data={stats.ratingDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 80}
                        label={isMobile ? false : ({ name, percentage }) => `${name} (${percentage}%)`}
                      >
                        {stats.ratingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={RATING_COLORS[index % RATING_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: isMobile ? '12px' : '14px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-5 gap-2">
                    {stats.ratingDistribution.map((bucket, index) => (
                      <div key={bucket.name} className="text-center">
                        <div
                          className="h-2 rounded-full mb-1"
                          style={{ backgroundColor: RATING_COLORS[index] }}
                        />
                        <p className="text-xs font-medium">{bucket.name}</p>
                        <p className="text-xs text-muted-foreground">{bucket.value}개</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Breakdown */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>과정별 통계</CardTitle>
              <CardDescription>각 과정별 만족도 및 응답 현황</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.courseBreakdown.length === 0 ? (
                <ChartEmptyState description="과정별 데이터가 없습니다" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 300 : 350}>
                  <BarChart
                    data={stats.courseBreakdown}
                    margin={{
                      bottom: isMobile ? 80 : 60,
                      left: isMobile ? -10 : 0,
                      right: isMobile ? 10 : 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="courseName"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 9 : 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={isMobile ? 120 : 100}
                      interval={0}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                      width={isMobile ? 40 : 60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: isMobile ? '11px' : '14px',
                      }}
                    />
                    {!isMobile && <Legend />}
                    <Bar
                      dataKey="avgSatisfaction"
                      fill="hsl(var(--primary))"
                      name="평균 만족도"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="responses"
                      fill="hsl(var(--chart-2))"
                      name="응답 수"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Question Insights */}
        <TabsContent value="questions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">강점 (최고 점수)</CardTitle>
                <CardDescription className="text-xs">가장 높은 평가를 받은 항목</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.questionInsights.questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">데이터 없음</p>
                ) : (
                  <div className="space-y-3">
                    {stats.questionInsights.questions
                      .filter(q => q.average !== null)
                      .sort((a, b) => (b.average || 0) - (a.average || 0))
                      .slice(0, 5)
                      .map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium flex-1">{q.questionText}</p>
                            <Badge variant="secondary" className="ml-2">
                              {q.average?.toFixed(1)}점
                            </Badge>
                          </div>
                          <Progress value={((q.average || 0) / 10) * 100} className="h-2" />
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">개선 영역 (낮은 점수)</CardTitle>
                <CardDescription className="text-xs">개선이 필요한 항목</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.questionInsights.questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">데이터 없음</p>
                ) : (
                  <div className="space-y-3">
                    {stats.questionInsights.questions
                      .filter(q => q.average !== null)
                      .sort((a, b) => (a.average || 0) - (b.average || 0))
                      .slice(0, 5)
                      .map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium flex-1">{q.questionText}</p>
                            <Badge variant="outline" className="ml-2">
                              {q.average?.toFixed(1)}점
                            </Badge>
                          </div>
                          <Progress value={((q.average || 0) / 10) * 100} className="h-2" />
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div >
  );
}
