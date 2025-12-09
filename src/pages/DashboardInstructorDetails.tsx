import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';
import PersonalDashboard from './PersonalDashboard';

const DashboardInstructorDetails: React.FC = () => {
  const { instructorId } = useParams<{ instructorId: string }>();
  const navigate = useNavigate();
  const [instructorName, setInstructorName] = useState('강사 상세 통계');

  useEffect(() => {
    if (instructorId) {
      const fetchName = async () => {
        const { data } = await supabase
          .from('instructors')
          .select('name')
          .eq('id', instructorId)
          .single();
        if (data?.name) {
          setInstructorName(`${data.name} 강사 통계`);
        }
      };
      fetchName();
    }
  }, [instructorId]);

  return (
    <DashboardLayout
      title={instructorName}
      subtitle="강사별 상세 통계 및 분석"
      icon={<User className="h-5 w-5 text-white" />}
      actions={[
        <Button key="back" variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 뒤로가기
        </Button>
      ]}
    >
      <PersonalDashboard targetInstructorId={instructorId} />
    </DashboardLayout>
  );
};

export default DashboardInstructorDetails;
