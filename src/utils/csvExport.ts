// CSV 내보내기 유틸리티 함수들

export interface SurveyResultData {
  survey: {
    id: string;
    title: string;
    education_year: number;
    education_round: number;
    instructor_name?: string;
    course_title?: string;
  };
  responses: Array<{
    id: string;
    submitted_at: string;
    respondent_email?: string;
  }>;
  questions: Array<{
    id: string;
    question_text: string;
    question_type: string;
    order_index: number;
  }>;
  answers: Array<{
    question_id: string;
    answer_text?: string;
    answer_value?: any;
    response_id: string;
  }>;
}

// CSV 파일명 생성
export const generateCSVFilename = (survey: SurveyResultData['survey'], type: 'responses' | 'summary') => {
  const year = survey.education_year;
  const round = survey.education_round;
  const title = survey.title.replace(/[^\w\s가-힣]/g, '').trim();
  const timestamp = new Date().toISOString().slice(0, 10);

  return `설문결과_${title}_${year}년_${round}차_${type}_${timestamp}.csv`;
};

// 숫자형 응답 값을 안전하게 파싱
const extractNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = extractNumericValue(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  try {
    const serialized = JSON.stringify(value ?? '');
    const match = serialized.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getNumericAnswer = (answer: SurveyResultData['answers'][number]): number | null => {
  const fromValue = extractNumericValue(answer.answer_value);
  if (fromValue !== null) return fromValue;
  return extractNumericValue(answer.answer_text);
};

// 문자열을 CSV에 안전하게 사용할 수 있도록 변환
export const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) return '';

  const str = String(field);
  // 쌍따옴표가 포함된 경우 두 개로 치환하고, 전체를 쌍따옴표로 감싼다
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// 응답 데이터를 CSV로 변환 (행: 응답자, 열: 질문)
export const exportResponsesAsCSV = (data: SurveyResultData): string => {
  const { survey, responses, questions, answers } = data;
  
  // 질문을 순서대로 정렬
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
  
  // CSV 헤더 생성
  const headers = [
    '응답 ID',
    '제출 시간', 
    '응답자 이메일',
    ...sortedQuestions.map(q => q.question_text)
  ];
  
  // 각 응답에 대한 행 생성
  const rows = responses.map(response => {
    const row = [
      response.id,
      new Date(response.submitted_at).toLocaleString('ko-KR'),
      response.respondent_email || '익명'
    ];
    
    // 각 질문에 대한 답변 추가
    sortedQuestions.forEach(question => {
      const answer = answers.find(a => 
        a.response_id === response.id && a.question_id === question.id
      );
      
      let answerValue = '';
      if (answer) {
        if (answer.answer_text) {
          answerValue = answer.answer_text;
        } else if (answer.answer_value !== null && answer.answer_value !== undefined) {
          answerValue = String(answer.answer_value);
        }
      }
      
      row.push(answerValue);
    });
    
    return row;
  });
  
  // CSV 문자열 생성
  const csvContent = [
    // 메타데이터
    [`설문 제목: ${survey.title}`],
    [`교육년도: ${survey.education_year}년`],
    [`교육차수: ${survey.education_round}차`],
    survey.instructor_name ? [`강사명: ${survey.instructor_name}`] : [],
    survey.course_title ? [`강의명: ${survey.course_title}`] : [],
    [`총 응답 수: ${responses.length}건`],
    [`내보낸 시간: ${new Date().toLocaleString('ko-KR')}`],
    [], // 빈 줄
    // 헤더와 데이터
    headers.map(escapeCSVField),
    ...rows.map(row => row.map(escapeCSVField))
  ]
    .filter(row => row.length > 0) // 빈 배열 제거
    .map(row => row.join(','))
    .join('\n');
  
  return csvContent;
};

// 질문별 요약 통계를 CSV로 변환
export const exportSummaryAsCSV = (data: SurveyResultData): string => {
  const { survey, questions, answers, responses } = data;
  
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
  
  const summaryRows: string[][] = [
    // 메타데이터
    [`설문 제목: ${survey.title}`],
    [`교육년도: ${survey.education_year}년`],
    [`교육차수: ${survey.education_round}차`],
    survey.instructor_name ? [`강사명: ${survey.instructor_name}`] : [],
    survey.course_title ? [`강의명: ${survey.course_title}`] : [],
    [`총 응답 수: ${responses.length}건`],
    [`내보낸 시간: ${new Date().toLocaleString('ko-KR')}`],
    [], // 빈 줄
    ['질문 번호', '질문 내용', '질문 유형', '응답 수', '통계']
  ].filter(row => row.length > 0);
  
  sortedQuestions.forEach((question, index) => {
    const questionAnswers = answers.filter(a => a.question_id === question.id);
    const responseCount = questionAnswers.length;

    let statistics = '';

    if (question.question_type === 'rating') {
      const numericAnswers = questionAnswers
        .map(getNumericAnswer)
        .filter((value): value is number => value !== null && !Number.isNaN(value));

      if (numericAnswers.length > 0) {
        const average = (numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length).toFixed(1);
        const min = Math.min(...numericAnswers);
        const max = Math.max(...numericAnswers);
        statistics = `평균: ${average}점 (최소: ${min}, 최대: ${max})`;
      }
    } else if (question.question_type === 'multiple_choice' || question.question_type === 'single_choice') {
      const counts: Record<string, number> = {};
      questionAnswers.forEach(answer => {
        if (answer.answer_text) {
          counts[answer.answer_text] = (counts[answer.answer_text] || 0) + 1;
        }
      });
      
      const distribution = Object.entries(counts)
        .map(([option, count]) => `${option}: ${count}건`)
        .join(', ');
      statistics = distribution;
    } else {
      statistics = `텍스트 응답 ${responseCount}건`;
    }
    
    summaryRows.push([
      String(index + 1),
      question.question_text,
      question.question_type,
      String(responseCount),
      statistics
    ]);
  });
  
  return summaryRows
    .map(row => row.map(escapeCSVField).join(','))
    .join('\n');
};

// CSV 다운로드 실행
export const downloadCSV = (content: string, filename: string) => {
  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};