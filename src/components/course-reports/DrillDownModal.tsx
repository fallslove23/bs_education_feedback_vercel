import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'instructor' | 'course' | 'operation';
  instructorStats?: any[];
  textualResponses?: string[];
  periodData?: any[];
}

export const DrillDownModal = ({ 
  isOpen, 
  onClose, 
  title, 
  type, 
  instructorStats = [], 
  textualResponses = [],
  periodData = []
}: DrillDownModalProps) => {
  // 타입별로 관련된 코멘트 필터링 - 전체 표시
  const relevantComments = textualResponses;

  // 기간별 데이터 생성 (임시 데이터 - 실제로는 props로 받아야 함)
  const mockPeriodData = [
    { period: '1차', value: 8.2 },
    { period: '2차', value: 8.5 },
    { period: '3차', value: 8.1 },
    { period: '4차', value: 8.7 },
    { period: '5차', value: 8.9 },
    { period: '6차', value: 9.1 }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            {title} 세부 분석
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기간별 누적 트렌드 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                기간별 {title} 누적 트렌드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mockPeriodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" stroke="hsl(var(--foreground))" />
                  <YAxis domain={[0, 10]} stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 강사별 점수 (강사 만족도인 경우) */}
          {type === 'instructor' && instructorStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>강사별 만족도 점수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {instructorStats.map((instructor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{instructor.instructor_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          설문 {instructor.survey_count}개 · 응답 {instructor.response_count}개
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {instructor.avg_satisfaction.toFixed(1)}
                        </span>
                        <Badge variant={instructor.avg_satisfaction >= 8 ? 'default' : 
                                      instructor.avg_satisfaction >= 6 ? 'secondary' : 'destructive'}>
                          {instructor.avg_satisfaction >= 8 ? '우수' : 
                           instructor.avg_satisfaction >= 6 ? '보통' : '개선 필요'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 관련 코멘트 */}
          {relevantComments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  관련 의견 및 코멘트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relevantComments.map((comment, index) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
                      <p className="text-sm leading-relaxed">{comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 데이터가 없는 경우 */}
          {instructorStats.length === 0 && relevantComments.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">표시할 세부 데이터가 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};