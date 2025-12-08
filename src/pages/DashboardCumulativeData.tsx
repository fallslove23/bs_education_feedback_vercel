import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Database } from 'lucide-react';
import CumulativeDataTable from './CumulativeDataTable';

const DashboardCumulativeData = () => {
  return (
    <DashboardLayout
      title="누적 데이터"
      subtitle="전체 설문 응답 데이터 조회 및 분석"
      icon={<Database className="h-5 w-5 text-white" />}
    >
      <CumulativeDataTable />
    </DashboardLayout>
  );
};

export default DashboardCumulativeData;
