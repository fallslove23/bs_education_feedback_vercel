import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Award } from 'lucide-react';
import PersonalDashboard from './PersonalDashboard';

const DashboardMyStats = () => {
  return (
    <DashboardLayout
      title="나의 만족도 통계"
      subtitle="개인 성과 분석 및 자기 개선 포인트"
      icon={<Award className="h-5 w-5 text-white" />}
    >
      <PersonalDashboard />
    </DashboardLayout>
  );
};

export default DashboardMyStats;
