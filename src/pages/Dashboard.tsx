import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, FileText, BarChart, TrendingUp, Clock, Activity } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import SurveyManagementV2 from './SurveyManagementV2';
import SurveyResults from './SurveyResults';
import InstructorManagement from './InstructorManagement';
import TemplateManagement from './TemplateManagement';

interface Profile {
  role: string;
  instructor_id: string;
}

interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  completedSurveys: number;
  totalResponses: number;
  totalInstructors: number;
  totalCourses: number;
  recentResponsesCount: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // 강사 로그인 시 결과 분석 탭을 기본으로 설정
  const [activeTab, setActiveTab] = useState(() => {
    // 초기 상태에서는 overview로 시작하고, 프로필 로딩 후 조건부로 변경
    return 'overview';
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    completedSurveys: 0,
    totalResponses: 0,
    totalInstructors: 0,
    totalCourses: 0,
    recentResponsesCount: 0
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, instructor_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        // 프로필이 없는 경우 기본 프로필 생성
        if (!data) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              role: 'user'
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
          } else {
            setProfile(newProfile);
          }
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchDashboardStats();
      // 강사인 경우 결과 분석 탭으로 설정
      if (profile.role === 'instructor' && activeTab === 'overview') {
        setActiveTab('results');
      }
    }
  }, [profile]);

  const fetchDashboardStats = async () => {
    if (!profile) return;
    try {
      const isAdmin = profile?.role === 'admin';
      const isInstructor = profile?.role === 'instructor';

      // 강사인 경우 해당 강사의 설문 ID 목록 조회
      let instructorSurveyIds: string[] = [];
      if (isInstructor && profile.instructor_id) {
        const { data: instructorSurveys } = await supabase
          .from('surveys')
          .select('id')
          .eq('instructor_id', profile.instructor_id);
        instructorSurveyIds = (instructorSurveys || []).map((s: any) => s.id);
      }

      const surveyCountQuery = () => {
        let query = supabase.from('surveys').select('id', { count: 'exact', head: true });
        if (isInstructor && profile.instructor_id) query = query.eq('instructor_id', profile.instructor_id);
        return query;
      };

      const responsesBase = () => {
        let q = supabase.from('survey_responses').select('id', { count: 'exact', head: true });
        if (isInstructor) {
          if (instructorSurveyIds.length > 0) q = q.in('survey_id', instructorSurveyIds);
          else return Promise.resolve({ count: 0 } as any);
        }
        return q;
      };

      const nowIso = new Date().toISOString();
      const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalSurveysRes,
        activeSurveysRes,
        completedStatusRes,
        overdueActiveRes,
        totalResponsesRes,
        instructorsRes,
        coursesRes,
        recentResponsesRes,
      ] = await Promise.all([
        surveyCountQuery(),
        surveyCountQuery().eq('status', 'active'),
        surveyCountQuery().eq('status', 'completed'),
        surveyCountQuery().in('status', ['active', 'public']).lte('end_date', nowIso),
        responsesBase(),
        isAdmin
          ? supabase.from('instructors').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 } as any),
        isAdmin
          ? (supabase as any).from('courses').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 } as any),
        (async () => {
          const base: any = await responsesBase();
          if ('count' in base && typeof base.count === 'number' && !('data' in base)) return base;
          return (base as any).gte('submitted_at', sevenDaysAgoIso);
        })(),
      ]);

      const completedSurveysCount =
        (completedStatusRes.count || 0) + (overdueActiveRes.count || 0);

      setStats({
        totalSurveys: totalSurveysRes.count || 0,
        activeSurveys: activeSurveysRes.count || 0,
        completedSurveys: completedSurveysCount,
        totalResponses: totalResponsesRes.count || 0,
        totalInstructors: instructorsRes.count || 0,
        totalCourses: coursesRes.count || 0,
        recentResponsesCount: recentResponsesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">로딩중...</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const isInstructor = profile?.role === 'instructor';

  // 차트 데이터 준비
  const chartData = [
    {
      name: '전체 설문',
      value: stats.totalSurveys,
      color: '#8884d8'
    },
    {
      name: '진행중',
      value: stats.activeSurveys,
      color: '#82ca9d'
    },
    {
      name: '완료',
      value: stats.completedSurveys,
      color: '#ffc658'
    }
  ];

  const responseData = [
    {
      period: '지난주',
      responses: Math.max(0, stats.totalResponses - stats.recentResponsesCount)
    },
    {
      period: '이번주',
      responses: stats.recentResponsesCount
    }
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />

        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
            <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-neon">
                    <BarChart className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent truncate">관리자 대시보드</h1>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {isAdmin ? '시스템 관리자' : isInstructor ? '강사' : '사용자'} 전용
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-4 shrink-0">
                <span className="text-xs md:text-sm hidden sm:block truncate max-w-32">환영합니다, {user?.email}</span>
                <Button onClick={() => navigate('/')} variant="ghost" size="sm">
                  설문 메인
                </Button>

                <Button variant="ghost" size="sm" className="relative">
                  <Activity className="h-4 w-4" />
                  {stats.recentResponsesCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>

                <Button onClick={signOut} variant="outline" size="sm">로그아웃</Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-4 md:py-6">
            {/* 탭 네비게이션 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200 shadow-sm overflow-x-auto touch-scroll no-scrollbar">
                <TabsList className={`flex sm:grid ${isAdmin ? 'sm:grid-cols-5' : isInstructor ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-1 bg-transparent h-auto p-0 w-max sm:w-full min-w-full`}>
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap"
                  >
                    <BarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    개요
                  </TabsTrigger>

                  <TabsTrigger
                    value="surveys"
                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    설문관리
                  </TabsTrigger>

                  <TabsTrigger
                    value="results"
                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap"
                  >
                    <BarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    결과분석
                  </TabsTrigger>

                  {/* 강사관리 탭 - 관리자와 강사 모두 접근 가능 */}
                  {(isAdmin || isInstructor) && (
                    <TabsTrigger
                      value="instructors"
                      className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      강사관리
                    </TabsTrigger>
                  )}

                  {/* 템플릿관리 탭 - 관리자만 접근 가능 */}
                  {isAdmin && (
                    <TabsTrigger
                      value="templates"
                      className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap"
                    >
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      템플릿관리
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* 개요 탭 */}
              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                {/* 주요 통계 카드들 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">전체 설문조사</CardTitle>
                      <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                        <FileText className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stats.totalSurveys}</div>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? '전체 시스템' : '담당 강의'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">진행중인 설문</CardTitle>
                      <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                        <TrendingUp className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stats.activeSurveys}</div>
                      <p className="text-xs text-muted-foreground">
                        현재 응답 가능
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">총 응답수</CardTitle>
                      <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                        <BarChart className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stats.totalResponses}</div>
                      <p className="text-xs text-muted-foreground">
                        누적 응답 수
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">최근 7일 응답</CardTitle>
                      <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                        <Clock className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stats.recentResponsesCount}</div>
                      <p className="text-xs text-muted-foreground">
                        최근 활동
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 관리자 전용 통계 */}
                {isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">전체 강사수</CardTitle>
                        <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                          <Users className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.totalInstructors}</div>
                        <p className="text-xs text-muted-foreground">
                          등록된 강사
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">전체 강좌수</CardTitle>
                        <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                          <BookOpen className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.totalCourses}</div>
                        <p className="text-xs text-muted-foreground">
                          개설된 강좌
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">완료된 설문</CardTitle>
                        <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center opacity-80">
                          <BarChart className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.completedSurveys}</div>
                        <p className="text-xs text-muted-foreground">
                          설문 완료
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* 차트 섹션 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="text-base sm:text-lg font-semibold">설문 현황</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 sm:h-56 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                        {chartData.map((item, index) => (
                          <div key={item.name} className="flex items-center gap-1.5 sm:gap-2">
                            <div
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: COLORS[index] }}
                            />
                            <span className="text-xs sm:text-sm text-muted-foreground">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="text-base sm:text-lg font-semibold">응답 추이</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 sm:h-56 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={responseData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Bar dataKey="responses" fill="#8884d8" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 설문관리 탭 */}
              <TabsContent value="surveys">
                <SurveyManagementV2 />
              </TabsContent>

              {/* 결과분석 탭 */}
              <TabsContent value="results">
                <SurveyResults />
              </TabsContent>

              {/* 강사관리 탭 - 관리자와 강사 모두 접근 가능 */}
              {(isAdmin || isInstructor) && (
                <TabsContent value="instructors">
                  <InstructorManagement />
                </TabsContent>
              )}

              {/* 템플릿관리 탭 - 관리자만 접근 가능 */}
              {isAdmin && (
                <TabsContent value="templates">
                  <TemplateManagement />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
