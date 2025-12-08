-- Phase 1: Index optimization for high-traffic queries
-- Surveys
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.surveys (status);
CREATE INDEX IF NOT EXISTS idx_surveys_instructor_id ON public.surveys (instructor_id);
CREATE INDEX IF NOT EXISTS idx_surveys_education_year_round ON public.surveys (education_year, education_round);
CREATE INDEX IF NOT EXISTS idx_surveys_course_id ON public.surveys (course_id);
CREATE INDEX IF NOT EXISTS idx_surveys_start_end ON public.surveys (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON public.surveys (created_at DESC);
-- Partial index for auto-send and status-based queries
CREATE INDEX IF NOT EXISTS idx_surveys_end_date_active_partial ON public.surveys (end_date) WHERE status IN ('active','completed');

-- Survey responses
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses (survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON public.survey_responses (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id_submitted_at ON public.survey_responses (survey_id, submitted_at DESC);

-- Question answers
CREATE INDEX IF NOT EXISTS idx_question_answers_response_id ON public.question_answers (response_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_question_id ON public.question_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_answer_value_gin ON public.question_answers USING GIN (answer_value);

-- Survey questions/sections
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON public.survey_questions (survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_satisfaction_type ON public.survey_questions (satisfaction_type);
CREATE INDEX IF NOT EXISTS idx_survey_sections_survey_id ON public.survey_sections (survey_id);

-- Templates
CREATE INDEX IF NOT EXISTS idx_template_questions_template_id ON public.template_questions (template_id);
CREATE INDEX IF NOT EXISTS idx_template_sections_template_id ON public.template_sections (template_id);

-- Email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_survey_id ON public.email_logs (survey_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);

-- Instructors and profiles
CREATE INDEX IF NOT EXISTS idx_instructors_email ON public.instructors (email);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_instructor_id ON public.profiles (instructor_id);

-- User roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role);

-- Instructor courses
CREATE INDEX IF NOT EXISTS idx_instructor_courses_instructor_id ON public.instructor_courses (instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_courses_course_id ON public.instructor_courses (course_id);

-- Presets (per-user data)
CREATE INDEX IF NOT EXISTS idx_user_filter_presets_user_id ON public.user_filter_presets (user_id);
CREATE INDEX IF NOT EXISTS idx_email_recipient_presets_user_id ON public.email_recipient_presets (user_id);
CREATE INDEX IF NOT EXISTS idx_email_recipient_presets_is_default ON public.email_recipient_presets (is_default);