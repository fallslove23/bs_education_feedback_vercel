import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Star, Target, Award, AlertTriangle } from 'lucide-react';

interface InstructorInsightCardsProps {
  currentSatisfaction: number;
  previousSatisfaction?: number;
  bestCourse: {
    name: string;
    satisfaction: number;
  };
  improvementArea: {
    name: string;
    satisfaction: number;
  };
  totalResponses: number;
  goalProgress: number;
}

export const InstructorInsightCards: React.FC<InstructorInsightCardsProps> = ({
  currentSatisfaction,
  previousSatisfaction,
  bestCourse,
  improvementArea,
  totalResponses,
  goalProgress
}) => {
  const getTrendIcon = () => {
    if (!previousSatisfaction) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    if (currentSatisfaction > previousSatisfaction) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (currentSatisfaction < previousSatisfaction) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangePercentage = () => {
    if (!previousSatisfaction) return 0;
    return ((currentSatisfaction - previousSatisfaction) / previousSatisfaction) * 100;
  };

  const getSatisfactionColor = (satisfaction: number) => {
    if (satisfaction >= 4.5) return 'text-green-600';
    if (satisfaction >= 4.0) return 'text-blue-600';
    if (satisfaction >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 현재 만족도 & 추이 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            현재 만족도
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${getSatisfactionColor(currentSatisfaction)}`}>
                {currentSatisfaction.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                5점 만점
              </div>
            </div>
            <div className="flex flex-col items-end">
              {getTrendIcon()}
              {previousSatisfaction && (
                <span className={`text-xs ${
                  getChangePercentage() > 0 ? 'text-green-600' : 
                  getChangePercentage() < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {getChangePercentage() > 0 ? '+' : ''}{getChangePercentage().toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최고 성과 과목 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4 text-green-500" />
            최고 성과 과목
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-2">
            <div className="font-medium text-sm truncate">{bestCourse.name}</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {bestCourse.satisfaction.toFixed(1)}점
              </Badge>
              <div className="text-xs text-muted-foreground">만족도</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 개선 영역 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            개선 필요 영역
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-2">
            <div className="font-medium text-sm truncate">{improvementArea.name}</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {improvementArea.satisfaction.toFixed(1)}점
              </Badge>
              <div className="text-xs text-muted-foreground">요개선</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 목표 달성률 */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            목표 달성률
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{goalProgress}%</span>
              <Badge variant={goalProgress >= 80 ? "default" : "secondary"}>
                {goalProgress >= 80 ? "달성" : "진행중"}
              </Badge>
            </div>
            <Progress value={goalProgress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              응답 수: {totalResponses}개
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};