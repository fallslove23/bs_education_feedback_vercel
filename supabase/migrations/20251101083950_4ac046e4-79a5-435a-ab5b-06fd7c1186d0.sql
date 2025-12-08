-- 1) Create/replace role helper functions
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin'::public.user_role);
$$;

-- 2) Admin-bypass policies across key RLS-enabled tables
-- activity_logs
create policy "rls_activity_logs_admin_select" on public.activity_logs for select using (public.is_admin());
create policy "rls_activity_logs_admin_insert" on public.activity_logs for insert with check (public.is_admin());
create policy "rls_activity_logs_admin_update" on public.activity_logs for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_activity_logs_admin_delete" on public.activity_logs for delete using (public.is_admin());

-- anon_sessions
create policy "rls_anon_sessions_admin_select" on public.anon_sessions for select using (public.is_admin());
create policy "rls_anon_sessions_admin_insert" on public.anon_sessions for insert with check (public.is_admin());
create policy "rls_anon_sessions_admin_update" on public.anon_sessions for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_anon_sessions_admin_delete" on public.anon_sessions for delete using (public.is_admin());

-- attendance
create policy "rls_attendance_admin_select" on public.attendance for select using (public.is_admin());
create policy "rls_attendance_admin_insert" on public.attendance for insert with check (public.is_admin());
create policy "rls_attendance_admin_update" on public.attendance for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_attendance_admin_delete" on public.attendance for delete using (public.is_admin());

-- audit_logs
create policy "rls_audit_logs_admin_select" on public.audit_logs for select using (public.is_admin());
create policy "rls_audit_logs_admin_insert" on public.audit_logs for insert with check (public.is_admin());
create policy "rls_audit_logs_admin_update" on public.audit_logs for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_audit_logs_admin_delete" on public.audit_logs for delete using (public.is_admin());

-- course_name_to_session_map
create policy "rls_course_name_to_session_map_admin_select" on public.course_name_to_session_map for select using (public.is_admin());
create policy "rls_course_name_to_session_map_admin_insert" on public.course_name_to_session_map for insert with check (public.is_admin());
create policy "rls_course_name_to_session_map_admin_update" on public.course_name_to_session_map for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_course_name_to_session_map_admin_delete" on public.course_name_to_session_map for delete using (public.is_admin());

-- course_names
create policy "rls_course_names_admin_select" on public.course_names for select using (public.is_admin());
create policy "rls_course_names_admin_insert" on public.course_names for insert with check (public.is_admin());
create policy "rls_course_names_admin_update" on public.course_names for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_course_names_admin_delete" on public.course_names for delete using (public.is_admin());

-- course_reports
create policy "rls_course_reports_admin_select" on public.course_reports for select using (public.is_admin());
create policy "rls_course_reports_admin_insert" on public.course_reports for insert with check (public.is_admin());
create policy "rls_course_reports_admin_update" on public.course_reports for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_course_reports_admin_delete" on public.course_reports for delete using (public.is_admin());

-- course_statistics
create policy "rls_course_statistics_admin_select" on public.course_statistics for select using (public.is_admin());
create policy "rls_course_statistics_admin_insert" on public.course_statistics for insert with check (public.is_admin());
create policy "rls_course_statistics_admin_update" on public.course_statistics for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_course_statistics_admin_delete" on public.course_statistics for delete using (public.is_admin());

-- email_logs
create policy "rls_email_logs_admin_select" on public.email_logs for select using (public.is_admin());
create policy "rls_email_logs_admin_insert" on public.email_logs for insert with check (public.is_admin());
create policy "rls_email_logs_admin_update" on public.email_logs for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_email_logs_admin_delete" on public.email_logs for delete using (public.is_admin());

-- email_recipient_presets
create policy "rls_email_recipient_presets_admin_select" on public.email_recipient_presets for select using (public.is_admin());
create policy "rls_email_recipient_presets_admin_insert" on public.email_recipient_presets for insert with check (public.is_admin());
create policy "rls_email_recipient_presets_admin_update" on public.email_recipient_presets for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_email_recipient_presets_admin_delete" on public.email_recipient_presets for delete using (public.is_admin());

-- instructors
create policy "rls_instructors_admin_select" on public.instructors for select using (public.is_admin());
create policy "rls_instructors_admin_insert" on public.instructors for insert with check (public.is_admin());
create policy "rls_instructors_admin_update" on public.instructors for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_instructors_admin_delete" on public.instructors for delete using (public.is_admin());

-- profiles
create policy "rls_profiles_admin_select" on public.profiles for select using (public.is_admin());
create policy "rls_profiles_admin_insert" on public.profiles for insert with check (public.is_admin());
create policy "rls_profiles_admin_update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_profiles_admin_delete" on public.profiles for delete using (public.is_admin());

-- programs
create policy "rls_programs_admin_select" on public.programs for select using (public.is_admin());
create policy "rls_programs_admin_insert" on public.programs for insert with check (public.is_admin());
create policy "rls_programs_admin_update" on public.programs for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_programs_admin_delete" on public.programs for delete using (public.is_admin());

-- question_answers
create policy "rls_question_answers_admin_select" on public.question_answers for select using (public.is_admin());
create policy "rls_question_answers_admin_insert" on public.question_answers for insert with check (public.is_admin());
create policy "rls_question_answers_admin_update" on public.question_answers for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_question_answers_admin_delete" on public.question_answers for delete using (public.is_admin());

-- short_urls
create policy "rls_short_urls_admin_select" on public.short_urls for select using (public.is_admin());
create policy "rls_short_urls_admin_insert" on public.short_urls for insert with check (public.is_admin());
create policy "rls_short_urls_admin_update" on public.short_urls for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_short_urls_admin_delete" on public.short_urls for delete using (public.is_admin());

-- subjects
create policy "rls_subjects_admin_select" on public.subjects for select using (public.is_admin());
create policy "rls_subjects_admin_insert" on public.subjects for insert with check (public.is_admin());
create policy "rls_subjects_admin_update" on public.subjects for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_subjects_admin_delete" on public.subjects for delete using (public.is_admin());

-- survey_analysis_comments
create policy "rls_survey_analysis_comments_admin_select" on public.survey_analysis_comments for select using (public.is_admin());
create policy "rls_survey_analysis_comments_admin_insert" on public.survey_analysis_comments for insert with check (public.is_admin());
create policy "rls_survey_analysis_comments_admin_update" on public.survey_analysis_comments for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_survey_analysis_comments_admin_delete" on public.survey_analysis_comments for delete using (public.is_admin());

-- survey_completions
create policy "rls_survey_completions_admin_select" on public.survey_completions for select using (public.is_admin());
create policy "rls_survey_completions_admin_insert" on public.survey_completions for insert with check (public.is_admin());
create policy "rls_survey_completions_admin_update" on public.survey_completions for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_survey_completions_admin_delete" on public.survey_completions for delete using (public.is_admin());

-- survey_instructors
create policy "rls_survey_instructors_admin_select" on public.survey_instructors for select using (public.is_admin());
create policy "rls_survey_instructors_admin_insert" on public.survey_instructors for insert with check (public.is_admin());
create policy "rls_survey_instructors_admin_update" on public.survey_instructors for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_survey_instructors_admin_delete" on public.survey_instructors for delete using (public.is_admin());

-- survey_questions (extra safety even if existing admin policy)
create policy "rls_survey_questions_admin_select" on public.survey_questions for select using (public.is_admin());
create policy "rls_survey_questions_admin_insert" on public.survey_questions for insert with check (public.is_admin());
create policy "rls_survey_questions_admin_update" on public.survey_questions for update using (public.is_admin()) with check (public.is_admin());
create policy "rls_survey_questions_admin_delete" on public.survey_questions for delete using (public.is_admin());