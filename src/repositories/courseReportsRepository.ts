import { supabase } from '@/integrations/supabase/client';
import { normalizeCourseName } from '@/utils/surveyStats';

export interface CourseReportFilters {
  year: number;
  courseName?: string | null;
  round?: number | null;
  instructorId?: string | null;
  includeTestData?: boolean;
}

export interface CourseReportSummary {
  educationYear: number;
  courseName: string | null;
  normalizedCourseName: string | null;
  educationRound: number | null;
  instructorId: string | null;
  availableRounds: number[];
  totalSurveys: number;
  totalResponses: number;
  avgInstructorSatisfaction: number | null;
  avgCourseSatisfaction: number | null;
  avgOperationSatisfaction: number | null;
  instructorCount: number;
}

export interface CourseTrendPoint {
  educationRound: number | null;
  avgInstructorSatisfaction: number | null;
  avgCourseSatisfaction: number | null;
  avgOperationSatisfaction: number | null;
  responseCount: number;
}

export interface CourseInstructorStat {
  instructorId: string | null;
  instructorName: string;
  surveyCount: number;
  responseCount: number;
  avgSatisfaction: number | null;
}

export interface CourseOption {
  normalizedName: string;
  displayName: string;
  rounds: number[];
}

export interface CourseReportStatisticsResponse {
  summary: CourseReportSummary;
  trend: CourseTrendPoint[];
  instructorStats: CourseInstructorStat[];
  textualResponses: string[];
  availableCourses: CourseOption[];
  availableInstructors: { id: string; name: string }[];
}

const safeParseNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/["']/g, '').trim();
    if (cleaned === '') return null;
    const parsed = Number(cleaned);
    return !isNaN(parsed) ? parsed : null;
  }
  return null;
};

export const CourseReportsRepository = {
  async fetchStatistics(filters: CourseReportFilters): Promise<CourseReportStatisticsResponse | null> {
    const normalizedCourseName = normalizeCourseName(filters.courseName ?? null);

    try {
      // Fetch basic survey data
      let surveysQuery = supabase
        .from('surveys')
        .select('*, instructors(name)')
        .eq('education_year', filters.year);

      if (normalizedCourseName) {
        surveysQuery = surveysQuery.eq('course_name', normalizedCourseName);
      }
      if (filters.round) {
        surveysQuery = surveysQuery.eq('education_round', filters.round);
      }
      if (filters.instructorId) {
        surveysQuery = surveysQuery.eq('instructor_id', filters.instructorId);
      }
      if (!filters.includeTestData) {
        surveysQuery = surveysQuery.eq('is_test', false);
      }

      const { data: surveys, error: surveysError } = await surveysQuery;

      if (surveysError) {
        console.error('Failed to fetch surveys', surveysError);
        throw surveysError;
      }

      if (!surveys || surveys.length === 0) {
        // Fetch available courses for empty response
        const { data: availableCoursesData } = await supabase
          .from('surveys')
          .select('course_name, education_round')
          .eq('education_year', filters.year)
          .not('course_name', 'is', null);

        const courseMap = new Map<string, Set<number>>();
        availableCoursesData?.forEach((item) => {
          if (item.course_name) {
            if (!courseMap.has(item.course_name)) {
              courseMap.set(item.course_name, new Set());
            }
            if (item.education_round) {
              courseMap.get(item.course_name)!.add(item.education_round);
            }
          }
        });

        const availableCourses: CourseOption[] = Array.from(courseMap.entries()).map(([name, rounds]) => ({
          normalizedName: name,
          displayName: name,
          rounds: Array.from(rounds).sort((a, b) => a - b),
        }));

        return {
          summary: {
            educationYear: filters.year,
            courseName: filters.courseName ?? null,
            normalizedCourseName,
            educationRound: filters.round ?? null,
            instructorId: filters.instructorId ?? null,
            availableRounds: [],
            totalSurveys: 0,
            totalResponses: 0,
            avgInstructorSatisfaction: null,
            avgCourseSatisfaction: null,
            avgOperationSatisfaction: null,
            instructorCount: 0,
          },
          trend: [],
          instructorStats: [],
          textualResponses: [],
          availableCourses,
          availableInstructors: [],
        };
      }

      const surveyIds = surveys.map(s => s.id);

      // Fetch responses and answers
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .in('survey_id', surveyIds);

      if (responsesError) {
        console.error('Failed to fetch responses', responsesError);
        throw responsesError;
      }

      const responseIds = responses?.map(r => r.id) ?? [];

      const { data: answers, error: answersError } = await supabase
        .from('question_answers')
        .select('*, survey_questions(satisfaction_type, question_type)')
        .in('response_id', responseIds);

      if (answersError) {
        console.error('Failed to fetch answers', answersError);
        throw answersError;
      }

      // Process the data
      const responsesBySurvey = new Map<string, any[]>();
      const answersByResponse = new Map<string, any[]>();

      responses?.forEach(response => {
        if (!responsesBySurvey.has(response.survey_id)) {
          responsesBySurvey.set(response.survey_id, []);
        }
        responsesBySurvey.get(response.survey_id)!.push(response);
      });

      answers?.forEach(answer => {
        if (!answersByResponse.has(answer.response_id)) {
          answersByResponse.set(answer.response_id, []);
        }
        answersByResponse.get(answer.response_id)!.push(answer);
      });

      // Calculate satisfaction scores
      const calculateSatisfaction = (surveyId: string, satisfactionType: string) => {
        const surveyResponses = responsesBySurvey.get(surveyId) ?? [];
        const scores: number[] = [];

        surveyResponses.forEach(response => {
          const responseAnswers = answersByResponse.get(response.id) ?? [];
          responseAnswers.forEach(answer => {
            if (answer.survey_questions?.satisfaction_type === satisfactionType &&
                ['scale', 'rating'].includes(answer.survey_questions?.question_type)) {
              const score = safeParseNumber(answer.answer_value ?? answer.answer_text);
              if (score !== null) {
                scores.push(score);
              }
            }
          });
        });

        return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      };

      // Build summary
      const totalResponses = Array.from(responsesBySurvey.values()).reduce((sum, responses) => sum + responses.length, 0);
      const instructorIds = new Set(surveys.map(s => s.instructor_id).filter(id => id));
      
      const allInstructorScores: number[] = [];
      const allCourseScores: number[] = [];
      const allOperationScores: number[] = [];

      surveys.forEach(survey => {
        const instrScore = calculateSatisfaction(survey.id, 'instructor');
        const courseScore = calculateSatisfaction(survey.id, 'course');  
        const operScore = calculateSatisfaction(survey.id, 'operation');
        
        if (instrScore !== null) allInstructorScores.push(instrScore);
        if (courseScore !== null) allCourseScores.push(courseScore);
        if (operScore !== null) allOperationScores.push(operScore);
      });

      const avgInstructorSatisfaction = allInstructorScores.length > 0 ? 
        allInstructorScores.reduce((sum, score) => sum + score, 0) / allInstructorScores.length : null;
      const avgCourseSatisfaction = allCourseScores.length > 0 ? 
        allCourseScores.reduce((sum, score) => sum + score, 0) / allCourseScores.length : null;
      const avgOperationSatisfaction = allOperationScores.length > 0 ? 
        allOperationScores.reduce((sum, score) => sum + score, 0) / allOperationScores.length : null;

      const availableRounds = [...new Set(surveys.map(s => s.education_round).filter(r => r))].sort();

      const summary: CourseReportSummary = {
        educationYear: filters.year,
        courseName: filters.courseName ?? null,
        normalizedCourseName,
        educationRound: filters.round ?? null,
        instructorId: filters.instructorId ?? null,
        availableRounds,
        totalSurveys: surveys.length,
        totalResponses,
        avgInstructorSatisfaction,
        avgCourseSatisfaction,
        avgOperationSatisfaction,
        instructorCount: instructorIds.size,
      };

      // Build trend data
      const trendMap = new Map<number, { responses: number; instrScores: number[]; courseScores: number[]; operScores: number[] }>();
      
      surveys.forEach(survey => {
        const round = survey.education_round;
        if (!round) return;

        if (!trendMap.has(round)) {
          trendMap.set(round, { responses: 0, instrScores: [], courseScores: [], operScores: [] });
        }

        const trendData = trendMap.get(round)!;
        const surveyResponses = responsesBySurvey.get(survey.id) ?? [];
        trendData.responses += surveyResponses.length;

        const instrScore = calculateSatisfaction(survey.id, 'instructor');
        const courseScore = calculateSatisfaction(survey.id, 'course');
        const operScore = calculateSatisfaction(survey.id, 'operation');

        if (instrScore !== null) trendData.instrScores.push(instrScore);
        if (courseScore !== null) trendData.courseScores.push(courseScore);
        if (operScore !== null) trendData.operScores.push(operScore);
      });

      const trend: CourseTrendPoint[] = Array.from(trendMap.entries())
        .map(([round, data]) => ({
          educationRound: round,
          avgInstructorSatisfaction: data.instrScores.length > 0 ? 
            data.instrScores.reduce((sum, score) => sum + score, 0) / data.instrScores.length : null,
          avgCourseSatisfaction: data.courseScores.length > 0 ? 
            data.courseScores.reduce((sum, score) => sum + score, 0) / data.courseScores.length : null,
          avgOperationSatisfaction: data.operScores.length > 0 ? 
            data.operScores.reduce((sum, score) => sum + score, 0) / data.operScores.length : null,
          responseCount: data.responses,
        }))
        .sort((a, b) => (a.educationRound ?? 0) - (b.educationRound ?? 0));

      // Build instructor stats
      const instructorMap = new Map<string, { name: string; surveyCount: number; responses: number; scores: number[] }>();

      surveys.forEach(survey => {
        if (!survey.instructor_id) return;

        const instructorName = (survey.instructors as any)?.name ?? 'Unknown';
        if (!instructorMap.has(survey.instructor_id)) {
          instructorMap.set(survey.instructor_id, {
            name: instructorName,
            surveyCount: 0,
            responses: 0,
            scores: [],
          });
        }

        const instrData = instructorMap.get(survey.instructor_id)!;
        instrData.surveyCount++;
        
        const surveyResponses = responsesBySurvey.get(survey.id) ?? [];
        instrData.responses += surveyResponses.length;

        const score = calculateSatisfaction(survey.id, 'instructor');
        if (score !== null) {
          instrData.scores.push(score);
        }
      });

      const instructorStats: CourseInstructorStat[] = Array.from(instructorMap.entries())
        .map(([id, data]) => ({
          instructorId: id,
          instructorName: data.name,
          surveyCount: data.surveyCount,
          responseCount: data.responses,
          avgSatisfaction: data.scores.length > 0 ? 
            data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length : null,
        }));

      // Build available courses (for the year)
      const { data: allSurveys } = await supabase
        .from('surveys')
        .select('course_name, education_round')
        .eq('education_year', filters.year)
        .not('course_name', 'is', null);

      const courseMap = new Map<string, Set<number>>();
      allSurveys?.forEach(survey => {
        if (survey.course_name) {
          if (!courseMap.has(survey.course_name)) {
            courseMap.set(survey.course_name, new Set());
          }
          if (survey.education_round) {
            courseMap.get(survey.course_name)!.add(survey.education_round);
          }
        }
      });

      const availableCourses: CourseOption[] = Array.from(courseMap.entries())
        .map(([name, rounds]) => ({
          normalizedName: name,
          displayName: name,
          rounds: Array.from(rounds).sort((a, b) => a - b),
        }));

      // Build available instructors
      const { data: allInstructors } = await supabase
        .from('instructors')
        .select('id, name')
        .in('id', surveys.map(s => s.instructor_id).filter(id => id));

      const availableInstructors = allInstructors?.map(instructor => ({
        id: instructor.id,
        name: instructor.name,
      })) ?? [];

      return {
        summary,
        trend,
        instructorStats,
        textualResponses: [], // We'll implement this later if needed
        availableCourses,
        availableInstructors,
      };

    } catch (error) {
      console.error('Error in CourseReportsRepository.fetchStatistics:', error);
      throw error;
    }
  },
};