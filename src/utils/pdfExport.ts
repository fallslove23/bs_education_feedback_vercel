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

export const generateCourseReportPDF = async (data: CourseReportPDFData) => {
  const doc = new jsPDF();

  // 한글 폰트 설정 (NanumGothic)
  try {
    const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf';
    const response = await fetch(fontUrl);

    if (response.ok) {
      const blob = await response.blob();
      const reader = new FileReader();

      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          doc.addFileToVFS('NanumGothic.ttf', base64data);
          doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
          doc.setFont('NanumGothic');
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      console.warn('Failed to fetch Korean font, using default font.');
    }
  } catch (error) {
    console.error('Error loading font:', error);
  }

  let yPosition = 20;

  // 제목
  doc.setFontSize(20);
  doc.text(data.reportTitle, 20, yPosition);
  yPosition += 15;

  doc.setFontSize(14);
  doc.text(`${data.year}년 ${data.round ? data.round + '차 ' : ''}${data.courseName}`, 20, yPosition);
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

import html2canvas from 'html2canvas';

export interface DownloadPdfOptions {
  filename: string;
  pdfTitle?: string;
  excludeClassNames?: string[];
  scale?: number;
}

/**
 * 특정 HTML 요소를 캡처하여 PDF로 다운로드하는 유틸리티
 * @param elementId 캡처할 요소의 ID
 * @param options PDF 다운로드 옵션
 */
export const downloadElementAsPdf = async (
  elementId: string,
  options: DownloadPdfOptions
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID '${elementId}' not found`);
    return false;
  }

  // 로딩 상태 표시 등을 위한 처리 시작
  const originalStyle = element.style.cssText;

  // PDF 캡처를 위해 임시 스타일 적용 (예: 배경색 강제 지정 등)
  // html2canvas는 투명 배경을 검은색이나 흰색으로 처리할 수 있으므로 명시적 설정이 좋음
  // element.style.backgroundColor = '#ffffff';

  try {
    // 1. 제외할 요소들 임시 숨김 처리
    const hiddenElements: HTMLElement[] = [];
    if (options.excludeClassNames) {
      options.excludeClassNames.forEach(className => {
        const targets = element.querySelectorAll(`.${className}`);
        targets.forEach(el => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style.display !== 'none') {
            htmlEl.dataset.originalDisplay = htmlEl.style.display;
            htmlEl.style.display = 'none';
            hiddenElements.push(htmlEl);
          }
        });
      });
    }

    // 2. HTML을 캔버스로 변환
    const canvas = await html2canvas(element, {
      scale: options.scale || 2, // 고해상도 
      logging: false,
      useCORS: true, // 이미지 크로스오리진 허용
      allowTaint: true,
      backgroundColor: '#ffffff', // 배경색 흰색 고정
      ignoreElements: (node) => {
        // 특정 노드 무시 로직 추가 가능
        return false;
      }
    });

    // 3. 캔버스 이미지를 PDF로 변환
    const imgData = canvas.toDataURL('image/png');

    // A4 사이즈 기준 (mm)
    const imgWidth = 210;
    const pageHeight = 297;

    // 이미지 비율에 따른 높이 계산
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const doc = new jsPDF('p', 'mm', 'a4');

    // 첫 페이지 출력
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 내용이 길어서 페이지를 넘어가면 추가 페이지 생성
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 4. 저장
    doc.save(options.filename);

    // 5. 숨겼던 요소들 원래대로 복구
    hiddenElements.forEach(el => {
      el.style.display = el.dataset.originalDisplay || '';
    });

    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    return false;
  } finally {
    element.style.cssText = originalStyle;
  }
};