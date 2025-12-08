import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Database, Eye, EyeOff, AlertTriangle, CheckCircle, Settings, UserCog, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface PagePermission {
  path: string;
  title: string;
  description: string;
  requiredRoles: string[];
  category: 'analytics' | 'management' | 'system';
}

interface PolicyInfo {
  table_name: string;
  policy_name: string;
  command: string;
  roles: string;
  using_expression: string;
  with_check: string;
  is_enabled: boolean;
}

interface UserPermission {
  id: string;
  email: string;
  roles: string[];
  created_at: string;
}

interface RoleOption {
  value: string;
  label: string;
  description: string;
}

const DashboardPolicyManagement = () => {
  const { userRoles, user } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingRoles, setSavingRoles] = useState<string | null>(null);
  const [isPolicyDetailsExpanded, setIsPolicyDetailsExpanded] = useState(false);

  const isAdmin = userRoles.includes('admin');

  // 사용 가능한 역할 옵션
  const roleOptions: RoleOption[] = [
    { value: 'admin', label: '관리자', description: '모든 권한' },
    { value: 'operator', label: '운영자', description: '설문 및 데이터 관리' },
    { value: 'director', label: '원장', description: '결과 조회 및 분석' },
    { value: 'instructor', label: '강사', description: '개인 통계 조회' }
  ];

  // 페이지별 권한 설정
  const pagePermissions: PagePermission[] = [
    {
      path: '/dashboard/results',
      title: '결과 분석',
      description: '설문 결과 분석 및 통계 조회',
      requiredRoles: ['admin', 'operator', 'director', 'instructor'],
      category: 'analytics'
    },
    {
      path: '/dashboard/course-reports',
      title: '과정별 결과 보고',
      description: '과정별 상세 분석 리포트',
      requiredRoles: ['admin', 'operator', 'director'],
      category: 'analytics'
    },
    {
      path: '/dashboard/course-statistics',
      title: '과정 통계',
      description: '과정별 통계 및 트렌드 분석',
      requiredRoles: ['admin', 'operator', 'director'],
      category: 'analytics'
    },
    {
      path: '/dashboard/my-stats',
      title: '나의 만족도 통계',
      description: '강사 개인 만족도 통계',
      requiredRoles: ['instructor'],
      category: 'analytics'
    },
    {
      path: '/dashboard/surveys',
      title: '설문 관리',
      description: '설문 생성, 수정, 삭제 및 관리',
      requiredRoles: ['admin', 'operator'],
      category: 'management'
    },
    {
      path: '/dashboard/instructors',
      title: '강사 관리',
      description: '강사 정보 관리 및 계정 연결',
      requiredRoles: ['admin', 'operator'],
      category: 'management'
    },
    {
      path: '/dashboard/users',
      title: '사용자 관리',
      description: '시스템 사용자 및 역할 관리',
      requiredRoles: ['admin'],
      category: 'management'
    },
    {
      path: '/dashboard/courses',
      title: '과목 관리',
      description: '과목 및 프로그램 관리',
      requiredRoles: ['admin', 'operator'],
      category: 'management'
    },
    {
      path: '/dashboard/templates',
      title: '템플릿 관리',
      description: '설문 템플릿 생성 및 관리',
      requiredRoles: ['admin', 'operator'],
      category: 'management'
    },
    {
      path: '/dashboard/email-logs',
      title: '이메일 로그',
      description: '이메일 발송 기록 조회',
      requiredRoles: ['admin', 'operator', 'director'],
      category: 'system'
    },
    {
      path: '/dashboard/system-logs',
      title: '시스템 로그',
      description: '시스템 활동 로그 조회',
      requiredRoles: ['admin'],
      category: 'system'
    },
    {
      path: '/dashboard/cumulative-data',
      title: '누적 데이터',
      description: '누적 통계 데이터 조회',
      requiredRoles: ['admin', 'operator', 'director'],
      category: 'system'
    },
    {
      path: '/dashboard/policy-management',
      title: '정책 관리',
      description: 'RLS 정책 및 권한 관리',
      requiredRoles: ['admin'],
      category: 'system'
    }
  ];

  // 사용자가 접근 가능한 페이지 필터링
  const getAccessiblePages = () => {
    return pagePermissions.filter(page => 
      page.requiredRoles.some(role => userRoles.includes(role))
    );
  };

  // 사용자가 접근 불가능한 페이지 필터링
  const getInaccessiblePages = () => {
    return pagePermissions.filter(page => 
      !page.requiredRoles.some(role => userRoles.includes(role))
    );
  };

  // RLS 정책 정보 조회 (DB 함수 호출)
  const fetchPolicies = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_rls_policies');
      if (error) throw error;
      setPolicies((data || []) as PolicyInfo[]);
    } catch (e: any) {
      console.error('Failed to load RLS policies', e);
      toast({
        title: '정책 조회 실패',
        description: e.message || '오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 전체 사용자 권한 정보 조회
  const fetchUsers = async () => {
    if (!isAdmin) {
      setUsersLoading(false);
      return;
    }

    try {
      setUsersLoading(true);
      
      // 먼저 모든 프로필을 가져옴
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // 각 사용자의 역할을 별도로 조회
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            email: profile.email || '',
            roles: rolesData?.map(r => r.role) || [],
            created_at: profile.created_at
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (e: any) {
      console.error('Failed to load users', e);
      toast({
        title: '사용자 조회 실패',
        description: e.message || '오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  };

  // 사용자 역할 업데이트
  const updateUserRoles = async (userId: string, newRoles: string[]) => {
    try {
      setSavingRoles(userId);
      
      const { error } = await supabase.rpc('admin_set_user_roles_safe', {
        target_user_id: userId,
        roles: newRoles as ('admin' | 'operator' | 'director' | 'instructor')[]
      });

      if (error) throw error;

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, roles: newRoles } : u
      ));

      toast({
        title: '권한 변경 완료',
        description: '사용자 권한이 성공적으로 업데이트되었습니다.',
      });

      setEditingUserId(null);
    } catch (e: any) {
      console.error('Failed to update user roles', e);
      toast({
        title: '권한 변경 실패',
        description: e.message || '오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setSavingRoles(null);
    }
  };

  // 역할 토글
  const toggleRole = (userId: string, role: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newRoles = user.roles.includes(role)
      ? user.roles.filter(r => r !== role)
      : [...user.roles, role];

    updateUserRoles(userId, newRoles);
  };

  useEffect(() => {
    fetchPolicies();
    fetchUsers();
  }, [isAdmin]);

  // 역할별 색상
  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      operator: 'bg-blue-100 text-blue-800',
      director: 'bg-purple-100 text-purple-800',
      instructor: 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 카테고리별 색상
  const getCategoryColor = (category: string) => {
    const colors = {
      analytics: 'border-l-blue-500',
      management: 'border-l-green-500',
      system: 'border-l-red-500'
    };
    return colors[category as keyof typeof colors] || 'border-l-gray-500';
  };

  const accessiblePages = getAccessiblePages();
  const inaccessiblePages = getInaccessiblePages();

  return (
    <DashboardLayout
      title="정책 관리"
      subtitle="역할별 권한 및 RLS 정책 관리"
      icon={<Shield className="h-5 w-5 text-white" />}
    >
      <div className="space-y-6">
        {/* 현재 사용자 권한 요약 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              내 권한 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-muted-foreground">보유 역할:</span>
              {userRoles.map((role) => (
                <Badge key={role} className={getRoleColor(role)}>
                  {role}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-600">접근 가능:</span>
                <span className="ml-2">{accessiblePages.length}개 페이지</span>
              </div>
              <div>
                <span className="font-medium text-red-600">접근 제한:</span>
                <span className="ml-2">{inaccessiblePages.length}개 페이지</span>
              </div>
              <div>
                <span className="font-medium text-blue-600">전체:</span>
                <span className="ml-2">{pagePermissions.length}개 페이지</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" disabled={!isAdmin}>
              사용자 권한 {!isAdmin && '(관리자 전용)'}
            </TabsTrigger>
            <TabsTrigger value="permissions">페이지 권한</TabsTrigger>
            <TabsTrigger value="policies" disabled={!isAdmin}>
              RLS 정책 {!isAdmin && '(관리자 전용)'}
            </TabsTrigger>
          </TabsList>

          {/* 사용자 권한 관리 탭 (관리자 전용) */}
          <TabsContent value="users" className="space-y-4">
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    전체 사용자 권한 관리
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">사용자 정보를 불러오는 중...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <Alert>
                      <Users className="h-4 w-4" />
                      <AlertDescription>
                        등록된 사용자가 없습니다.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-muted-foreground">총 {users.length}명의 사용자</p>
                        <Button variant="outline" size="sm" onClick={fetchUsers}>새로고침</Button>
                      </div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>이메일</TableHead>
                              <TableHead>역할 관리</TableHead>
                              <TableHead>가입일</TableHead>
                              <TableHead>접근 페이지</TableHead>
                              <TableHead>작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((u) => {
                              const userAccessiblePages = pagePermissions.filter(page => 
                                page.requiredRoles.some(role => u.roles.includes(role))
                              );
                              const isEditing = editingUserId === u.id;
                              const isSaving = savingRoles === u.id;
                              
                              return (
                                <TableRow key={u.id}>
                                  <TableCell className="font-medium">{u.email}</TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        {roleOptions.map((role) => (
                                          <div key={role.value} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`${u.id}-${role.value}`}
                                              checked={u.roles.includes(role.value)}
                                              onCheckedChange={() => toggleRole(u.id, role.value)}
                                              disabled={isSaving}
                                            />
                                            <label
                                              htmlFor={`${u.id}-${role.value}`}
                                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                              {role.label}
                                            </label>
                                            <span className="text-xs text-muted-foreground">
                                              ({role.description})
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {u.roles.length > 0 ? u.roles.map((role) => (
                                          <Badge key={role} className={getRoleColor(role)}>
                                            {roleOptions.find(r => r.value === role)?.label || role}
                                          </Badge>
                                        )) : (
                                          <Badge variant="outline">역할 없음</Badge>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">
                                      {userAccessiblePages.length}개 페이지
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingUserId(null)}
                                            disabled={isSaving}
                                          >
                                            취소
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setEditingUserId(u.id)}
                                          disabled={isSaving}
                                        >
                                          {isSaving ? '저장중...' : '편집'}
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  사용자 권한 관리는 관리자만 접근할 수 있습니다.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* 페이지 권한 현황 탭 */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="grid gap-4">
              {/* 접근 가능한 페이지 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    접근 가능한 페이지 ({accessiblePages.length}개)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {accessiblePages.map((page) => (
                      <div key={page.path} className={`p-4 border-l-4 rounded-lg bg-green-50 ${getCategoryColor(page.category)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{page.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{page.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">필요 역할:</span>
                              {page.requiredRoles.map((role) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {roleOptions.find(r => r.value === role)?.label || role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 접근 제한된 페이지 */}
              {inaccessiblePages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <EyeOff className="h-5 w-5 text-red-600" />
                      접근 제한된 페이지 ({inaccessiblePages.length}개)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {inaccessiblePages.map((page) => (
                        <div key={page.path} className={`p-4 border-l-4 rounded-lg bg-red-50 ${getCategoryColor(page.category)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{page.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{page.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">필요 역할:</span>
                                {page.requiredRoles.map((role) => (
                                  <Badge key={role} variant="outline" className="text-xs">
                                    {roleOptions.find(r => r.value === role)?.label || role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* RLS 정책 탭 (관리자 전용) */}
          <TabsContent value="policies" className="space-y-4">
            {isAdmin ? (
              <>
                {/* 역할별 권한 매트릭스 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      역할별 데이터 접근 권한
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* 권한 매트릭스 */}
                      <div className="grid gap-4">
                        {/* 핵심 테이블별 권한 요약 */}
                        {[
                          {
                            table: 'surveys',
                            title: '설문 관리',
                            description: '설문 생성, 수정, 조회',
                            roles: {
                              admin: ['조회', '생성', '수정', '삭제'],
                              operator: ['조회', '생성', '수정', '삭제'],
                              director: ['조회'],
                              instructor: ['본인 설문 조회'],
                              public: ['공개 설문 조회']
                            }
                          },
                          {
                            table: 'survey_responses',
                            title: '설문 응답',
                            description: '설문 응답 제출 및 조회',
                            roles: {
                              admin: ['모든 응답 조회'],
                              operator: ['모든 응답 조회'],
                              director: ['모든 응답 조회'],
                              instructor: ['본인 설문 응답 조회'],
                              public: ['응답 제출만 가능']
                            }
                          },
                          {
                            table: 'question_answers',
                            title: '질문 답변',
                            description: '설문 질문별 답변 데이터',
                            roles: {
                              admin: ['모든 답변 조회'],
                              operator: ['모든 답변 조회'],
                              director: ['모든 답변 조회'],
                              instructor: ['본인 설문 답변 조회'],
                              public: ['답변 제출만 가능']
                            }
                          },
                          {
                            table: 'instructors',
                            title: '강사 정보',
                            description: '강사 프로필 및 정보 관리',
                            roles: {
                              admin: ['조회', '생성', '수정', '삭제'],
                              operator: ['조회', '생성', '수정', '삭제'],
                              director: ['조회'],
                              instructor: ['본인 정보 조회'],
                              public: ['공개 정보 조회']
                            }
                          },
                          {
                            table: 'profiles',
                            title: '사용자 프로필',
                            description: '사용자 계정 및 역할 정보',
                            roles: {
                              admin: ['모든 프로필 조회'],
                              operator: ['제한적 조회'],
                              director: ['제한적 조회'],
                              instructor: ['본인 프로필만'],
                              public: ['접근 불가']
                            }
                          },
                          {
                            table: 'courses',
                            title: '과목 관리',
                            description: '과목 및 프로그램 정보',
                            roles: {
                              admin: ['조회', '생성', '수정', '삭제'],
                              operator: ['조회', '생성', '수정', '삭제'],
                              director: ['조회'],
                              instructor: ['조회'],
                              public: ['제한적 조회']
                            }
                          }
                        ].map((tableInfo) => (
                          <div key={tableInfo.table} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-sm">{tableInfo.title}</h4>
                                <p className="text-xs text-muted-foreground">{tableInfo.description}</p>
                              </div>
                              <Badge variant="outline" className="text-xs font-mono">{tableInfo.table}</Badge>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-xs">
                              {Object.entries(tableInfo.roles).map(([role, permissions]) => (
                                <div key={role} className="space-y-1">
                                  <div className={`px-2 py-1 rounded text-center font-medium ${getRoleColor(role)}`}>
                                    {role === 'public' ? '비회원' : roleOptions.find(r => r.value === role)?.label || role}
                                  </div>
                                  <div className="space-y-1">
                                    {permissions.map((permission, idx) => (
                                      <div key={idx} className="text-xs bg-gray-50 px-2 py-1 rounded text-center">
                                        {permission}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 주요 보안 정책 요약 */}
                      <div className="border rounded-lg p-4 bg-yellow-50">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-yellow-600" />
                          주요 보안 정책
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <h5 className="font-medium mb-1">데이터 접근 제한</h5>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• 교육생(비회원)은 설문 응답만 가능</li>
                              <li>• 강사는 본인 설문 결과만 조회 가능</li>
                              <li>• 관리자/운영자만 전체 데이터 접근</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium mb-1">권한 상속 구조</h5>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• 관리자 &gt; 운영자 &gt; 원장 &gt; 강사</li>
                              <li>• 상위 역할은 하위 권한 포함</li>
                              <li>• 시스템 관리는 관리자만 가능</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 상세 RLS 정책 목록 */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setIsPolicyDetailsExpanded(!isPolicyDetailsExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        상세 RLS 정책 목록
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {policies.length}개 정책
                        </span>
                        {isPolicyDetailsExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {isPolicyDetailsExpanded && (
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="text-muted-foreground mt-2">정책 정보를 불러오는 중...</p>
                        </div>
                      ) : policies.length === 0 ? (
                        <Alert>
                          <Settings className="h-4 w-4" />
                          <AlertDescription>
                            등록된 RLS 정책이 없거나 조회 결과가 비어 있습니다.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <a
                                href="https://supabase.com/dashboard/project/zxjiugmqfzqluviuwztr/sql/new"
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline text-primary"
                              >
                                SQL 에디터 열기
                              </a>
                              <Button variant="outline" size="sm" onClick={fetchPolicies}>새로고침</Button>
                            </div>
                          </div>
                          <div className="rounded-md border overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[120px]">테이블</TableHead>
                                  <TableHead className="min-w-[200px]">정책명</TableHead>
                                  <TableHead className="min-w-[80px]">명령</TableHead>
                                  <TableHead className="min-w-[100px]">역할</TableHead>
                                  <TableHead className="min-w-[80px]">상태</TableHead>
                                  <TableHead className="min-w-[200px]">USING 조건</TableHead>
                                  <TableHead className="min-w-[200px]">WITH CHECK</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {policies.map((p) => (
                                  <TableRow key={`${p.table_name}-${p.policy_name}-${p.command}`}>
                                    <TableCell className="font-medium font-mono text-sm">{p.table_name}</TableCell>
                                    <TableCell className="text-sm max-w-[200px]">
                                      <div className="truncate" title={p.policy_name}>
                                        {p.policy_name}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="text-xs">{p.command}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                                        {p.roles}
                                      </code>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={p.is_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                                        {p.is_enabled ? '활성' : '비활성'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                      <div 
                                        className="text-xs text-muted-foreground truncate cursor-help"
                                        title={p.using_expression}
                                      >
                                        <code className="bg-gray-50 px-1 py-0.5 rounded">
                                          {p.using_expression}
                                        </code>
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                      <div 
                                        className="text-xs text-muted-foreground truncate cursor-help"
                                        title={p.with_check}
                                      >
                                        <code className="bg-gray-50 px-1 py-0.5 rounded">
                                          {p.with_check}
                                        </code>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      RLS 정책 관리는 관리자 권한이 필요합니다.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPolicyManagement;