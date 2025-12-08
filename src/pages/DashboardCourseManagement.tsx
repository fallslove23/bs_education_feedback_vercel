import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { BookOpen } from 'lucide-react';
import CourseManagement from './CourseManagement';

const DashboardCourseManagement = () => {
  return (
    <DashboardLayout
      title="강의 과목 관리"
      subtitle="과목 정보를 관리하고 강사를 배정하세요"
      icon={<BookOpen className="h-5 w-5 text-white" />}
    >
      <CourseManagement />
    </DashboardLayout>
  );
};

export default DashboardCourseManagement;
