import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts';
import { Award } from 'lucide-react';
import PersonalDashboard from './PersonalDashboard';

const DashboardMyStats = () => {
  const [searchParams] = useSearchParams();
  const instructorIdParam = searchParams.get('instructorId'); // 개발자/관리자 테스트 및 미리보기 용도

  return (
    <DashboardLayout
      title="나의 만족도 통계"
      subtitle="개인 성과 분석 및 자기 개선 포인트"
      icon={<Award className="h-5 w-5 text-white" />}
    >
      <PersonalDashboard targetInstructorId={instructorIdParam || undefined} />
    </DashboardLayout>
  );
};

export default DashboardMyStats;
