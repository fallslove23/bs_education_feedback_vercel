
export interface SendResultsRequest {
    surveyId: string;
    recipients: string[];
    force?: boolean;
    previewOnly?: boolean;
    targetInstructorIds?: string[];
}

export interface Instructor {
    id: string;
    name?: string;
    email?: string;
}

export interface Survey {
    id: string;
    title: string;
    course_name?: string;
    instructor_id?: string;
    education_year?: number;
    education_round?: number;
    created_by_name?: string;
    created_by_email?: string;
}

export interface Session {
    id: string;
    session_name?: string;
    instructor_id?: string;
    instructors?: Instructor;
}

export interface QuestionAnswer {
    id: string;
    response_id: string;
    question_id: string;
    answer_text?: string;
    answer_value?: number | string | object;
    survey_questions: SurveyQuestion;
}

export interface SurveyQuestion {
    id: string;
    question_text: string;
    question_type: string;
    satisfaction_type?: string;
    session_id?: string;
}

export interface QuestionStats {
    average?: number;
    count?: number;
    distribution?: Record<string, number>;
}

export interface ProcessedQuestionData {
    question: string;
    type: string;
    satisfaction_type?: string;
    sessionId: string | null;
    sessionName: string | null;
    instructor: string | null;
    instructorId: string | null;
    answers: (string | number)[];
    stats: QuestionStats;
}
