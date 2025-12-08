import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Users } from 'lucide-react';
import UserManagement from './UserManagement';

const DashboardUserManagement = () => {
  return (
    <DashboardLayout
      title="사용자 관리"
      subtitle="사용자 계정 및 권한 관리"
      icon={<Users className="h-5 w-5 text-white" />}
    >
      <UserManagement />
    </DashboardLayout>
  );
};

export default DashboardUserManagement;