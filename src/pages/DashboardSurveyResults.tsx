import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { BarChart3 } from 'lucide-react';
import SurveyResults from './SurveyResults';

const DashboardSurveyResults = () => {
  return (
    <DashboardLayout
      title="결과 분석"
      subtitle="설문 결과 분석 및 통계"
      icon={<BarChart3 className="h-5 w-5 text-white" />}
    >
      <SurveyResults />
    </DashboardLayout>
  );
};

export default DashboardSurveyResults;
