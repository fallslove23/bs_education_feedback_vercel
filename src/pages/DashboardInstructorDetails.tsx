import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts';
import LoadingScreen from '@/components/LoadingScreen';
import { PageErrorBoundary } from '@/components/error-boundaries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, BarChart3 } from 'lucide-react';
import { useInstructorStats } from '@/hooks/useInstructorStats';
import SurveyStatsByRound from '@/components/SurveyStatsByRound';

const DashboardInstructorDetails: React.FC = () => {
  const { instructorId } = useParams<{ instructorId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const yearParam = searchParams.get('year');
  const selectedYear = yearParam ? Number(yearParam) : (new Date().getFullYear());

  const { loading, summary, hasData, records } = useInstructorStats({
    instructorId: instructorId,
    includeTestData: true,
    filters: {
      year: 'all', // 모든 연도의 데이터를 표시
      round: 'all',
      course: 'all',
    },
    enabled: Boolean(instructorId),
  });

  if (loading) return <LoadingScreen />;

  const instructorName = records?.[0]?.instructorName || '강사 상세 통계';

  return (
    <DashboardLayout
      title={instructorName}
      subtitle="강사별 상세 통계"
      icon={<User className="h-5 w-5 text-white" />}
      actions={[
        <Button key="back" variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 뒤로가기
        </Button>
      ]}
    >
      <PageErrorBoundary pageName="Dashboard Instructor Details">
        {!hasData ? (
          <Card>
            <CardHeader>
              <CardTitle>설문 데이터가 없습니다</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                이 강사에게 할당된 설문이 없습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                • 설문 관리 페이지에서 설문을 생성하고 강사를 할당해주세요.<br/>
                • 또는 surveys 테이블의 instructor_id가 올바르게 설정되었는지 확인해주세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>설문 수</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-primary">{summary.totalSurveys}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>총 응답 수</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-primary">{summary.totalResponses}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>평균 만족도</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-primary">{summary.avgSatisfaction.toFixed(1)}</CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> 차수별 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SurveyStatsByRound instructorId={instructorId} />
              </CardContent>
            </Card>
          </div>
        )}
      </PageErrorBoundary>
    </DashboardLayout>
  );
};

export default DashboardInstructorDetails;
