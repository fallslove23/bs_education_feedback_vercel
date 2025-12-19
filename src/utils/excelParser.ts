
import * as XLSX from 'xlsx';

export interface CourseStatistic {
    id?: string;
    year: number;
    round: number;
    course_name: string;
    course_start_date: string;
    course_end_date: string;
    course_days: number;
    status: string;
    enrolled_count: number;
    cumulative_count: number;
    education_days?: number;
    education_hours?: number;
    total_satisfaction?: number;
    course_satisfaction?: number;
    instructor_satisfaction?: number;
    operation_satisfaction?: number;
}

const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';

    // Excel 날짜 숫자인 경우
    if (typeof dateValue === 'number') {
        const date = XLSX.SSF.parse_date_code(dateValue);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // 이미 문자열인 경우
    if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }

    return dateValue.toString();
};

const parseNumericField = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const parseCourseStatisticsExcel = (file: File): Promise<CourseStatistic[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('Excel 파일에 시트가 없습니다.');
                }

                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (!jsonData || jsonData.length === 0) {
                    throw new Error('Excel 파일에 데이터가 없습니다.');
                }

                const statisticsToUpload: CourseStatistic[] = [];
                const errors: string[] = [];
                const statusSet = new Set(['완료', '진행 중', '진행 예정', '취소']);

                jsonData.forEach((row: any, index: number) => {
                    try {
                        // 필수 필드 검증
                        const year = parseInt(row['연도'] || row['year']) || null;
                        const round = parseInt(row['차수'] || row['round']) || null;
                        const courseName = (row['과정명'] || row['course_name'] || '').toString().trim();

                        if (!courseName) {
                            errors.push(`${index + 2}번째 행: 연도, 차수, 과정명은 필수입니다.`);
                            return;
                        }

                        if (statusSet.has(courseName)) {
                            errors.push(`${index + 2}번째 행: 과정명에 완료/진행 상태 텍스트가 입력되었습니다.`);
                            return;
                        }

                        if (!year || !round) {
                            errors.push(`${index + 2}번째 행: 연도, 차수, 과정명은 필수입니다.`);
                            return;
                        }

                        const statusValue = (row['상태'] || row['status'] || '완료').toString().trim();
                        const normalizedStatus = statusSet.has(statusValue) ? statusValue : '완료';

                        const statistic: CourseStatistic = {
                            year,
                            round,
                            course_name: courseName,
                            course_start_date: formatDate(row['과정시작일'] || row['course_start_date']),
                            course_end_date: formatDate(row['과정종료일'] || row['course_end_date']),
                            course_days: parseInt(row['과정일수'] || row['course_days']) || 1,
                            status: normalizedStatus,
                            enrolled_count: parseInt(row['수강인원'] || row['enrolled_count']) || 0,
                            cumulative_count: parseInt(row['누적인원'] || row['cumulative_count']) || 0,
                            education_days: parseNumericField(row['교육일수'] ?? row['education_days']) ?? null,
                            education_hours: parseNumericField(row['교육시간'] ?? row['education_hours']) ?? null,
                            total_satisfaction: parseNumericField(row['종합만족도'] ?? row['total_satisfaction']),
                            course_satisfaction: parseNumericField(row['과정만족도'] ?? row['course_satisfaction']),
                            instructor_satisfaction: parseNumericField(row['강사만족도'] ?? row['instructor_satisfaction']),
                            operation_satisfaction: parseNumericField(row['운영만족도'] ?? row['operation_satisfaction']),
                        };

                        statisticsToUpload.push(statistic);
                    } catch (rowError) {
                        console.error(`Row ${index + 2} error:`, rowError);
                        errors.push(`${index + 2}번째 행: 데이터 형식 오류`);
                    }
                });

                if (errors.length > 0) {
                    throw new Error(`데이터 오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
                }

                if (statisticsToUpload.length === 0) {
                    throw new Error('업로드할 유효한 데이터가 없습니다.');
                }

                resolve(statisticsToUpload);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
        };

        reader.readAsArrayBuffer(file);
    });
};
