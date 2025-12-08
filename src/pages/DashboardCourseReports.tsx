import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '@/components/layouts';
import CourseReports from './CourseReports';
import LoadingScreen from '@/components/LoadingScreen';
import { PageErrorBoundary } from '@/components/error-boundaries';

const DashboardCourseReports: React.FC = () => {
  const { userRoles, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && userRoles.includes('instructor') && !userRoles.includes('admin') && !userRoles.includes('operator')) {
      // 관리자가 아닌 강사만 결과 분석 페이지로 리디렉션
      navigate('/dashboard/results', { replace: true });
    }
  }, [userRoles, loading, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  // 강사는 이미 리디렉션되었으므로 이 컴포넌트가 렌더링되지 않음
  return (
    <DashboardLayout
      title="과정 결과 보고"
      subtitle="과정별 운영 결과 분석"
      icon={<BarChart3 className="h-5 w-5 text-white" />}
    >
      <PageErrorBoundary pageName="Dashboard Course Reports">
        <CourseReports />
      </PageErrorBoundary>
    </DashboardLayout>
  );
};

export default DashboardCourseReports;
