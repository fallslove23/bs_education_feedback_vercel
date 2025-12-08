import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Survey {
  id: string;
  title: string;
  education_year: number;
  education_round: number;
  status: string;
  instructor_id: string;
  course_name: string;
  expected_participants?: number;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
  respondent_email: string;
}

interface AvailableCourse {
  year: number;
  round: number;
  course_name: string;
  key: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
  photo_url: string;
}

export const useSurveyResultsData = (profile: any, canViewAll: boolean, isInstructor: boolean, testDataOptions?: any) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([]);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 필터 상태
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  
  const { toast } = useToast();

  // 과정 목록 가져오기 (확장성을 위한 페이지네이션 고려)
  const fetchAvailableCourses = async () => {
    try {
      let query = supabase
        .from('surveys')
        .select('education_year, education_round, course_name')
        .not('course_name', 'is', null)
        .in('status', ['completed', 'active']);

      // 테스트 데이터 필터링
      if (!testDataOptions?.includeTestData) {
        query = query.or('is_test.is.null,is_test.eq.false');
      }

      // 강사인 경우 자신의 설문만 필터링
      if (isInstructor && profile?.instructor_id && !canViewAll) {
        query = query.eq('instructor_id', profile.instructor_id);
      }

      // 최근 3년치만 가져오기 (확장성 고려)
      const currentYear = new Date().getFullYear();
      query = query.gte('education_year', currentYear - 2);

      const { data: surveys, error } = await query;

      if (error) throw error;

      // 중복 제거 및 과정별 그룹화
      const uniqueCourses = Array.from(
        new Map(
          surveys?.map(s => [`${s.education_year}-${s.education_round}-${s.course_name}`, s])
        ).values()
      ).map(s => ({
        year: s.education_year,
        round: s.education_round,
        course_name: s.course_name,
        key: `${s.education_year}-${s.education_round}-${s.course_name}`
      }));

      setAvailableCourses(uniqueCourses.sort((a, b) => 
        b.year - a.year || b.round - a.round
      ));
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "오류",
        description: "과정 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 설문 목록 가져오기 (페이지네이션 적용)
  const fetchSurveys = async (page = 0, pageSize = 50) => {
    try {
      let query = supabase
        .from('surveys')
        .select(`
          *,
          survey_instructors (
            instructors (id, name)
          ),
          instructors (id, name)
        `)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // 테스트 데이터 필터링
      if (!testDataOptions?.includeTestData) {
        query = query.or('is_test.is.null,is_test.eq.false');
      }

      // 강사인 경우 자신의 강의 설문만 조회
      if (isInstructor && profile?.instructor_id && !canViewAll) {
        query = query.eq('instructor_id', profile.instructor_id);
      }

      // 최근 데이터 우선 정렬
      query = query.order('education_year', { ascending: false })
                   .order('education_round', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching surveys:', error);
        setSurveys([]);
      } else {
        setSurveys(data || []);
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  // 모든 응답 가져오기 (메모리 효율성을 위한 청크 처리)
  const fetchAllResponses = async () => {
    try {
      let query = supabase.from('survey_responses').select('*');

      if (!testDataOptions?.includeTestData) {
        query = query.or('is_test.is.null,is_test.eq.false');
      }

      // 강사인 경우 자신의 강의 설문에 대한 응답만 조회
      if (isInstructor && profile?.instructor_id && !canViewAll) {
        let surveyQuery = supabase
          .from('surveys')
          .select('id')
          .eq('instructor_id', profile.instructor_id);
        
        // 테스트 데이터 필터링
        if (!testDataOptions?.includeTestData) {
          surveyQuery = surveyQuery.or('is_test.is.null,is_test.eq.false');
        }
        
        const { data: instructorSurveys } = await surveyQuery;
        
        if (instructorSurveys && instructorSurveys.length > 0) {
          const surveyIds = instructorSurveys.map(s => s.id);
          query = query.in('survey_id', surveyIds);
        }
      }
      
      // 최근 1년 데이터만 가져오기 (확장성을 위한 제한)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      query = query.gte('submitted_at', oneYearAgo.toISOString());
      
      const { data, error } = await query.order('submitted_at', { ascending: false });
      
      if (error) throw error;
      setAllResponses(data || []);
    } catch (error) {
      console.error('Error fetching all responses:', error);
    }
  };

  // 강사 목록 가져오기 - 단순화된 방식
  const fetchAllInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name, email, photo_url')
        .order('name');
        
      if (error) throw error;
      setAllInstructors(data || []);
    } catch (error) {
      console.error('Error fetching all instructors:', error);
      setAllInstructors([]);
    }
  };

  // 필터링된 설문 목록 반환
  const getFilteredSurveys = () => {
    let filtered = surveys;

    if (selectedYear && selectedYear !== '') {
      filtered = filtered.filter(s => s.education_year.toString() === selectedYear);
    }

    if (selectedRound && selectedRound !== '') {
      filtered = filtered.filter(s => s.education_round.toString() === selectedRound);
    }

    if (selectedCourse && selectedCourse !== '') {
      const [year, round, courseName] = selectedCourse.split('-');
      filtered = filtered.filter(s => 
        s.education_year.toString() === year &&
        s.education_round.toString() === round &&
        s.course_name === courseName
      );
    }

    if (canViewAll && selectedInstructor !== 'all') {
      filtered = filtered.filter(s => s.instructor_id === selectedInstructor);
    }

    return filtered;
  };

  // 고유 연도 목록
  const getUniqueYears = () => {
    const years = [...new Set(surveys.map(s => s.education_year))];
    return years.sort((a, b) => b - a);
  };

  // 고유 차수 목록
  const getUniqueRounds = () => {
    let filteredSurveys = surveys;
    if (selectedYear && selectedYear !== '') {
      filteredSurveys = surveys.filter(s => s.education_year.toString() === selectedYear);
    }
    const rounds = [...new Set(filteredSurveys.map(s => s.education_round))];
    return rounds.sort((a, b) => b - a);
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (profile) {
      fetchAvailableCourses();
      fetchAllInstructors();
      fetchSurveys();
      fetchAllResponses();
    }
  }, [profile]);

  return {
    surveys,
    allResponses,
    allInstructors,
    availableCourses,
    loading,
    selectedYear,
    selectedRound,
    selectedCourse,
    selectedInstructor,
    setSelectedYear,
    setSelectedRound,
    setSelectedCourse,
    setSelectedInstructor,
    getFilteredSurveys,
    getUniqueYears,
    getUniqueRounds,
    fetchSurveys,
    fetchAvailableCourses
  };
};