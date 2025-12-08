import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DeveloperTestScreen = () => {
  const { user, userRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [instructors, setInstructors] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');

  // 개발자 계정인지 확인
  const isDeveloper = user?.email === 'sethetrend87@osstem.com';

  // 강사 목록 로드
  useEffect(() => {
    const fetchInstructors = async () => {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name, email')
        .order('name');
      
      if (error) {
        console.error('강사 목록 로드 오류:', error);
        return;
      }
      
      setInstructors(data || []);
    };

    if (isDeveloper) {
      fetchInstructors();
    }
  }, [isDeveloper]);

  if (!isDeveloper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">접근 권한 없음</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              이 페이지는 개발자 전용입니다.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleScreens = [
    {
      role: 'admin',
      name: '관리자',
      description: '시스템 전체 관리',
      defaultRoute: '/dashboard',
      color: 'destructive',
      screens: [
        { name: '대시보드 개요', route: '/dashboard' },
        { name: '설문 관리', route: '/dashboard/survey-management' },
        { name: '결과 분석', route: '/dashboard/results' },
        { name: '사용자 관리', route: '/dashboard/user-management' },
        { name: '강사 관리', route: '/dashboard/instructor-management' },
        { name: '과정 관리', route: '/dashboard/course-management' },
        { name: '과정 통계', route: '/dashboard/course-statistics' },
        { name: '템플릿 관리', route: '/dashboard/template-management' },
        { name: '이메일 로그', route: '/dashboard/email-logs' },
        { name: '시스템 로그', route: '/dashboard/system-logs' },
        { name: '누적 데이터', route: '/dashboard/cumulative-data' },
      ]
    },
    {
      role: 'operator',
      name: '운영자',
      description: '설문 및 과정 운영',
      defaultRoute: '/dashboard',
      color: 'secondary',
      screens: [
        { name: '대시보드 개요', route: '/dashboard' },
        { name: '설문 관리', route: '/dashboard/survey-management' },
        { name: '결과 분석', route: '/dashboard/results' },
        { name: '강사 관리', route: '/dashboard/instructor-management' },
        { name: '과정 관리', route: '/dashboard/course-management' },
        { name: '과정 통계', route: '/dashboard/course-statistics' },
        { name: '템플릿 관리', route: '/dashboard/template-management' },
        { name: '이메일 로그', route: '/dashboard/email-logs' },
        { name: '누적 데이터', route: '/dashboard/cumulative-data' },
      ]
    },
    {
      role: 'director',
      name: '조직장',
      description: '조직 성과 모니터링',
      defaultRoute: '/dashboard',
      color: 'default',
      screens: [
        { name: '대시보드 개요', route: '/dashboard' },
        { name: '결과 분석', route: '/dashboard/results' },
        { name: '과정 리포트', route: '/dashboard/course-reports' },
        { name: '누적 데이터', route: '/dashboard/cumulative-data' },
      ]
    },
    {
      role: 'instructor',
      name: '강사',
      description: '개인 강의 결과 확인',
      defaultRoute: '/dashboard/results',
      color: 'outline',
      screens: [
        { name: '나의 통계', route: '/dashboard/my-stats' },
        { name: '결과 분석', route: '/dashboard/results' },
      ]
    },
  ];

  const handleRoleTest = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              대시보드로
            </Button>
            <div>
              <h1 className="text-3xl font-bold">개발자 테스트 화면</h1>
              <p className="text-muted-foreground">
                각 역할별 화면을 테스트할 수 있습니다
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
          </div>
        </div>

        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle>현재 사용자 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">이메일:</span> {user?.email}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">보유 역할:</span>
                {userRoles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructor Page Preview */}
        <Card>
          <CardHeader>
            <CardTitle>강사 페이지 미리보기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                강사별 페이지를 미리보기하여 오류사항을 확인할 수 있습니다.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">강사 선택:</label>
                  <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="미리보기할 강사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name} ({instructor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      if (!selectedInstructor) {
                        toast({
                          title: '강사 선택 필요',
                          description: '미리보기 전에 강사를 선택해주세요.',
                        });
                        return;
                      }
                      window.open(`/dashboard/my-stats?viewAs=instructor&instructorId=${selectedInstructor}`, '_blank');
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={!selectedInstructor}
                  >
                    <Eye className="h-4 w-4" />
                    강사 페이지 보기 (새 탭)
                  </Button>
                  <Button
                    onClick={() => {
                      if (!selectedInstructor) {
                        toast({
                          title: '강사 선택 필요',
                          description: '미리보기 전에 강사를 선택해주세요.',
                        });
                        return;
                      }
                      navigate(`/dashboard/my-stats?viewAs=instructor&instructorId=${selectedInstructor}`);
                    }}
                    variant="default"
                    className="flex items-center gap-2"
                    disabled={!selectedInstructor}
                  >
                    <Eye className="h-4 w-4" />
                    현재 탭에서 보기
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Test Screens */}
        <Card>
          <CardHeader>
            <CardTitle>역할별 화면 테스트</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {roleScreens.map((roleData) => (
                  <TabsTrigger 
                    key={roleData.role} 
                    value={roleData.role}
                    className="flex items-center gap-2"
                  >
                    <Badge variant={roleData.color as any} className="text-xs">
                      {roleData.name}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {roleScreens.map((roleData) => (
                <TabsContent key={roleData.role} value={roleData.role} className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold text-lg">{roleData.name} 역할</h3>
                    <p className="text-muted-foreground">{roleData.description}</p>
                    <div className="mt-2">
                      <span className="text-sm font-medium">기본 랜딩 페이지:</span>{' '}
                      <Badge variant="outline">{roleData.defaultRoute}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roleData.screens.map((screen) => (
                      <Card key={screen.route} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{screen.name}</h4>
                              <p className="text-sm text-muted-foreground">{screen.route}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleTest(screen.route)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              보기
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeveloperTestScreen;