
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Star } from 'lucide-react';

interface CourseStatsCardsProps {
  totalSurveys: number;
  totalResponses: number;
  instructorCount: number;
  avgSatisfaction: number;
}

const CourseStatsCards: React.FC<CourseStatsCardsProps> = ({
  totalSurveys,
  totalResponses,
  instructorCount,
  avgSatisfaction
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-primary">총 설문 수</CardTitle>
          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{totalSurveys}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">개의 설문 진행</p>
        </CardContent>
      </Card>
      
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-primary">응답 인원수</CardTitle>
          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{totalResponses}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">명이 응답 참여</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-primary">참여 강사</CardTitle>
          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{instructorCount}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">명의 강사 참여</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-primary">평균 만족도</CardTitle>
          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{avgSatisfaction.toFixed(1)}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">점 / 10점 만점</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseStatsCards;
