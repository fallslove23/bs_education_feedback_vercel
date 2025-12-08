import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Calendar, Hash } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  education_year: number;
  education_round: number;
  status: string;
  instructor_id: string;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
}

interface QuestionAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  answer_value: any;
  response_id: string;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  survey_id: string;
}

interface SurveyStatsByRoundProps {
  instructorId?: string;
}

const SurveyStatsByRound = ({ instructorId }: SurveyStatsByRoundProps) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { userRoles, user } = useAuth();
  
  const isAdmin = userRoles.includes('admin');
  const isOperator = userRoles.includes('operator');
  const isDirector = userRoles.includes('director');
  const canViewAll = isAdmin || isOperator || isDirector;
  
  // 테스트 데이터 포함 여부 (개발자만 가능)
  const canIncludeTestData = user?.email === 'sethetrend87@osstem.com';

  useEffect(() => {
    fetchData();
  }, [instructorId]);

  const fetchData = async () => {
    try {
      console.log('SurveyStatsByRound - fetchData called with instructorId:', instructorId);
      console.log('SurveyStatsByRound - canViewAll:', canViewAll);
      
      // 설문 데이터 가져오기
      let surveyQuery = supabase.from('surveys').select('*');
      
      // 테스트 데이터 필터링 (개발자가 아닌 경우)
      if (!canIncludeTestData) {
        surveyQuery = surveyQuery.or('is_test.is.null,is_test.eq.false');
      }
      
      // instructorId가 지정되어 있으면 해당 강사만, 없고 권한이 있으면 전체
      if (instructorId) {
        console.log('SurveyStatsByRound - Filtering by instructor_id:', instructorId);
        surveyQuery = surveyQuery.eq('instructor_id', instructorId);
      } else if (!canViewAll) {
        // 권한이 없으면 빈 결과 반환
        console.log('SurveyStatsByRound - No permissions, returning empty data');
        setSurveys([]);
        setResponses([]);
        setQuestions([]);
        setAnswers([]);
        setLoading(false);
        return;
      }
      
      const { data: surveyData, error: surveyError } = await surveyQuery
        .order('education_year', { ascending: false })
        .order('education_round', { ascending: false });
      
      if (surveyError) {
        console.error('SurveyStatsByRound - Survey error:', surveyError);
        throw surveyError;
      }
      console.log('SurveyStatsByRound - Surveys fetched:', surveyData?.length || 0);
      setSurveys(surveyData || []);

      if (surveyData && surveyData.length > 0) {
        const surveyIds = surveyData.map(s => s.id);
        
        // 응답 데이터 가져오기
        const { data: responseData, error: responseError } = await supabase
          .from('survey_responses')
          .select('*')
          .in('survey_id', surveyIds);
        
        if (responseError) throw responseError;
        setResponses(responseData || []);

        // 질문 데이터 가져오기
        const { data: questionData, error: questionError } = await supabase
          .from('survey_questions')
          .select('*')
          .in('survey_id', surveyIds)
          .in('question_type', ['rating', 'scale']);
        
        if (questionError) throw questionError;
        setQuestions(questionData || []);

        // 답변 데이터 가져오기
        if (responseData && responseData.length > 0) {
          const responseIds = responseData.map(r => r.id);
          const { data: answerData, error: answerError } = await supabase
            .from('question_answers')
            .select('*')
            .in('response_id', responseIds);
          
          if (answerError) throw answerError;
          setAnswers(answerData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueYears = () => {
    const years = [...new Set(surveys.map(s => s.education_year))];
    return years.sort((a, b) => b - a);
  };

  const getFilteredSurveys = () => {
    let filtered = surveys;
    if (selectedYear && selectedYear !== 'all') {
      filtered = filtered.filter(s => s.education_year.toString() === selectedYear);
    }
    return filtered;
  };

  const calculateRoundStats = () => {
    const filteredSurveys = getFilteredSurveys();
    const roundStats = {};

    filteredSurveys.forEach(survey => {
      const roundKey = `${survey.education_year}년 ${survey.education_round}차`;
      
      if (!roundStats[roundKey]) {
        roundStats[roundKey] = {
          round: roundKey,
          surveys: 0,
          responses: 0,
          averageRating: 0,
          totalRatings: 0,
          ratingCount: 0,
          courseTitles: [] as string[]
        };
      }

      roundStats[roundKey].surveys += 1;
      
      // 과정명 추가 (중복 제거)
      if (survey.title && !roundStats[roundKey].courseTitles.includes(survey.title)) {
        roundStats[roundKey].courseTitles.push(survey.title);
      }
      
      // 해당 설문의 응답 수
      const surveyResponses = responses.filter(r => r.survey_id === survey.id);
      roundStats[roundKey].responses += surveyResponses.length;

      // 해당 설문의 평점 계산 (rating 및 scale 타입)
      const surveyQuestions = questions.filter(q => 
        q.survey_id === survey.id && (q.question_type === 'rating' || q.question_type === 'scale')
      );
      
      surveyQuestions.forEach(question => {
        const questionAnswers = answers.filter(a => a.question_id === question.id);
        const ratings = questionAnswers
          .map(a => {
            // answer_text가 숫자가 아닌 경우 answer_value 확인
            let value = parseInt(a.answer_text);
            if (isNaN(value) && a.answer_value !== null) {
              value = parseInt(a.answer_value);
            }
            return value;
          })
          .filter(r => !isNaN(r) && r > 0);
        
        if (ratings.length > 0) {
          // 최대값으로 척도 판단 (5점이면 10점으로 변환)
          const maxRating = Math.max(...ratings);
          const convertedRatings = maxRating <= 5 ? ratings.map(r => r * 2) : ratings;
          
          roundStats[roundKey].totalRatings += convertedRatings.reduce((sum, r) => sum + r, 0);
          roundStats[roundKey].ratingCount += convertedRatings.length;
        }
      });
    });

    // 평균 점수 계산
    Object.keys(roundStats).forEach(key => {
      if (roundStats[key].ratingCount > 0) {
        roundStats[key].averageRating = parseFloat(
          (roundStats[key].totalRatings / roundStats[key].ratingCount).toFixed(1)
        );
      }
    });

    return Object.values(roundStats);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div>로딩중...</div>
      </div>
    );
  }

  if (!canViewAll && !instructorId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        회차별 통계를 보려면 관리자 권한이 필요합니다.
      </div>
    );
  }

  const roundStats = calculateRoundStats();
  const years = getUniqueYears();

  return (
    <div className="space-y-6">
      {/* 연도 선택 */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="연도 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {instructorId && (
          <div className="text-sm text-muted-foreground">
            특정 강사의 회차별 통계
          </div>
        )}
        {!instructorId && canViewAll && (
          <div className="text-sm text-muted-foreground">
            전체 강사 회차별 통계
          </div>
        )}
      </div>

      {/* 회차별 통계 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            회차별 만족도 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roundStats.length > 0 ? (
            <div className="w-full max-w-4xl mx-auto">
              <ResponsiveContainer width="100%" height={350}>
                <RechartsBarChart 
                  data={roundStats}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="round" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    domain={[0, 10]}
                    tickCount={6}
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    label={{ value: '만족도 (점)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="averageRating" 
                    fill="hsl(var(--primary))" 
                    name="평균 만족도"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              표시할 데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 회차별 상세 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {(roundStats as any[]).map((stat: any, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                {stat.round}
              </CardTitle>
              {stat.courseTitles && stat.courseTitles.length > 0 && (
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  {stat.courseTitles.map((title: string, idx: number) => (
                    <div key={idx} className="truncate" title={title}>
                      📚 {title}
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">설문 수:</span>
                <span className="font-medium">{stat.surveys}개</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 응답:</span>
                <span className="font-medium">{stat.responses}건</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">평균 만족도:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-primary">{stat.averageRating}</span>
                  <Badge 
                    variant={stat.averageRating >= 8 ? 'default' : stat.averageRating >= 6 ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {stat.averageRating >= 8 ? '우수' : stat.averageRating >= 6 ? '보통' : '개선필요'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SurveyStatsByRound;
