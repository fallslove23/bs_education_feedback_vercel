import { supabase } from '@/integrations/supabase/client';
import { CourseStatistic } from '@/utils/excelParser';

export const CourseStatsService = {
    async generateFromSurveys(selectedYear: number): Promise<{ count: number }> {
        // 1. Fetch relevant surveys with responses
        const { data: surveys, error: surveyError } = await supabase
            .from('surveys')
            .select(`
        education_year,
        education_round,
        education_day,
        course_name,
        start_date,
        end_date,
        status,
        expected_participants,
        is_test,
        survey_responses (
          id,
          is_test,
          question_answers (
            answer_value,
            survey_questions (satisfaction_type, question_type)
          )
        )
      `)
            .eq('education_year', selectedYear)
            .in('status', ['completed', 'active', 'public'])
            .or('is_test.is.null,is_test.eq.false');

        if (surveyError) throw surveyError;
        if (!surveys || surveys.length === 0) return { count: 0 };

        // 2. Process Statistics
        const generatedStats = new Map<string, CourseStatistic>();
        const statusLabelMap: Record<string, string> = {
            completed: '완료',
            active: '진행 중',
            public: '진행 중',
        };

        surveys
            ?.filter(survey => !survey.is_test)
            .forEach(survey => {
                const key = `${survey.education_year}-${survey.education_round}-${survey.course_name}`;

                // Skip incomplete data
                if (!survey.course_name) return;

                const validResponses = (survey.survey_responses || []).filter(response => !response.is_test);
                const statusKey = typeof survey.status === 'string' ? survey.status : 'completed';
                const statusLabel = statusLabelMap[statusKey] || '완료';
                const round = Number(survey.education_round) || 1;
                const educationDay = Number(survey.education_day) || null;
                const responseCount = validResponses.length;
                const expectedParticipants = Number(survey.expected_participants) || 0;

                if (!generatedStats.has(key)) {
                    generatedStats.set(key, {
                        year: survey.education_year ?? selectedYear,
                        round,
                        course_name: survey.course_name,
                        course_start_date: survey.start_date ? new Date(survey.start_date).toISOString().split('T')[0] : '',
                        course_end_date: survey.end_date ? new Date(survey.end_date).toISOString().split('T')[0] : '',
                        course_days: educationDay || 1,
                        status: statusLabel,
                        enrolled_count: responseCount || expectedParticipants,
                        cumulative_count: responseCount || expectedParticipants,
                        education_days: educationDay,
                        education_hours: null,
                        total_satisfaction: null,
                        course_satisfaction: null,
                        instructor_satisfaction: null,
                        operation_satisfaction: null,
                    });
                }

                const stat = generatedStats.get(key)!;
                if (educationDay) {
                    stat.course_days = educationDay;
                    stat.education_days = educationDay;
                }
                stat.status = statusLabel;

                // Calculate Scores
                const scores = {
                    instructor: [] as number[],
                    course: [] as number[],
                    operation: [] as number[]
                };

                validResponses.forEach(response => {
                    response.question_answers?.forEach((answer: any) => {
                        if (answer.survey_questions?.question_type === 'scale' && answer.answer_value) {
                            let score = Number(answer.answer_value);
                            // Normalize 5-point scale to 10
                            if (score <= 5 && score > 0) score = score * 2;

                            const type = answer.survey_questions.satisfaction_type as keyof typeof scores;
                            if (type && scores[type]) {
                                scores[type].push(score);
                            }
                        }
                    });
                });

                // Update counts
                if (responseCount > 0) {
                    stat.enrolled_count = responseCount;
                    stat.cumulative_count = Math.max(stat.cumulative_count, responseCount);
                }

                // Helper for average
                const calcAvg = (arr: number[]) => arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

                stat.instructor_satisfaction = calcAvg(scores.instructor);
                stat.course_satisfaction = calcAvg(scores.course);
                stat.operation_satisfaction = calcAvg(scores.operation);

                const validavgs = [stat.instructor_satisfaction, stat.course_satisfaction, stat.operation_satisfaction]
                    .filter((s): s is number => s !== null);

                stat.total_satisfaction = validavgs.length > 0
                    ? Number((validavgs.reduce((a, b) => a + b, 0) / validavgs.length).toFixed(2))
                    : null;
            });

        const statsArray = Array.from(generatedStats.values());

        if (statsArray.length > 0) {
            const { error } = await supabase
                .from('course_statistics')
                .upsert(statsArray, { onConflict: 'year,round,course_name' });

            if (error) throw error;
        }

        return { count: statsArray.length };
    }
};
