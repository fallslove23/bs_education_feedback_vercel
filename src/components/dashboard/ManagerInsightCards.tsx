import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Users, TrendingUp, AlertCircle, Award, BarChart3 } from 'lucide-react';

interface TopPerformer {
  name: string;
  satisfaction: number;
  improvement: number;
}

interface CourseComparison {
  name: string;
  satisfaction: number;
  responseCount: number;
  status: 'excellent' | 'good' | 'needs-improvement';
}

interface ManagerInsightCardsProps {
  topPerformers: TopPerformer[];
  lowPerformingCourses: CourseComparison[];
  totalInstructors: number;
  avgOrganizationSatisfaction: number;
  comparisonWithPrevious: {
    change: number;
    isImproved: boolean;
  };
}

export const ManagerInsightCards: React.FC<ManagerInsightCardsProps> = ({
  topPerformers,
  lowPerformingCourses,
  totalInstructors,
  avgOrganizationSatisfaction,
  comparisonWithPrevious
}) => {
  const getStatusColor = (status: CourseComparison['status']) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-700 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'needs-improvement': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: CourseComparison['status']) => {
    switch (status) {
      case 'excellent': return '우수';
      case 'good': return '양호';
      case 'needs-improvement': return '개선필요';
      default: return '일반';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 조직 전체 만족도 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            조직 전체 만족도
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {avgOrganizationSatisfaction.toFixed(1)}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={comparisonWithPrevious.isImproved ? "default" : "secondary"}>
                {comparisonWithPrevious.isImproved ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {comparisonWithPrevious.change > 0 ? '+' : ''}{comparisonWithPrevious.change.toFixed(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">전회 대비</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 강사 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            우수 강사 Top 3
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-2">
            {topPerformers.slice(0, 3).map((performer, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-5 h-5 p-0 flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <span className="font-medium truncate max-w-[80px]">{performer.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{performer.satisfaction.toFixed(1)}</span>
                  {performer.improvement > 0 && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 개선 필요 과정 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            개선 필요 과정
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-2">
            {lowPerformingCourses.slice(0, 3).map((course, index) => (
              <div key={index} className="space-y-1">
                <div className="text-xs font-medium truncate">{course.name}</div>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getStatusColor(course.status)}`}>
                    {getStatusText(course.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {course.satisfaction.toFixed(1)}점
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 조직 현황 요약 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-green-500" />
            조직 현황 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">총 강사 수</span>
              <span className="font-medium">{totalInstructors}명</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">우수 강사</span>
              <span className="font-medium text-green-600">
                {topPerformers.filter(p => p.satisfaction >= 4.5).length}명
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">개선 필요</span>
              <span className="font-medium text-red-600">
                {lowPerformingCourses.length}과목
              </span>
            </div>
            <Progress 
              value={(topPerformers.filter(p => p.satisfaction >= 4.0).length / totalInstructors) * 100} 
              className="h-2" 
            />
            <div className="text-xs text-muted-foreground text-center">
              목표 달성률
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};