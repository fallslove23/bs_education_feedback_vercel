import jsPDF from 'jspdf';

export interface CourseReportPDFData {
  reportTitle: string;
  year: number;
  round?: number;
  courseName: string;
  totalSurveys: number;
  totalResponses: number;
  instructorCount: number;
  avgInstructorSatisfaction: number;
  avgCourseSatisfaction: number;
  avgOperationSatisfaction: number;
  instructorStats: Array<{
    name: string;
    surveyCount: number;
    responseCount: number;
    avgSatisfaction: number;
  }>;
}

export const generateCourseReportPDF = (data: CourseReportPDFData) => {
  const doc = new jsPDF();
  
  // 한글 폰트 설정 (기본 폰트로 대체)
  let yPosition = 20;
  
  // 제목
  doc.setFontSize(20);
  doc.text(data.reportTitle, 20, yPosition);
  yPosition += 15;
  
  doc.setFontSize(14);
  doc.text(`${data.year}년 ${data.round ? data.round + 'round' : ''} ${data.courseName}`, 20, yPosition);
  yPosition += 20;
  
  // 전체 통계
  doc.setFontSize(16);
  doc.text('Overall Statistics', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.text(`Total Surveys: ${data.totalSurveys}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Total Responses: ${data.totalResponses}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Instructor Count: ${data.instructorCount}`, 20, yPosition);
  yPosition += 15;
  
  // 만족도 점수
  doc.setFontSize(16);
  doc.text('Satisfaction Scores', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.text(`Instructor Satisfaction: ${data.avgInstructorSatisfaction.toFixed(1)}/10.0`, 20, yPosition);
  yPosition += 8;
  doc.text(`Course Satisfaction: ${data.avgCourseSatisfaction.toFixed(1)}/10.0`, 20, yPosition);
  yPosition += 8;
  doc.text(`Operation Satisfaction: ${data.avgOperationSatisfaction.toFixed(1)}/10.0`, 20, yPosition);
  yPosition += 8;
  
  const overallSatisfaction = (data.avgInstructorSatisfaction + data.avgCourseSatisfaction + data.avgOperationSatisfaction) / 3;
  doc.text(`Overall Satisfaction: ${overallSatisfaction.toFixed(1)}/10.0`, 20, yPosition);
  yPosition += 20;
  
  // 강사별 통계
  if (data.instructorStats.length > 0) {
    doc.setFontSize(16);
    doc.text('Instructor Statistics', 20, yPosition);
    yPosition += 10;
    
    // 테이블 헤더
    doc.setFontSize(10);
    doc.text('Name', 20, yPosition);
    doc.text('Surveys', 80, yPosition);
    doc.text('Responses', 120, yPosition);
    doc.text('Satisfaction', 160, yPosition);
    yPosition += 8;
    
    // 구분선
    doc.line(20, yPosition - 2, 190, yPosition - 2);
    
    // 강사 데이터
    data.instructorStats.forEach((instructor, index) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(instructor.name.substring(0, 20), 20, yPosition);
      doc.text(instructor.surveyCount.toString(), 80, yPosition);
      doc.text(instructor.responseCount.toString(), 120, yPosition);
      doc.text(instructor.avgSatisfaction.toFixed(1), 160, yPosition);
      yPosition += 8;
    });
  }
  
  // 생성 일시
  yPosition += 10;
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
  
  // PDF 다운로드
  const filename = `course_report_${data.year}_${data.courseName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(filename);
};