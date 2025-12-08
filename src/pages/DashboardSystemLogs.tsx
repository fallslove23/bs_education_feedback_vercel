import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Settings } from 'lucide-react';
import SystemLogs from './SystemLogs';

const DashboardSystemLogs = () => {
  return (
    <DashboardLayout
      title="시스템 로그"
      subtitle="시스템 활동 로그 및 오류 추적"
      icon={<Settings className="h-5 w-5 text-white" />}
    >
      <SystemLogs />
    </DashboardLayout>
  );
};

export default DashboardSystemLogs;
