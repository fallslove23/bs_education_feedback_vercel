import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Shield, Users, Eye, EyeOff, ChevronDown } from 'lucide-react';

interface PagePermission {
  path: string;
  title: string;
  description: string;
  requiredRoles: string[];
  category: 'analytics' | 'management' | 'system';
}

export function RoleAccessIndicator() {
  const { userRoles, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

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

  // 역할별 색상
  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800',
      operator: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
      director: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800',
      instructor: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';
  };

  // 카테고리별 색상
  const getCategoryColor = (category: string) => {
    const colors = {
      analytics: 'border-l-chart-1',
      management: 'border-l-chart-2',
      system: 'border-l-chart-3'
    };
    return colors[category as keyof typeof colors] || 'border-l-border';
  };

  const accessiblePages = getAccessiblePages();
  const inaccessiblePages = getInaccessiblePages();

  if (userRoles.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
        >
          <Shield className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">내 권한</span>
          <div className="flex gap-1">
            {userRoles.slice(0, 2).map((role) => (
              <div
                key={role}
                className={`w-2 h-2 rounded-full ${role === 'admin' ? 'bg-red-500' : role === 'operator' ? 'bg-blue-500' : role === 'director' ? 'bg-purple-500' : 'bg-green-500'}`}
              />
            ))}
            {userRoles.length > 2 && (
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-y-auto" align="end">
        <div className="space-y-4">
          {/* 사용자 정보 */}
          <div className="border-b pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">권한 정보</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {userRoles.map((role) => (
                <Badge key={role} className={getRoleColor(role)}>
                  {role}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 font-medium">접근가능:</span>
                <span>{accessiblePages.length}개</span>
              </div>
              <div className="flex items-center gap-1">
                <EyeOff className="h-3 w-3 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 font-medium">제한:</span>
                <span>{inaccessiblePages.length}개</span>
              </div>
            </div>
          </div>

          {/* 접근 가능한 페이지 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-600 dark:text-green-400">접근 가능한 페이지</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {accessiblePages.map((page) => (
                <div
                  key={page.path}
                  className={`border-l-2 ${getCategoryColor(page.category)} bg-green-50 dark:bg-green-950/30 p-2 rounded-r text-xs`}
                >
                  <div className="font-medium">{page.title}</div>
                  <div className="text-muted-foreground">{page.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 접근 제한된 페이지 */}
          {inaccessiblePages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <EyeOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-600 dark:text-red-400">접근 제한 페이지</span>
              </div>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {inaccessiblePages.slice(0, 3).map((page) => (
                  <div
                    key={page.path}
                    className={`border-l-2 ${getCategoryColor(page.category)} bg-red-50 dark:bg-red-950/30 p-2 rounded-r text-xs opacity-75`}
                  >
                    <div className="font-medium text-gray-600 dark:text-gray-400">{page.title}</div>
                    <div className="flex gap-1 mt-1">
                      {page.requiredRoles.map((role) => (
                        <span key={role} className="text-xs text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300 px-1 py-0.5 rounded">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {inaccessiblePages.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{inaccessiblePages.length - 3}개 더...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}