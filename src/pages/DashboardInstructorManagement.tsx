import React, { useRef } from 'react';
import { DashboardLayout } from '@/components/layouts';
import { UserCheck, Plus, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InstructorManagement from './InstructorManagement';

const DashboardInstructorManagement = () => {
  const instructorManagementRef = useRef<{
    openAddDialog: () => void;
    handleSyncAllInstructors: () => void;
    fetchData: () => void;
  }>(null);

  const handleAddInstructor = () => {
    instructorManagementRef.current?.openAddDialog();
  };

  const handleSyncUsers = () => {
    instructorManagementRef.current?.handleSyncAllInstructors();
  };

  const handleRefresh = () => {
    instructorManagementRef.current?.fetchData();
  };

  const actions = [
    <Button key="refresh" variant="outline" size="sm" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4 mr-2" />
      새로고침
    </Button>,
    <Button key="sync" variant="outline" size="sm" onClick={handleSyncUsers}>
      <UserPlus className="h-4 w-4 mr-2" />
      계정 동기화
    </Button>,
    <Button key="add" size="sm" onClick={handleAddInstructor}>
      <Plus className="h-4 w-4 mr-2" />
      새 강사 추가
    </Button>
  ];

  return (
    <DashboardLayout
      title="강사 관리"
      subtitle="강사 정보 등록 및 관리"
      icon={<UserCheck className="h-5 w-5 text-white" />}
      actions={actions}
    >
      <InstructorManagement 
        ref={instructorManagementRef}
        showActions={false} 
        onAddInstructor={handleAddInstructor}
        onSyncUsers={handleSyncUsers}
        onRefresh={handleRefresh}
      />
    </DashboardLayout>
  );
};

export default DashboardInstructorManagement;
