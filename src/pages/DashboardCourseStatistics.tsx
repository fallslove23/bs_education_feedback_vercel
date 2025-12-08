import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { PieChart } from 'lucide-react';
import CourseStatisticsManagement from '@/components/CourseStatisticsManagement';

const DashboardCourseStatistics = () => {
  return (
    <DashboardLayout
      title="과정별 통계 관리"
      subtitle="과정별 통계 데이터 입력 및 관리"
      icon={<PieChart className="h-5 w-5 text-white" />}
    >
      <CourseStatisticsManagement />
    </DashboardLayout>
  );
};

export default DashboardCourseStatistics;