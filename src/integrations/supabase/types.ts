export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          content: string
          course_id: string | null
          created_at: string | null
          id: string
          log_date: string
          trainee_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          log_date: string
          trainee_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          log_date?: string
          trainee_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "trainees"
            referencedColumns: ["id"]
          },
        ]
      }
      anon_sessions: {
        Row: {
          anon_id: string
          created_at: string
          id: string
          last_seen_at: string | null
          user_agent_hash: string | null
        }
        Insert: {
          anon_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          anon_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attendance_date: string
          course_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          trainee_id: string | null
        }
        Insert: {
          attendance_date: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          trainee_id?: string | null
        }
        Update: {
          attendance_date?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          trainee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "trainees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_courses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          program_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          program_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          program_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_instructor_courses: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string | null
          instructor_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          instructor_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          instructor_id?: string | null
        }
        Relationships: []
      }
      backup_lectures: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string | null
          position: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          position?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          position?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string | null
          created_at: string | null
          enrollment_date: string | null
          id: string
          status: string | null
          trainee_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          status?: string | null
          trainee_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          status?: string | null
          trainee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "trainees"
            referencedColumns: ["id"]
          },
        ]
      }
      course_name_to_session_map: {
        Row: {
          legacy_course_name: string
          session_id: string | null
        }
        Insert: {
          legacy_course_name: string
          session_id?: string | null
        }
        Update: {
          legacy_course_name?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_name_to_session_map_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_name_to_session_map_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_canonical"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "course_name_to_session_map_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_override"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "course_name_to_session_map_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_subject_filter_options"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      course_names: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_reports: {
        Row: {
          avg_course_satisfaction: number | null
          avg_instructor_satisfaction: number | null
          course_id: string | null
          course_title: string
          created_at: string
          created_by: string | null
          education_round: number
          education_year: number
          id: string
          report_data: Json | null
          total_responses: number | null
          total_surveys: number | null
          updated_at: string
        }
        Insert: {
          avg_course_satisfaction?: number | null
          avg_instructor_satisfaction?: number | null
          course_id?: string | null
          course_title: string
          created_at?: string
          created_by?: string | null
          education_round: number
          education_year: number
          id?: string
          report_data?: Json | null
          total_responses?: number | null
          total_surveys?: number | null
          updated_at?: string
        }
        Update: {
          avg_course_satisfaction?: number | null
          avg_instructor_satisfaction?: number | null
          course_id?: string | null
          course_title?: string
          created_at?: string
          created_by?: string | null
          education_round?: number
          education_year?: number
          id?: string
          report_data?: Json | null
          total_responses?: number | null
          total_surveys?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      course_statistics: {
        Row: {
          course_days: number
          course_end_date: string
          course_name: string | null
          course_satisfaction: number | null
          course_start_date: string
          created_at: string
          created_by: string | null
          cumulative_count: number
          education_days: number | null
          education_hours: number | null
          enrolled_count: number
          id: string
          instructor_satisfaction: number | null
          operation_satisfaction: number | null
          round: number
          status: string
          total_satisfaction: number | null
          updated_at: string
          year: number
        }
        Insert: {
          course_days: number
          course_end_date: string
          course_name?: string | null
          course_satisfaction?: number | null
          course_start_date: string
          created_at?: string
          created_by?: string | null
          cumulative_count?: number
          education_days?: number | null
          education_hours?: number | null
          enrolled_count?: number
          id?: string
          instructor_satisfaction?: number | null
          operation_satisfaction?: number | null
          round: number
          status?: string
          total_satisfaction?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          course_days?: number
          course_end_date?: string
          course_name?: string | null
          course_satisfaction?: number | null
          course_start_date?: string
          created_at?: string
          created_by?: string | null
          cumulative_count?: number
          education_days?: number | null
          education_hours?: number | null
          enrolled_count?: number
          id?: string
          instructor_satisfaction?: number | null
          operation_satisfaction?: number | null
          round?: number
          status?: string
          total_satisfaction?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      cron_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          failed_count: number
          id: string
          last_retry_at: string | null
          max_retries: number | null
          recipients: string[]
          results: Json | null
          retry_count: number | null
          sent_count: number
          status: string
          survey_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          failed_count?: number
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          recipients?: string[]
          results?: Json | null
          retry_count?: number | null
          sent_count?: number
          status: string
          survey_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          failed_count?: number
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          recipients?: string[]
          results?: Json | null
          retry_count?: number | null
          sent_count?: number
          status?: string
          survey_id?: string | null
        }
        Relationships: []
      }
      email_recipient_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          preset_name: string
          recipients: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          preset_name: string
          recipients?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          preset_name?: string
          recipients?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instructor_lectures: {
        Row: {
          assigned_at: string | null
          id: string
          instructor_id: string
          lecture_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          instructor_id: string
          lecture_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          instructor_id?: string
          lecture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_lectures_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_lectures_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "instructor_lectures_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "instructor_lectures_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "instructor_lectures_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "instructor_lectures_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "instructor_lectures_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_lectures_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["lecture_id"]
          },
        ]
      }
      instructors: {
        Row: {
          active: boolean | null
          bio: string | null
          created_at: string
          department: string | null
          email: string | null
          expertise: string[] | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          position: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          expertise?: string[] | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          expertise?: string[] | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lectures: {
        Row: {
          created_at: string
          id: string
          position: number | null
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number | null
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number | null
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "lectures_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "lectures_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_login: boolean | null
          id: string
          instructor_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_login?: boolean | null
          id: string
          instructor_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_login?: boolean | null
          id?: string
          instructor_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          answer_text: string | null
          answer_value: Json | null
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_text?: string | null
          answer_value?: Json | null
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_text?: string | null
          answer_value?: Json | null
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "analytics_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_responses"
            referencedColumns: ["response_id"]
          },
        ]
      }
      session_course_map: {
        Row: {
          course_id: string
          created_at: string
          id: string
          session_keyword: string
          survey_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          session_keyword?: string
          survey_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          session_keyword?: string
          survey_id?: string
        }
        Relationships: []
      }
      session_subjects: {
        Row: {
          session_id: string
          subject_id: string
        }
        Insert: {
          session_id: string
          subject_id: string
        }
        Update: {
          session_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_subjects_session_id_sessions_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_session_id_sessions_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_subjects_session_id_sessions_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_session_id_sessions_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "session_subjects_session_id_sessions_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_fk"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_subject_fk"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_fk"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_fk"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_subjects_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_subjects_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_subjects_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "session_subjects_subject_id_subjects_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          id: string
          program_id: string | null
          title: string | null
          turn: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          title?: string | null
          turn?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          title?: string | null
          turn?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_analysis_course_options"
            referencedColumns: ["program_id"]
          },
        ]
      }
      short_urls: {
        Row: {
          click_count: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          original_url: string
          short_code: string
          survey_id: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          original_url: string
          short_code: string
          survey_id?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          original_url?: string
          short_code?: string
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_urls_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      subject_canonical_map: {
        Row: {
          subject_id: string
          variant_title: string
        }
        Insert: {
          subject_id: string
          variant_title: string
        }
        Update: {
          subject_id?: string
          variant_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_canonical_map_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_canonical_map_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "subject_canonical_map_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "subject_canonical_map_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      survey_analysis_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_analysis_comments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_completions: {
        Row: {
          anon_id: string
          completed_at: string
          id: string
          ip_address: unknown
          survey_id: string
        }
        Insert: {
          anon_id: string
          completed_at?: string
          id?: string
          ip_address?: unknown
          survey_id: string
        }
        Update: {
          anon_id?: string
          completed_at?: string
          id?: string
          ip_address?: unknown
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_survey_completions_anon_id"
            columns: ["anon_id"]
            isOneToOne: false
            referencedRelation: "anon_sessions"
            referencedColumns: ["anon_id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_completions_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_instructors: {
        Row: {
          created_at: string
          id: string
          instructor_id: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructor_id: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructor_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          satisfaction_type: string | null
          scope: string | null
          section_id: string | null
          session_id: string | null
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: string
          satisfaction_type?: string | null
          scope?: string | null
          section_id?: string | null
          session_id?: string | null
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          satisfaction_type?: string | null
          scope?: string | null
          section_id?: string | null
          session_id?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "survey_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_canonical"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_override"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_subject_filter_options"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          attended: boolean | null
          id: string
          is_test: boolean | null
          respondent_email: string | null
          session_id: string | null
          submitted_at: string
          survey_id: string
        }
        Insert: {
          attended?: boolean | null
          id?: string
          is_test?: boolean | null
          respondent_email?: string | null
          session_id?: string | null
          submitted_at?: string
          survey_id: string
        }
        Update: {
          attended?: boolean | null
          id?: string
          is_test?: boolean | null
          respondent_email?: string | null
          session_id?: string | null
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_canonical"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_override"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_subject_filter_options"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          instructor_id: string | null
          session_id: string | null
          session_name: string | null
          session_order: number
          subject_id: string | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          instructor_id?: string | null
          session_id?: string | null
          session_name?: string | null
          session_order?: number
          subject_id?: string | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          instructor_id?: string | null
          session_id?: string | null
          session_name?: string | null
          session_order?: number
          subject_id?: string | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_subjects: {
        Row: {
          created_at: string
          id: string
          instructor_id: string | null
          lecture_id: string | null
          subject_id: string | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructor_id?: string | null
          lecture_id?: string | null
          subject_id?: string | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructor_id?: string | null
          lecture_id?: string | null
          subject_id?: string | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_subjects_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_subjects_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["lecture_id"]
          },
          {
            foreignKeyName: "survey_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_subjects_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_course_evaluation: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_course_evaluation?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_course_evaluation?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_tokens: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          survey_id: string
          used_at: string | null
          used_by_anon_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          survey_id: string
          used_at?: string | null
          used_by_anon_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          survey_id?: string
          used_at?: string | null
          used_by_anon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_survey_tokens_anon_id"
            columns: ["used_by_anon_id"]
            isOneToOne: false
            referencedRelation: "anon_sessions"
            referencedColumns: ["anon_id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_survey_tokens_survey_id"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      surveys: {
        Row: {
          combined_round_end: number | null
          combined_round_start: number | null
          course_id: string | null
          course_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          education_day: number | null
          education_round: number | null
          education_year: number | null
          end_date: string | null
          expected_participants: number | null
          group_number: number | null
          group_type: string | null
          id: string
          instructor_id: string | null
          is_combined: boolean | null
          is_final_survey: boolean
          is_grouped: boolean
          is_test: boolean | null
          operator_contact: string | null
          operator_name: string | null
          program_id: string | null
          round_label: string | null
          session_id: string | null
          start_date: string | null
          status: string
          subject_id: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          combined_round_end?: number | null
          combined_round_start?: number | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          education_day?: number | null
          education_round?: number | null
          education_year?: number | null
          end_date?: string | null
          expected_participants?: number | null
          group_number?: number | null
          group_type?: string | null
          id?: string
          instructor_id?: string | null
          is_combined?: boolean | null
          is_final_survey?: boolean
          is_grouped?: boolean
          is_test?: boolean | null
          operator_contact?: string | null
          operator_name?: string | null
          program_id?: string | null
          round_label?: string | null
          session_id?: string | null
          start_date?: string | null
          status?: string
          subject_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          combined_round_end?: number | null
          combined_round_start?: number | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          education_day?: number | null
          education_round?: number | null
          education_year?: number | null
          end_date?: string | null
          expected_participants?: number | null
          group_number?: number | null
          group_type?: string | null
          id?: string
          instructor_id?: string | null
          is_combined?: boolean | null
          is_final_survey?: boolean
          is_grouped?: boolean
          is_test?: boolean | null
          operator_contact?: string | null
          operator_name?: string | null
          program_id?: string | null
          round_label?: string | null
          session_id?: string | null
          start_date?: string | null
          status?: string
          subject_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_user"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_analysis_course_options"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          satisfaction_type: string | null
          section_id: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: string
          satisfaction_type?: string | null
          section_id?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          satisfaction_type?: string | null
          section_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainees: {
        Row: {
          company_id: string
          created_at: string | null
          department: string | null
          email: string | null
          hq: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          remark: string | null
          resign: boolean | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          department?: string | null
          email?: string | null
          hq?: string | null
          id?: string
          name: string
          phone?: string | null
          position?: string | null
          remark?: string | null
          resign?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          department?: string | null
          email?: string | null
          hq?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          remark?: string | null
          resign?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_filter_presets: {
        Row: {
          created_at: string
          filter_data: Json
          filter_type: string
          id: string
          is_default: boolean
          preset_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_data?: Json
          filter_type: string
          id?: string
          is_default?: boolean
          preset_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_data?: Json
          filter_type?: string
          id?: string
          is_default?: boolean
          preset_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_surveys_v: {
        Row: {
          course_id: string | null
          course_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          education_day: number | null
          education_round: number | null
          education_year: number | null
          end_date: string | null
          expected_participants: number | null
          id: string | null
          instructor_id: string | null
          start_date: string | null
          status: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          education_day?: number | null
          education_round?: number | null
          education_year?: number | null
          end_date?: string | null
          expected_participants?: number | null
          id?: string | null
          instructor_id?: string | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          education_day?: number | null
          education_round?: number | null
          education_year?: number | null
          end_date?: string | null
          expected_participants?: number | null
          id?: string | null
          instructor_id?: string | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_user"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_question_answers: {
        Row: {
          answer_text: string | null
          answer_value: Json | null
          created_at: string | null
          id: string | null
          question_id: string | null
          response_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "analytics_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_responses"
            referencedColumns: ["response_id"]
          },
        ]
      }
      analytics_responses: {
        Row: {
          attended: boolean | null
          id: string | null
          is_test: boolean | null
          respondent_email: string | null
          session_id: string | null
          submitted_at: string | null
          survey_id: string | null
        }
        Insert: {
          attended?: boolean | null
          id?: string | null
          is_test?: boolean | null
          respondent_email?: string | null
          session_id?: string | null
          submitted_at?: string | null
          survey_id?: string | null
        }
        Update: {
          attended?: boolean | null
          id?: string | null
          is_test?: boolean | null
          respondent_email?: string | null
          session_id?: string | null
          submitted_at?: string | null
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_canonical"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_override"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_subject_filter_options"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      analytics_surveys: {
        Row: {
          combined_round_end: number | null
          combined_round_start: number | null
          course_id: string | null
          course_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          education_day: number | null
          education_round: number | null
          education_year: number | null
          end_date: string | null
          expected_participants: number | null
          id: string | null
          instructor_id: string | null
          is_combined: boolean | null
          is_test: boolean | null
          round_label: string | null
          start_date: string | null
          status: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          combined_round_end?: number | null
          combined_round_start?: number | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          education_day?: number | null
          education_round?: number | null
          education_year?: number | null
          end_date?: string | null
          expected_participants?: number | null
          id?: string | null
          instructor_id?: string | null
          is_combined?: boolean | null
          is_test?: boolean | null
          round_label?: string | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          combined_round_end?: number | null
          combined_round_start?: number | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          education_day?: number | null
          education_round?: number | null
          education_year?: number | null
          end_date?: string | null
          expected_participants?: number | null
          id?: string | null
          instructor_id?: string | null
          is_combined?: boolean | null
          is_test?: boolean | null
          round_label?: string | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_user"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          id: string | null
          program_id: string | null
          title: string | null
          turn: number | null
          year: number | null
        }
        Relationships: []
      }
      instructor_survey_stats: {
        Row: {
          active_survey_count: number | null
          all_test_data: boolean | null
          avg_course_satisfaction: number | null
          avg_instructor_satisfaction: number | null
          avg_operation_satisfaction: number | null
          avg_overall_satisfaction: number | null
          course_name: string | null
          education_round: number | null
          education_year: number | null
          has_test_data: boolean | null
          instructor_id: string | null
          instructor_name: string | null
          last_response_at: string | null
          question_stats: Json | null
          rating_distribution: Json | null
          response_count: number | null
          survey_count: number | null
          survey_ids: string[] | null
          test_active_survey_count: number | null
          test_avg_course_satisfaction: number | null
          test_avg_instructor_satisfaction: number | null
          test_avg_operation_satisfaction: number | null
          test_avg_overall_satisfaction: number | null
          test_question_stats: Json | null
          test_rating_distribution: Json | null
          test_response_count: number | null
          test_survey_count: number | null
          test_text_response_count: number | null
          test_text_responses: Json | null
          text_response_count: number | null
          text_responses: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      mv_course_satisfaction: {
        Row: {
          avg_course_satisfaction: number | null
          course_id: string | null
          education_round: number | null
          education_year: number | null
          survey_count: number | null
          total_responses: number | null
        }
        Relationships: []
      }
      mv_instructor_satisfaction: {
        Row: {
          avg_instructor_satisfaction: number | null
          education_round: number | null
          education_year: number | null
          instructor_id: string | null
          survey_count: number | null
          total_responses: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      mv_recent_activity: {
        Row: {
          activity_date: string | null
          activity_type: string | null
          description: string | null
          record_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      mv_survey_stats: {
        Row: {
          education_round: number | null
          education_year: number | null
          end_date: string | null
          expected_participants: number | null
          instructor_id: string | null
          response_count: number | null
          response_rate: number | null
          start_date: string | null
          status: string | null
          survey_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      program_sessions_v1: {
        Row: {
          created_at: string | null
          program: string | null
          session_id: string | null
          session_title: string | null
          turn: number | null
          year: number | null
        }
        Relationships: []
      }
      public_survey_aggregates: {
        Row: {
          avg_course_satis: number | null
          avg_instructor_satis: number | null
          avg_operation_satis: number | null
          avg_overall_satis: number | null
          course_name: string | null
          education_round: number | null
          education_year: number | null
          expected_participants: number | null
          instructor_id: string | null
          instructor_name: string | null
          last_response_at: string | null
          program_name: string | null
          question_count: number | null
          responses_count: number | null
          status: string | null
          survey_id: string | null
          title: string | null
        }
        Relationships: []
      }
      survey_aggregates: {
        Row: {
          avg_course_satisfaction: number | null
          avg_instructor_satisfaction: number | null
          avg_operation_satisfaction: number | null
          avg_overall_satisfaction: number | null
          course_name: string | null
          education_round: number | null
          education_year: number | null
          expected_participants: number | null
          instructor_id: string | null
          instructor_name: string | null
          is_test: boolean | null
          last_response_at: string | null
          question_count: number | null
          response_count: number | null
          status: string | null
          survey_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      survey_available_years_v1: {
        Row: {
          education_year: number | null
        }
        Relationships: []
      }
      survey_cumulative_stats: {
        Row: {
          avg_course_satisfaction_real: number | null
          avg_course_satisfaction_test: number | null
          avg_course_satisfaction_total: number | null
          avg_instructor_satisfaction_real: number | null
          avg_instructor_satisfaction_test: number | null
          avg_instructor_satisfaction_total: number | null
          avg_operation_satisfaction_real: number | null
          avg_operation_satisfaction_test: number | null
          avg_operation_satisfaction_total: number | null
          avg_satisfaction_real: number | null
          avg_satisfaction_test: number | null
          avg_satisfaction_total: number | null
          course_name: string | null
          created_at: string | null
          education_round: number | null
          education_year: number | null
          expected_participants: number | null
          instructor_count: number | null
          instructor_names: string[] | null
          instructor_names_text: string | null
          last_response_at: string | null
          real_response_count: number | null
          status: string | null
          survey_id: string | null
          survey_is_test: boolean | null
          test_response_count: number | null
          title: string | null
          total_response_count: number | null
          weighted_satisfaction_real: number | null
          weighted_satisfaction_test: number | null
          weighted_satisfaction_total: number | null
        }
        Relationships: []
      }
      surveys_list_v1: {
        Row: {
          course_name: string | null
          created_at: string | null
          created_by: string | null
          creator_email: string | null
          description: string | null
          education_day: number | null
          education_round: number | null
          education_year: number | null
          end_date: string | null
          expected_participants: number | null
          group_number: number | null
          group_type: string | null
          id: string | null
          instructor_id: string | null
          instructor_name: string | null
          is_grouped: boolean | null
          is_test: boolean | null
          program_id: string | null
          program_name: string | null
          round_label: string | null
          session_id: string | null
          session_title: string | null
          start_date: string | null
          status: string | null
          subject_id: string | null
          subject_title: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_user"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_analysis_course_options"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_tree"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "surveys_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_options"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys_list_v2: {
        Row: {
          course_name: string | null
          created_at: string | null
          description: string | null
          education_round: number | null
          education_year: number | null
          end_date: string | null
          expected_participants: number | null
          id: string | null
          instructor_id: string | null
          instructor_name: string | null
          response_count: number | null
          start_date: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "surveys_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      v_analysis_course_options: {
        Row: {
          program_id: string | null
          program_name: string | null
          session_count: number | null
          survey_count: number | null
          year: number | null
        }
        Relationships: []
      }
      v_analysis_course_options_v2: {
        Row: {
          course_key: string | null
          label: string | null
          session_count: number | null
          survey_count: number | null
          turn: number | null
          value: string | null
          year: number | null
        }
        Relationships: []
      }
      v_analysis_course_options_v3: {
        Row: {
          max_turn: number | null
          min_turn: number | null
          program_id: string | null
          program_name: string | null
          session_count: number | null
          survey_count: number | null
          year: number | null
        }
        Relationships: []
      }
      v_course_report_min: {
        Row: {
          course_id: string | null
          program: string | null
          response_cnt: number | null
          survey_cnt: number | null
          turn: number | null
          year: number | null
        }
        Relationships: []
      }
      v_current_user: {
        Row: {
          instructor_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          instructor_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          instructor_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_curriculum_tree: {
        Row: {
          lecture_id: string | null
          lecture_title: string | null
          program: string | null
          session_title: string | null
          subject_id: string | null
          subject_title: string | null
          turn: number | null
          year: number | null
        }
        Relationships: []
      }
      v_duplicate_surveys: {
        Row: {
          cnt: number | null
          ids: string[] | null
          normalized_title: string | null
        }
        Relationships: []
      }
      v_instructor_session_map: {
        Row: {
          education_round: number | null
          education_year: number | null
          instructor_id: string | null
          instructor_name: string | null
          session_id: string | null
          survey_id: string | null
          survey_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      v_instructor_session_stats: {
        Row: {
          instructor_id: string | null
          instructor_name: string | null
          response_count: number | null
          survey_count: number | null
        }
        Relationships: []
      }
      v_instructor_subject_scores: {
        Row: {
          avg_course_score: number | null
          avg_instructor_score: number | null
          avg_operation_score: number | null
          avg_total_score: number | null
          instructor_id: string | null
          instructor_name: string | null
          program: string | null
          response_count: number | null
          subject_id: string | null
          subject_title: string | null
          turn: number | null
          year: number | null
        }
        Relationships: []
      }
      v_instructor_survey_counts: {
        Row: {
          instructor_id: string | null
          survey_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      v_instructor_survey_map: {
        Row: {
          education_round: number | null
          education_year: number | null
          instructor_id: string | null
          instructor_name: string | null
          session_id: string | null
          survey_id: string | null
          survey_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "survey_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      v_instructor_survey_responses: {
        Row: {
          instructor_id: string | null
          response_id: string | null
          session_id: string | null
          submitted_at: string | null
          survey_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions_v1"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_course_report_min"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "surveys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      v_instructor_survey_stats: {
        Row: {
          instructor_id: string | null
          instructor_name: string | null
          response_count: number | null
          survey_count: number | null
        }
        Relationships: []
      }
      v_qa_scored: {
        Row: {
          satisfaction_type: string | null
          score: number | null
          session_id: string | null
          survey_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_canonical"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_course_override"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_subject_filter_options"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_surveys_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "analytics_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "mv_survey_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_aggregates"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey_cumulative_stats"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "v_survey_instructor_session_resolved"
            referencedColumns: ["survey_id"]
          },
        ]
      }
      v_session_course_canonical: {
        Row: {
          created_at: string | null
          education_round: number | null
          education_year: number | null
          program_id: string | null
          program_name: string | null
          session_id: string | null
          session_title: string | null
        }
        Relationships: []
      }
      v_session_course_override: {
        Row: {
          course_id: string | null
          session_id: string | null
        }
        Relationships: []
      }
      v_session_instructors: {
        Row: {
          instructor_id: string | null
          instructor_name: string | null
          session_id: string | null
          session_key: string | null
          survey_id: string | null
        }
        Relationships: []
      }
      v_session_summary: {
        Row: {
          lecture_count: number | null
          program: string | null
          session_id: string | null
          subject_count: number | null
          turn: number | null
          year: number | null
        }
        Relationships: []
      }
      v_subject_filter_options: {
        Row: {
          course_id: string | null
          position: number | null
          subject_id: string | null
          subject_title: string | null
        }
        Insert: {
          course_id?: string | null
          position?: number | null
          subject_id?: string | null
          subject_title?: string | null
        }
        Update: {
          course_id?: string | null
          position?: number | null
          subject_id?: string | null
          subject_title?: string | null
        }
        Relationships: []
      }
      v_subject_options: {
        Row: {
          id: string | null
          title: string | null
        }
        Insert: {
          id?: string | null
          title?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      v_survey_instructor_session_resolved: {
        Row: {
          course_name: string | null
          education_round: number | null
          education_year: number | null
          instructor_id: string | null
          instructor_name: string | null
          resolved_session_id: string | null
          status: string | null
          survey_id: string | null
          survey_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_survey_aggregates"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_session_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_subject_scores"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_instructor_survey_stats"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "survey_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "v_session_instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      v_ui_session_filter: {
        Row: {
          course_key: string | null
          label: string | null
          program_id: string | null
          turn: number | null
          value: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_analysis_course_options"
            referencedColumns: ["program_id"]
          },
        ]
      }
    }
    Functions: {
      admin_link_profile_to_instructor: {
        Args: { instructor_id_param: string; target_profile_id: string }
        Returns: undefined
      }
      admin_set_user_roles: {
        Args: {
          roles: Database["public"]["Enums"]["user_role"][]
          target_user_id: string
        }
        Returns: undefined
      }
      admin_set_user_roles_safe: {
        Args: {
          roles: Database["public"]["Enums"]["user_role"][]
          target_user_id: string
        }
        Returns: undefined
      }
      app_role: { Args: never; Returns: string }
      app_uid: { Args: never; Returns: string }
      can_submit_answer: { Args: { p_response_id: string }; Returns: boolean }
      can_submit_response: { Args: { p_survey_id: string }; Returns: boolean }
      canonicalize_course_name: { Args: { name: string }; Returns: string }
      check_role_change_allowed: {
        Args: { new_role: string; old_role: string; user_id: string }
        Returns: boolean
      }
      cleanup_empty_survey_responses: {
        Args: { p_survey_ids: string[] }
        Returns: Json
      }
      course_report_statistics: {
        Args: {
          p_course_name?: string
          p_include_test?: boolean
          p_instructor_id?: string
          p_round?: number
          p_year: number
        }
        Returns: {
          available_courses: Json
          available_instructors: Json
          instructor_stats: Json
          summary: Json
          textual_responses: Json
          trend: Json
        }[]
      }
      create_admin_user: {
        Args: { admin_email: string; admin_password: string }
        Returns: undefined
      }
      create_instructor_account: {
        Args: {
          instructor_email: string
          instructor_id_param: string
          instructor_password: string
        }
        Returns: string
      }
      create_survey_response: {
        Args: {
          p_attended?: boolean
          p_is_test?: boolean
          p_respondent_email?: string
          p_session_id?: string
          p_survey_id: string
        }
        Returns: string
      }
      current_instructor_id: { Args: never; Returns: string }
      fn_course_filter_options:
        | {
            Args: { p_search?: string; p_year?: number }
            Returns: {
              course_id: string
              course_title: string
              year: number
            }[]
          }
        | {
            Args: {
              p_include_admin?: boolean
              p_include_instructor?: boolean
              p_search?: string
              p_year?: number
            }
            Returns: {
              course_id: string
              course_title: string
              has_admin: number
              has_instructor: number
              year: number
            }[]
          }
      fn_cumulative_list: {
        Args: {
          p_course_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_year?: number
        }
        Returns: {
          attended: boolean
          course_id: string
          course_title: string
          response_id: string
          session_id: string
          subject_title: string
          submitted_at: string
          survey_id: string
        }[]
      }
      fn_session_filter_options: {
        Args: { p_search?: string; p_year?: number }
        Returns: {
          course_title: string
          session_id: string
          session_title: string
          year: number
        }[]
      }
      fn_subject_filter_options: {
        Args: { p_course_id: string; p_search?: string }
        Returns: {
          subject_id: string
          subject_position: number
          subject_title: string
        }[]
      }
      generate_short_code: { Args: { length?: number }; Returns: string }
      generate_survey_code: { Args: { length?: number }; Returns: string }
      get_all_profiles_for_admin: {
        Args: { requesting_user_id: string }
        Returns: {
          created_at: string
          email: string
          first_login: boolean
          id: string
          instructor_id: string
          role: string
          updated_at: string
        }[]
      }
      get_course_reports_working: {
        Args: {
          p_include_test?: boolean
          p_instructor_id?: string
          p_round?: number
          p_session_id?: string
          p_year: number
        }
        Returns: Json
      }
      get_course_reports_working_uuid: {
        Args: {
          p_include_test?: boolean
          p_instructor_id?: string
          p_round?: number
          p_session_id?: string
          p_year: number
        }
        Returns: Json
      }
      get_course_statistics: {
        Args: {
          p_course_name?: string
          p_include_test?: boolean
          p_instructor_id?: string
          p_round?: number
          p_year: number
        }
        Returns: {
          available_courses: Json
          available_instructors: Json
          instructor_stats: Json
          summary: Json
          textual_responses: Json
          trend: Json
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_email_logs: {
        Args: never
        Returns: {
          created_at: string
          error: string
          failed_count: number
          id: string
          recipients: string[]
          results: Json
          sent_count: number
          status: string
          survey_id: string
        }[]
      }
      get_instructor_stats_optimized: {
        Args: { education_year_param?: number; instructor_id_param?: string }
        Returns: {
          avg_satisfaction: number
          education_round: number
          education_year: number
          instructor_id: string
          survey_count: number
          total_responses: number
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_survey_stats: {
        Args: never
        Returns: {
          instructor_name: string
          response_count: number
          survey_count: number
        }[]
      }
      get_rls_policies: {
        Args: never
        Returns: {
          command: string
          is_enabled: boolean
          policy_name: string
          roles: string
          table_name: string
          using_expression: string
          with_check: string
        }[]
      }
      get_session_statistics: {
        Args: { session_id_param?: string; survey_id_param?: string }
        Returns: {
          attended_responses: number
          avg_satisfaction: number
          course_title: string
          instructor_name: string
          response_rate: number
          session_id: string
          session_name: string
          total_responses: number
        }[]
      }
      get_survey_analysis: {
        Args: { survey_id_param: string }
        Returns: {
          feedback_text: Json
          response_count: number
          satisfaction_scores: Json
          survey_info: Json
        }[]
      }
      get_survey_cumulative_summary:
        | {
            Args: never
            Returns: {
              average_satisfaction: number
              courses_in_progress: number
              participating_instructors: number
              total_responses: number
              total_surveys: number
            }[]
          }
        | {
            Args: {
              course_name?: string
              education_year?: number
              include_test_data?: boolean
              search_term?: string
            }
            Returns: {
              average_satisfaction: number
              courses_in_progress: number
              participating_instructors: number
              total_responses: number
              total_surveys: number
            }[]
          }
      get_survey_detail_stats: {
        Args: {
          p_distribution_cursor?: number
          p_distribution_limit?: number
          p_include_test?: boolean
          p_response_cursor?: number
          p_response_limit?: number
          p_survey_id: string
          p_text_cursor?: number
          p_text_limit?: number
        }
        Returns: {
          distribution_next_cursor: number
          distribution_total_count: number
          question_distributions: Json
          response_next_cursor: number
          response_total_count: number
          responses: Json
          summary: Json
          text_answers: Json
          text_next_cursor: number
          text_total_count: number
        }[]
      }
      get_survey_responses_by_date_range: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          respondent_email: string
          response_id: string
          submitted_at: string
          survey_id: string
        }[]
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          email: string
          first_login: boolean
          id: string
          instructor_id: string
          role: string
          updated_at: string
        }[]
      }
      get_user_roles: {
        Args: { target_user_id?: string }
        Returns: {
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      has_role:
        | {
            Args: { check_role: Database["public"]["Enums"]["user_role"] }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["user_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_admin: { Args: never; Returns: boolean }
      is_director: { Args: never; Returns: boolean }
      is_instructor: { Args: never; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
      is_user_admin: { Args: { user_id: string }; Returns: boolean }
      map_session_to_course: {
        Args: { p_course_id: string; p_survey_id: string }
        Returns: undefined
      }
      normalize_course_name: { Args: { input_name: string }; Returns: string }
      recover_null_session_ids: {
        Args: never
        Returns: {
          recovered_count: number
          total_null_count: number
        }[]
      }
      refresh_dashboard_materialized_views: { Args: never; Returns: undefined }
      rpc_analysis_course_options: {
        Args: { p_year?: number }
        Returns: {
          course_key: string
          label: string
          session_count: number
          survey_count: number
          value: string
          year: number
        }[]
      }
      rpc_analysis_course_options_v2: {
        Args: { p_year?: number }
        Returns: {
          course_key: string
          label: string
          max_turn: number
          min_turn: number
          session_count: number
          survey_count: number
          value: string
          year: number
        }[]
      }
      rpc_analysis_course_options_v3: {
        Args: { p_year?: number }
        Returns: {
          course_key: string
          label: string
          max_turn: number
          min_turn: number
          session_count: number
          survey_count: number
          value: string
          year: number
        }[]
      }
      rpc_course_filter_options: {
        Args: { p_year: number }
        Returns: {
          course_key: string
          label: string
          value: string
          year: number
        }[]
      }
      rpc_dashboard_counts: {
        Args: { p_session_id?: string; p_year?: number }
        Returns: {
          avg_score: number
          instructor_count: number
          respondent_count: number
          survey_count: number
        }[]
      }
      rpc_session_filter_options:
        | {
            Args: { only_with_surveys?: boolean; p_year: number }
            Returns: {
              course_key: string
              label: string
              turn: number
              value: string
              year: number
            }[]
          }
        | {
            Args: { p_year?: number }
            Returns: {
              label: string
              program_name: string
              turn: number
              value: string
              year: number
            }[]
          }
      safe_numeric_convert: { Args: { input_text: string }; Returns: number }
      save_answers_bulk: { Args: { p_answers: Json }; Returns: undefined }
      trigger_auto_send_survey_results: { Args: never; Returns: undefined }
      update_course_statistics: { Args: never; Returns: undefined }
      update_survey_statuses: { Args: never; Returns: undefined }
    }
    Enums: {
      user_role: "instructor" | "operator" | "admin" | "director"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["instructor", "operator", "admin", "director"],
    },
  },
} as const
