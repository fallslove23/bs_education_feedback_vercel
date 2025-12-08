import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseFilter {
  year: number;
  round: number;
  course_name: string;
  key: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  education_year: number;
  education_round: number;
  status: string;
  instructor_id: string;
  course_id: string;
  course_name: string;
  created_at: string;
}

export const useSurveyFilters = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [availableCourses, setAvailableCourses] = useState<CourseFilter[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [allSurveys, setAllSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAvailableCourses = async () => {
    try {
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('education_year, education_round, course_name')
        .eq('education_year', selectedYear)
        .not('course_name', 'is', null);

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

      setAvailableCourses(uniqueCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "오류",
        description: "과정 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllSurveys(surveys || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast({
        title: "오류",
        description: "설문 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 필터링 로직
  useEffect(() => {
    let filtered = allSurveys;

    if (selectedCourse) {
      const [year, round, courseName] = selectedCourse.split('-');
      filtered = filtered.filter(survey => 
        survey.education_year === parseInt(year) &&
        survey.education_round === parseInt(round) &&
        survey.course_name === courseName
      );
    }

    setFilteredSurveys(filtered);
  }, [allSurveys, selectedCourse]);

  return {
    selectedYear,
    selectedCourse,
    availableCourses,
    filteredSurveys,
    loading,
    setSelectedYear,
    setSelectedCourse,
    fetchAvailableCourses,
    fetchSurveys
  };
};