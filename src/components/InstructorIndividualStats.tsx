import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Star, TrendingUp, Calendar, Filter, Eye, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Instructor {
  id: string;
  name: string;
  email: string;
  photo_url: string;
}

interface Survey {
  id: string;
  title: string;
  education_year: number;
  education_round: number;
  status: string;
  instructor_id: string;
}

interface QuestionAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  answer_value: any;
  created_at: string;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  survey_id: string;
  order_index: number;
}

interface Props {
  allInstructors: Instructor[];
  getFilteredSurveys: () => Survey[];
  setSelectedSurvey: (surveyId: string) => void;
  selectedSurvey: string;
  answers: QuestionAnswer[];
  questions: SurveyQuestion[];
}

interface InstructorWithRoles extends Instructor {
  roles?: string[];
}

const InstructorIndividualStats = ({
  allInstructors,
  getFilteredSurveys,
  setSelectedSurvey,
  selectedSurvey,
  answers,
  questions
}: Props) => {
  const { user } = useAuth();
  const [selectedInstructorDetail, setSelectedInstructorDetail] = useState<string>('');
  const [viewType, setViewType] = useState<'monthly' | 'yearly' | 'round' | 'half-yearly' | 'quarterly'>('yearly');
  const [instructorResponses, setInstructorResponses] = useState<any[]>([]);
  const [showSurveyDetails, setShowSurveyDetails] = useState<string>('');
  const [instructorsWithRoles, setInstructorsWithRoles] = useState<InstructorWithRoles[]>([]);

  // 강사별 역할 정보 로드
  useEffect(() => {
    const loadInstructorRoles = async () => {
      try {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, instructor_id')
          .not('instructor_id', 'is', null);

        if (profilesError) throw profilesError;

        const rolesByInstructor: Record<string, string[]> = {};
        
        profiles?.forEach(profile => {
          if (profile.instructor_id) {
            const userRolesList = userRoles?.filter(ur => ur.user_id === profile.id);
            if (userRolesList && userRolesList.length > 0) {
              rolesByInstructor[profile.instructor_id] = userRolesList.map(ur => ur.role);
            }
          }
        });

        const instructorsWithRoles = allInstructors.map(instructor => ({
          ...instructor,
          roles: rolesByInstructor[instructor.id] || []
        }));

        setInstructorsWithRoles(instructorsWithRoles);
      } catch (error) {
        console.error('Error loading instructor roles:', error);
        setInstructorsWithRoles(allInstructors.map(instructor => ({ ...instructor, roles: [] })));
      }
    };

    if (allInstructors.length > 0) {
      loadInstructorRoles();
    }
  }, [allInstructors]);

  // 로그인한 사용자가 강사인 경우 자동 선택
  useEffect(() => {
    const autoSelectInstructor = async () => {
      if (!user || selectedInstructorDetail || instructorsWithRoles.length === 0) return;

      try {
        // 현재 로그인한 사용자의 프로필 조회
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('instructor_id')
          .eq('id', user.id)
          .single();

        if (error || !profile) return;

        // 사용자에게 instructor_id가 있는 경우
        if (profile.instructor_id) {
          // 해당 강사가 목록에 있고 설문이 있는지 확인
          const targetInstructor = instructorsWithRoles.find(inst => inst.id === profile.instructor_id);
          const hasInstructorSurveys = getFilteredSurveys().some(s => s.instructor_id === profile.instructor_id);
          
          if (targetInstructor && hasInstructorSurveys) {
            console.log('Auto-selecting instructor:', targetInstructor.name, targetInstructor.id);
            setSelectedInstructorDetail(profile.instructor_id);
          }
        } else {
          // instructor_id가 없는 경우 설문이 있는 첫 번째 강사 선택
          const firstInstructorWithSurveys = instructorsWithRoles.find(inst => 
            getFilteredSurveys().some(s => s.instructor_id === inst.id)
          );
          
          if (firstInstructorWithSurveys) {
            console.log('Auto-selecting first instructor with surveys:', firstInstructorWithSurveys.name);
            setSelectedInstructorDetail(firstInstructorWithSurveys.id);
          }
        }
      } catch (error) {
        console.error('Error checking instructor profile:', error);
      }
    };

    // 강사 목록과 설문 목록이 모두 로드된 후에 자동 선택 실행
    if (instructorsWithRoles.length > 0 && getFilteredSurveys().length > 0) {
      setTimeout(() => {
        autoSelectInstructor();
      }, 100); // 약간의 딜레이 추가
    }
  }, [user, instructorsWithRoles, getFilteredSurveys, selectedInstructorDetail]);

  // 강사별 누적 평점 계산
  const getInstructorRatings = (instructorId: string) => {
    const instructorSurveys = getFilteredSurveys().filter(s => s.instructor_id === instructorId);
    const allRatings: number[] = [];
    
    instructorSurveys.forEach(survey => {
      const surveyQuestions = questions.filter(q => 
        q.question_type === 'rating' || q.question_type === 'scale'
      );
      surveyQuestions.forEach(question => {
        const questionAnswers = answers.filter(a => a.question_id === question.id);
        questionAnswers.forEach(answer => {
          let rating = parseInt(answer.answer_text);
          if (isNaN(rating) && answer.answer_value !== null) {
            rating = parseInt(answer.answer_value);
          }
          if (!isNaN(rating) && rating > 0) {
            // 5점 척도인 경우 10점으로 변환
            const maxRating = Math.max(...questions.filter(q => q.question_type === 'rating' || q.question_type === 'scale')
              .map(q => q.options?.max || 10));
            const convertedRating = maxRating <= 5 ? rating * 2 : rating;
            allRatings.push(convertedRating);
          }
        });
      });
    });

    const avgRating = allRatings.length > 0 ? 
      (allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length).toFixed(1) : '0.0';
    
    return {
      average: avgRating,
      total: allRatings.length,
      distribution: [1, 2, 3, 4, 5].map(score => 
        allRatings.filter(r => r === score).length
      )
    };
  };

  // 시계열 데이터 생성
  const getTimeSeriesData = (instructorId: string) => {
    const instructorSurveys = getFilteredSurveys().filter(s => s.instructor_id === instructorId);
    
    if (viewType === 'yearly') {
      const yearlyData = instructorSurveys.reduce((acc, survey) => {
        const year = survey.education_year;
        if (!acc[year]) {
          acc[year] = { year, surveys: 0, totalRating: 0, ratingCount: 0 };
        }
        acc[year].surveys++;
        
        // 평점 계산
        const surveyQuestions = questions.filter(q => 
          q.question_type === 'rating' || q.question_type === 'scale'
        );
        surveyQuestions.forEach(question => {
          const questionAnswers = answers.filter(a => a.question_id === question.id);
          questionAnswers.forEach(answer => {
            let rating = parseInt(answer.answer_text);
            if (isNaN(rating) && answer.answer_value !== null) {
              rating = parseInt(answer.answer_value);
            }
            if (!isNaN(rating) && rating > 0) {
              // 5점 척도인 경우 10점으로 변환
              const maxRating = Math.max(...questions.filter(q => q.question_type === 'rating' || q.question_type === 'scale')
                .map(q => q.options?.max || 10));
              const convertedRating = maxRating <= 5 ? rating * 2 : rating;
              acc[year].totalRating += convertedRating;
              acc[year].ratingCount++;
            }
          });
        });
        
        return acc;
      }, {} as any);
      
      return Object.values(yearlyData).map((data: any) => ({
        period: `${data.year}년`,
        surveys: data.surveys,
        avgRating: data.ratingCount > 0 ? (data.totalRating / data.ratingCount).toFixed(1) : 0
      }));
    }
    
    if (viewType === 'half-yearly') {
      const halfYearlyData = instructorSurveys.reduce((acc, survey) => {
        const year = survey.education_year;
        const round = survey.education_round;
        // 1-2차: 상반기, 3-4차: 하반기로 가정
        const half = round <= 2 ? 1 : 2;
        const key = `${year}-${half}`;
        
        if (!acc[key]) {
          acc[key] = { 
            year, 
            half, 
            surveys: 0, 
            totalRating: 0, 
            ratingCount: 0 
          };
        }
        acc[key].surveys++;
        
        // 평점 계산
        const surveyQuestions = questions.filter(q => 
          q.question_type === 'rating' || q.question_type === 'scale'
        );
        surveyQuestions.forEach(question => {
          const questionAnswers = answers.filter(a => a.question_id === question.id);
          questionAnswers.forEach(answer => {
            const rating = parseInt(answer.answer_text);
            if (!isNaN(rating) && rating > 0) {
              acc[key].totalRating += rating;
              acc[key].ratingCount++;
            }
          });
        });
        
        return acc;
      }, {} as any);
      
      return Object.values(halfYearlyData).map((data: any) => ({
        period: `${data.year}년 ${data.half === 1 ? '상반기' : '하반기'}`,
        surveys: data.surveys,
        avgRating: data.ratingCount > 0 ? (data.totalRating / data.ratingCount).toFixed(1) : 0
      }));
    }
    
    if (viewType === 'quarterly') {
      const quarterlyData = instructorSurveys.reduce((acc, survey) => {
        const year = survey.education_year;
        const round = survey.education_round;
        // 1차: 1분기, 2차: 2분기, 3차: 3분기, 4차: 4분기로 가정
        const quarter = Math.min(round, 4);
        const key = `${year}-${quarter}`;
        
        if (!acc[key]) {
          acc[key] = { 
            year, 
            quarter, 
            surveys: 0, 
            totalRating: 0, 
            ratingCount: 0 
          };
        }
        acc[key].surveys++;
        
        // 평점 계산
        const surveyQuestions = questions.filter(q => 
          q.question_type === 'rating' || q.question_type === 'scale'
        );
        surveyQuestions.forEach(question => {
          const questionAnswers = answers.filter(a => a.question_id === question.id);
          questionAnswers.forEach(answer => {
            const rating = parseInt(answer.answer_text);
            if (!isNaN(rating) && rating > 0) {
              acc[key].totalRating += rating;
              acc[key].ratingCount++;
            }
          });
        });
        
        return acc;
      }, {} as any);
      
      return Object.values(quarterlyData).map((data: any) => ({
        period: `${data.year}년 ${data.quarter}분기`,
        surveys: data.surveys,
        avgRating: data.ratingCount > 0 ? (data.totalRating / data.ratingCount).toFixed(1) : 0
      }));
    }
    
    if (viewType === 'round') {
      const roundData = instructorSurveys.reduce((acc, survey) => {
        const key = `${survey.education_year}-${survey.education_round}`;
        if (!acc[key]) {
          acc[key] = { 
            year: survey.education_year, 
            round: survey.education_round, 
            surveys: 0, 
            totalRating: 0, 
            ratingCount: 0 
          };
        }
        acc[key].surveys++;
        
        // 평점 계산
        const surveyQuestions = questions.filter(q => 
          q.question_type === 'rating' || q.question_type === 'scale'
        );
        surveyQuestions.forEach(question => {
          const questionAnswers = answers.filter(a => a.question_id === question.id);
          questionAnswers.forEach(answer => {
            const rating = parseInt(answer.answer_text);
            if (!isNaN(rating) && rating > 0) {
              acc[key].totalRating += rating;
              acc[key].ratingCount++;
            }
          });
        });
        
        return acc;
      }, {} as any);
      
      return Object.values(roundData).map((data: any) => ({
        period: `${data.year}년 ${data.round}차`,
        surveys: data.surveys,
        avgRating: data.ratingCount > 0 ? (data.totalRating / data.ratingCount).toFixed(1) : 0
      }));
    }
    
    return [];
  };

  // 설문별 상세 응답 조회
  const fetchSurveyResponses = async (surveyId: string) => {
    try {
      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId);
      
      if (error) throw error;
      setInstructorResponses(responses || []);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
    }
  };

  useEffect(() => {
    if (showSurveyDetails) {
      fetchSurveyResponses(showSurveyDetails);
    }
  }, [showSurveyDetails]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return (
    <div className="space-y-6">
      {/* 강사 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center relative">
            <Filter className="h-5 w-5" />
            <span className="absolute left-1/2 transform -translate-x-1/2 w-full text-center">강사별 개별 통계</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            강사를 선택하여 상세 통계를 확인하세요
          </p>
        </CardHeader>
        <CardContent>
          <Select value={selectedInstructorDetail} onValueChange={setSelectedInstructorDetail}>
            <SelectTrigger className="w-full touch-friendly">
              <SelectValue placeholder="강사를 선택하세요" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {instructorsWithRoles.length > 0 ? (
                instructorsWithRoles
                  .filter(instructor => getFilteredSurveys().some(s => s.instructor_id === instructor.id))
                  .map(instructor => (
                    <SelectItem key={instructor.id} value={instructor.id} className="break-words">
                      {instructor.name} {instructor.email && `(${instructor.email})`}
                      <div className="text-xs text-muted-foreground ml-2">
                        {instructor.roles?.map(role => 
                          role === 'instructor' ? '강사' : 
                          role === 'admin' ? '관리자' : 
                          role === 'director' ? '조직장' : 
                          role === 'operator' ? '운영' : role
                        ).join(', ')}
                      </div>
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-data" disabled>
                  설문을 진행한 강사가 없습니다
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedInstructorDetail && (
        <>
          {(() => {
            const instructor = instructorsWithRoles.find(i => i.id === selectedInstructorDetail);
            const instructorSurveys = getFilteredSurveys().filter(s => s.instructor_id === selectedInstructorDetail);
            const ratings = getInstructorRatings(selectedInstructorDetail);
            const timeSeriesData = getTimeSeriesData(selectedInstructorDetail);
            
            return (
              <div className="space-y-6">
                {/* 강사 정보 */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {instructor?.photo_url ? (
                          <img 
                            src={instructor.photo_url} 
                            alt={instructor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground text-center">
                            사진<br/>없음
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">{instructor?.name}</h2>
                        {instructor?.email && (
                          <p className="text-muted-foreground">{instructor.email}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 요약 통계 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{instructorSurveys.length}</div>
                      <div className="text-sm text-muted-foreground">총 설문조사</div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{ratings.total}</div>
                      <div className="text-sm text-muted-foreground">총 평가 수</div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                        <Star className="h-5 w-5 fill-current" />
                        {ratings.average}
                      </div>
                      <div className="text-sm text-muted-foreground">누적 평점</div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {instructorSurveys.filter(s => s.status === 'active').length}
                      </div>
                      <div className="text-sm text-muted-foreground">진행중 설문</div>
                    </div>
                  </Card>
                </div>

                {/* 시계열 분석 */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle className="flex items-center relative">
                        <TrendingUp className="h-5 w-5" />
                        <span className="absolute left-1/2 transform -translate-x-1/2 w-full text-center">누적 평점 추이</span>
                      </CardTitle>
                      <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
                        <SelectTrigger className="w-32 touch-friendly">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="yearly">연도별</SelectItem>
                          <SelectItem value="half-yearly">반기별</SelectItem>
                          <SelectItem value="quarterly">분기별</SelectItem>
                          <SelectItem value="round">회차별</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {timeSeriesData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey="avgRating" 
                              stroke="#8884d8" 
                              strokeWidth={2}
                              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        데이터가 충분하지 않습니다
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 평점 분포 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center relative">
                      <BarChart className="h-5 w-5" />
                      <span className="absolute left-1/2 transform -translate-x-1/2 w-full text-center">평점 분포</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={ratings.distribution.map((count, index) => ({
                                name: `${index + 1}점`,
                                value: count,
                                percentage: ratings.total > 0 ? Math.round((count / ratings.total) * 100) : 0
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {ratings.distribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value}개`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {ratings.distribution.map((count, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index] }}
                            />
                            <span className="text-sm w-8">{index + 1}점</span>
                            <div className="flex-1">
                              <Progress 
                                value={ratings.total > 0 ? (count / ratings.total) * 100 : 0} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12">
                              {count}개
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 설문조사 목록 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      진행한 설문조사
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {instructorSurveys.map(survey => (
                        <div key={survey.id} className="border rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium break-words">{survey.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {survey.education_year}년 {survey.education_round}차
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                                {survey.status === 'active' ? '진행중' : 
                                 survey.status === 'completed' ? '완료' : '초안'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="touch-friendly"
                                onClick={() => {
                                  setSelectedSurvey(survey.id);
                                  setShowSurveyDetails(survey.id);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">응답 확인</span>
                              </Button>
                            </div>
                          </div>
                          
                           {showSurveyDetails === survey.id && (
                             <div className="mt-4 pt-4 border-t">
                               {/* 요약 정보 */}
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                 <div className="text-center p-3 bg-muted/30 rounded">
                                   <div className="text-lg font-bold text-primary">
                                     {instructorResponses.length}
                                   </div>
                                   <div className="text-xs text-muted-foreground">총 응답 수</div>
                                 </div>
                                 <div className="text-center p-3 bg-muted/30 rounded">
                                   <div className="text-lg font-bold text-primary">
                                     {instructorResponses.length > 0 ? 
                                      new Date(instructorResponses[0].submitted_at).toLocaleDateString() : '-'}
                                   </div>
                                   <div className="text-xs text-muted-foreground">최근 응답</div>
                                 </div>
                                 <div className="text-center p-3 bg-muted/30 rounded">
                                   <div className="text-lg font-bold text-primary">
                                     {(() => {
                                       const ratingQuestions = questions.filter(q => q.question_type === 'rating');
                                       const surveyRatings: number[] = [];
                                       ratingQuestions.forEach(question => {
                                         const questionAnswers = answers.filter(a => a.question_id === question.id);
                                         questionAnswers.forEach(answer => {
                                           const rating = parseInt(answer.answer_text);
                                           if (!isNaN(rating)) {
                                             surveyRatings.push(rating);
                                           }
                                         });
                                       });
                                       return surveyRatings.length > 0 ? 
                                         (surveyRatings.reduce((sum, r) => sum + r, 0) / surveyRatings.length).toFixed(1) : '-';
                                     })()}
                                   </div>
                                   <div className="text-xs text-muted-foreground">평균 평점</div>
                                 </div>
                               </div>

                               {/* 개별 응답지 */}
                               <div className="space-y-4">
                                 <h5 className="font-medium flex items-center gap-2">
                                   <FileText className="h-4 w-4" />
                                   개별 응답 ({instructorResponses.length}건)
                                 </h5>
                                 
                                 {instructorResponses.length === 0 ? (
                                   <div className="text-center py-8 text-muted-foreground">
                                     아직 응답이 없습니다
                                   </div>
                                 ) : (
                                   <div className="space-y-4 max-h-96 overflow-y-auto">
                                     {instructorResponses.map((response, responseIndex) => {
                                       const responseAnswers = answers.filter(a => 
                                         questions.find(q => q.id === a.question_id && q.survey_id === survey.id)
                                       );
                                       
                                       return (
                                         <Card key={response.id} className="bg-muted/10">
                                           <CardHeader className="pb-3">
                                             <div className="flex justify-between items-start">
                                               <div>
                                                 <CardTitle className="text-sm">응답 #{responseIndex + 1}</CardTitle>
                                                 <p className="text-xs text-muted-foreground">
                                                   {new Date(response.submitted_at).toLocaleString()}
                                                 </p>
                                               </div>
                                               {response.respondent_email && (
                                                 <Badge variant="outline" className="text-xs">
                                                   {response.respondent_email}
                                                 </Badge>
                                               )}
                                             </div>
                                           </CardHeader>
                                           <CardContent className="pt-0">
                                             <div className="space-y-3">
                                               {questions
                                                 .filter(q => q.survey_id === survey.id)
                                                 .sort((a, b) => a.order_index - b.order_index)
                                                 .map(question => {
                                                   const answer = responseAnswers.find(a => a.question_id === question.id);
                                                   
                                                   return (
                                                     <div key={question.id} className="border-l-2 border-muted pl-3">
                                                       <div className="text-sm font-medium mb-1">
                                                         {question.question_text}
                                                       </div>
                                                       <div className="text-sm text-muted-foreground">
                                                         {question.question_type === 'rating' && answer?.answer_text ? (
                                                           <div className="flex items-center gap-2">
                                                             <span className="font-medium text-primary">
                                                               {answer.answer_text}점
                                                             </span>
                                                             {question.options?.labels && (
                                                               <span className="text-xs">
                                                                 ({question.options.labels[parseInt(answer.answer_text) - 1]})
                                                               </span>
                                                             )}
                                                           </div>
                                                         ) : question.question_type === 'scale' && answer?.answer_text ? (
                                                           <span className="font-medium text-primary">
                                                             {answer.answer_text}점 
                                                             {question.options?.min && question.options?.max && 
                                                               <span className="text-xs ml-1">
                                                                 (최소 {question.options.min}, 최대 {question.options.max})
                                                               </span>
                                                             }
                                                           </span>
                                                         ) : answer?.answer_text ? (
                                                           <div className="bg-background p-2 rounded text-sm border">
                                                             {answer.answer_text}
                                                           </div>
                                                         ) : (
                                                           <span className="text-muted-foreground italic">
                                                             응답 없음
                                                           </span>
                                                         )}
                                                       </div>
                                                     </div>
                                                   );
                                                 })}
                                             </div>
                                           </CardContent>
                                         </Card>
                                       );
                                     })}
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </>
      )}

      {!selectedInstructorDetail && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              상세 통계를 확인할 강사를 선택해주세요
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InstructorIndividualStats;