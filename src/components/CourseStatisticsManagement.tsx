import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Plus, Edit, Trash2, FileSpreadsheet, Wand2, AlertCircle, CheckCircle, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface CourseStatistic {
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

const CourseStatisticsManagement = () => {
  const [statistics, setStatistics] = useState<CourseStatistic[]>([]);
  const [allStatistics, setAllStatistics] = useState<CourseStatistic[]>([]);
  const [standardCourseNames, setStandardCourseNames] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<CourseStatistic | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const { toast } = useToast();
  const { userRoles } = useAuth();

  // 관리자 권한 체크
  const isAdmin = userRoles?.includes('admin') || false;

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const statusOptions = ['완료', '진행 중', '진행 예정', '취소'];
  const statusSet = new Set(statusOptions);

  const parseNumericField = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // 필터링된 통계에서 사용 가능한 차수 추출
  const availableRounds = [...new Set(allStatistics.filter(stat => stat.year === selectedYear).map(stat => stat.round))].sort((a, b) => a - b);

  // 표준 과정명 목록 사용 (course_names 테이블에서 가져온 것)
  const availableCourses = standardCourseNames;

  useEffect(() => {
    fetchAllStatistics();
    fetchStandardCourseNames();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedYear, selectedRound, selectedCourse, allStatistics]);

  const fetchStandardCourseNames = async () => {
    try {
      const { data, error } = await supabase
        .from('course_names')
        .select('name')
        .order('name');

      if (error) throw error;
      setStandardCourseNames((data || []).map(d => d.name));
    } catch (error) {
      console.error('Error fetching course names:', error);
      // Fallback to extracting from statistics if course_names table fails
      const coursesFromStats = [...new Set(allStatistics.map(stat => stat.course_name))].sort();
      setStandardCourseNames(coursesFromStats);
    }
  };

  const fetchAllStatistics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_statistics')
        .select('*')
        .order('year', { ascending: false })
        .order('round', { ascending: true });

      if (error) throw error;
      setAllStatistics(data || []);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast({
        title: "오류",
        description: "통계 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allStatistics.filter(stat => stat.year === selectedYear);

    if (selectedRound !== 'all') {
      filtered = filtered.filter(stat => stat.round === parseInt(selectedRound));
    }

    if (selectedCourse !== 'all') {
      filtered = filtered.filter(stat => stat.course_name === selectedCourse);
    }

    setStatistics(filtered.sort((a, b) => a.round - b.round));
  };

  const handleSave = async (formData: FormData) => {
    if (!isAdmin) {
      toast({
        title: "권한 없음",
        description: "관리자만 통계 데이터를 수정할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      const rawCourseName = (formData.get('course_name') as string) || '';
      const courseName = rawCourseName.trim();
      const rawStatus = ((formData.get('status') as string) || '완료').toString();
      const status = statusSet.has(rawStatus) ? rawStatus : '완료';

      if (!courseName) {
        toast({
          title: "오류",
          description: "과정명을 입력해주세요.",
          variant: "destructive"
        });
        return;
      }

      if (statusSet.has(courseName)) {
        toast({
          title: "입력 오류",
          description: "과정명 칸에 완료/진행 상태 텍스트가 들어가 있습니다. 실제 과정명을 입력해주세요.",
          variant: "destructive"
        });
        return;
      }

      const statisticData: CourseStatistic = {
        year: parseInt(formData.get('year') as string),
        round: parseInt(formData.get('round') as string),
        course_name: courseName,
        course_start_date: formData.get('course_start_date') as string,
        course_end_date: formData.get('course_end_date') as string,
        course_days: parseInt(formData.get('course_days') as string),
        status,
        enrolled_count: parseInt(formData.get('enrolled_count') as string),
        cumulative_count: parseInt(formData.get('cumulative_count') as string),
        education_days: formData.get('education_days') ? parseInt(formData.get('education_days') as string) : null,
        education_hours: formData.get('education_hours') ? parseInt(formData.get('education_hours') as string) : null,
        total_satisfaction: formData.get('total_satisfaction') ? parseFloat(formData.get('total_satisfaction') as string) : null,
        course_satisfaction: formData.get('course_satisfaction') ? parseFloat(formData.get('course_satisfaction') as string) : null,
        instructor_satisfaction: formData.get('instructor_satisfaction') ? parseFloat(formData.get('instructor_satisfaction') as string) : null,
        operation_satisfaction: formData.get('operation_satisfaction') ? parseFloat(formData.get('operation_satisfaction') as string) : null,
      };

      if (editingItem?.id) {
        const { error } = await supabase
          .from('course_statistics')
          .update(statisticData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: "성공", description: "통계 데이터가 수정되었습니다." });
      } else {
        const { error } = await supabase
          .from('course_statistics')
          .insert(statisticData);

        if (error) throw error;
        toast({ title: "성공", description: "통계 데이터가 추가되었습니다." });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      fetchAllStatistics();
    } catch (error) {
      console.error('Error saving statistic:', error);
      toast({
        title: "오류",
        description: "통계 데이터 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "권한 없음",
        description: "관리자만 통계 데이터를 삭제할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('정말로 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('course_statistics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "성공", description: "통계 데이터가 삭제되었습니다." });
      fetchAllStatistics();
    } catch (error) {
      console.error('Error deleting statistic:', error);
      toast({
        title: "오류",
        description: "통계 데이터 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 확장자 검증
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setUploadStatus({
        type: 'error',
        message: 'Excel 파일(.xlsx 또는 .xls)만 업로드 가능합니다.'
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        setUploadStatus({ type: null, message: '' });

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

        console.log('Excel data preview:', jsonData.slice(0, 2));

        const statisticsToUpload: CourseStatistic[] = [];
        const errors: string[] = [];

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

        const { error } = await supabase
          .from('course_statistics')
          .upsert(statisticsToUpload, {
            onConflict: 'year,round,course_name',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(`데이터베이스 저장 오류: ${error.message}`);
        }

        setUploadStatus({
          type: 'success',
          message: `${statisticsToUpload.length}개의 통계 데이터가 성공적으로 업로드되었습니다.`
        });

        setIsUploadDialogOpen(false);
        fetchAllStatistics();
      } catch (error: any) {
        console.error('Error uploading Excel:', error);
        setUploadStatus({
          type: 'error',
          message: error.message || 'Excel 파일 업로드 중 오류가 발생했습니다.'
        });
      } finally {
        setLoading(false);
        // Reset file input
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      setUploadStatus({
        type: 'error',
        message: '파일을 읽는 중 오류가 발생했습니다.'
      });
      setLoading(false);
      event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

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

  const generateFromSurveys = async () => {
    if (!isAdmin) {
      toast({
        title: "권한 없음",
        description: "관리자만 통계 데이터를 자동 생성할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('기존 설문 데이터로부터 통계를 자동 생성하시겠습니까? (기존 데이터는 덮어쓰여질 수 있습니다)')) return;

    try {
      setLoading(true);

      // 해당 년도의 완료된 설문 데이터 가져오기
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

      if (!surveys || surveys.length === 0) {
        toast({
          title: "알림",
          description: `${selectedYear}년도에 생성할 설문 결과가 없습니다.`,
          variant: "destructive"
        });
        return;
      }

      // 설문별로 통계 계산
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
          const validResponses = (survey.survey_responses || []).filter(response => !response.is_test);
          const statusKey = typeof survey.status === 'string' ? survey.status : 'completed';
          const statusLabel = statusLabelMap[statusKey] || '완료';
          const round = typeof survey.education_round === 'number'
            ? survey.education_round
            : Number(survey.education_round) || 1;
          const educationDay = typeof survey.education_day === 'number'
            ? survey.education_day
            : Number(survey.education_day) || null;
          const responseCount = validResponses.length;
          const expectedParticipants = typeof survey.expected_participants === 'number'
            ? survey.expected_participants
            : Number(survey.expected_participants) || 0;

          if (!generatedStats.has(key)) {
            generatedStats.set(key, {
              year: survey.education_year ?? selectedYear,
              round,
              course_name: survey.course_name || '',
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

          // 만족도 계산
          let instructorScores: number[] = [];
          let courseScores: number[] = [];
          let operationScores: number[] = [];

          validResponses.forEach(response => {
            response.question_answers?.forEach(answer => {
              if (answer.survey_questions?.question_type === 'scale' && answer.answer_value) {
                let score = typeof answer.answer_value === 'number' ? answer.answer_value : Number(answer.answer_value);
                if (score <= 5 && score > 0) score = score * 2; // 5점 척도를 10점으로 변환

                if (answer.survey_questions.satisfaction_type === 'instructor') {
                  instructorScores.push(score);
                } else if (answer.survey_questions.satisfaction_type === 'course') {
                  courseScores.push(score);
                } else if (answer.survey_questions.satisfaction_type === 'operation') {
                  operationScores.push(score);
                }
              }
            });
          });

          if (responseCount > 0) {
            stat.enrolled_count = responseCount;
            const currentCumulative = typeof stat.cumulative_count === 'number' ? stat.cumulative_count : 0;
            stat.cumulative_count = Math.max(currentCumulative, responseCount);
          } else if (!stat.enrolled_count) {
            stat.enrolled_count = expectedParticipants;
            if (!stat.cumulative_count) {
              stat.cumulative_count = expectedParticipants;
            }
          }

          // 평균 계산
          stat.instructor_satisfaction = instructorScores.length > 0 ?
            Number((instructorScores.reduce((a, b) => a + b, 0) / instructorScores.length).toFixed(2)) : null;
          stat.course_satisfaction = courseScores.length > 0 ?
            Number((courseScores.reduce((a, b) => a + b, 0) / courseScores.length).toFixed(2)) : null;
          stat.operation_satisfaction = operationScores.length > 0 ?
            Number((operationScores.reduce((a, b) => a + b, 0) / operationScores.length).toFixed(2)) : null;

          // 종합 만족도
          const validScores = [stat.instructor_satisfaction, stat.course_satisfaction, stat.operation_satisfaction]
            .filter(score => score !== null) as number[];
          stat.total_satisfaction = validScores.length > 0 ?
            Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)) : null;
        });

      const statsArray = Array.from(generatedStats.values());

      if (statsArray.length > 0) {
        const { error } = await supabase
          .from('course_statistics')
          .upsert(statsArray, { onConflict: 'year,round,course_name' });

        if (error) throw error;

        toast({
          title: "성공",
          description: `${statsArray.length}개의 통계가 자동 생성되었습니다.`
        });

        fetchAllStatistics();
      }

    } catch (error) {
      console.error('Error generating statistics:', error);
      toast({
        title: "오류",
        description: "통계 자동 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 rounded-xl p-6 border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              과정별 통계 관리
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            과정별 통계 데이터를 조회, 입력, 수정, 삭제하거나 Excel 업로드 및 자동 생성할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsUploadDialogOpen(true)}
            disabled={loading || !isAdmin}
            className={`bg-white/50 backdrop-blur-sm hover:bg-white/80 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Excel 업로드
          </Button>
          <Button
            variant="outline"
            onClick={generateFromSurveys}
            disabled={loading || !isAdmin}
            className={`bg-white/50 backdrop-blur-sm hover:bg-white/80 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            자동 생성
          </Button>
          {isAdmin ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4 mr-2" />
                  새 통계 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? '통계 수정' : '새 통계 추가'}</DialogTitle>
                  <DialogDescription>
                    과정별 통계 정보를 입력해주세요.
                  </DialogDescription>
                </DialogHeader>
                <StatisticForm
                  initialData={editingItem}
                  onSave={handleSave}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              관리자 권한 필요
            </div>
          )}
        </div>
      </div>

      <Card>

        <CardContent className="space-y-4">
          {/* 필터 섹션 */}
          <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">필터</span>
            </div>
            <div className="flex gap-2">
              <Select value={selectedYear.toString()} onValueChange={(value) => {
                setSelectedYear(Number(value));
                setSelectedRound('all');
                setSelectedCourse('all');
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRound} onValueChange={(value) => {
                setSelectedRound(value);
                setSelectedCourse('all');
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="차수 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 차수</SelectItem>
                  {availableRounds.map(round => (
                    <SelectItem key={round} value={round.toString()}>{round}차</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="과정 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 과정</SelectItem>
                  {availableCourses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 테이블 섹션 */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              {statistics.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  선택한 조건에 해당하는 통계 데이터가 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>차수</TableHead>
                      <TableHead>과정명</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>누적/수강</TableHead>
                      <TableHead>종합만족도</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statistics.map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell>{stat.round}차</TableCell>
                        <TableCell>{stat.course_name}</TableCell>
                        <TableCell className="text-sm">
                          {stat.course_start_date} ~ {stat.course_end_date}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${stat.status === '완료' ? 'bg-success/20 text-success' :
                            stat.status === '진행 중' ? 'bg-info/20 text-info' :
                              stat.status === '진행 예정' ? 'bg-warning/20 text-warning' :
                                'bg-muted text-muted-foreground'
                            }`}>
                            {stat.status}
                          </span>
                        </TableCell>
                        <TableCell>{stat.cumulative_count} / {stat.enrolled_count}</TableCell>
                        <TableCell>
                          {stat.total_satisfaction ? `${stat.total_satisfaction}/10` : '-'}
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingItem(stat); setIsDialogOpen(true); }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => stat.id && handleDelete(stat.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">권한 없음</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel 업로드 다이얼로그 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Excel 파일 업로드</DialogTitle>
            <DialogDescription>
              Excel 파일을 업로드하여 통계 데이터를 일괄 입력할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadStatus.type && (
              <Alert className={uploadStatus.type === 'success' ? 'border-success' : 'border-destructive'}>
                {uploadStatus.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{uploadStatus.message}</AlertDescription>
              </Alert>
            )}

            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="space-y-2">
                <h3 className="font-semibold">Excel 파일을 선택해주세요</h3>
                <p className="text-sm text-muted-foreground">
                  .xlsx, .xls 파일을 지원합니다
                </p>
              </div>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="mt-4 max-w-xs mx-auto"
                disabled={loading}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Excel 파일 형식</h4>
              <p className="text-sm text-muted-foreground mb-2">
                다음 컬럼들을 포함해야 합니다:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>• 연도 (year)</div>
                <div>• 차수 (round)</div>
                <div>• 과정명 (course_name)</div>
                <div>• 과정시작일 (course_start_date)</div>
                <div>• 과정종료일 (course_end_date)</div>
                <div>• 과정일수 (course_days)</div>
                <div>• 상태 (status)</div>
                <div>• 수강인원 (enrolled_count)</div>
                <div>• 누적인원 (cumulative_count)</div>
                <div>• 교육일수 (education_days) - 선택</div>
                <div>• 교육시간 (education_hours) - 선택</div>
                <div>• 종합만족도 (total_satisfaction) - 선택</div>
                <div>• 과정만족도 (course_satisfaction) - 선택</div>
                <div>• 강사만족도 (instructor_satisfaction) - 선택</div>
                <div>• 운영만족도 (operation_satisfaction) - 선택</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface StatisticFormProps {
  initialData: CourseStatistic | null;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
}

const StatisticForm = ({ initialData, onSave, onCancel }: StatisticFormProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave(formData);
  };

  const statusOptions = ['완료', '진행 중', '진행 예정', '취소'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="year">연도 *</Label>
          <Input
            id="year"
            name="year"
            type="number"
            defaultValue={initialData?.year || new Date().getFullYear()}
            required
          />
        </div>
        <div>
          <Label htmlFor="round">차수 *</Label>
          <Input
            id="round"
            name="round"
            type="number"
            defaultValue={initialData?.round || 1}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="course_name">과정명 *</Label>
          <Input
            id="course_name"
            name="course_name"
            defaultValue={initialData?.course_name || ''}
            required
          />
        </div>
        <div>
          <Label htmlFor="course_start_date">과정 시작일 *</Label>
          <Input
            id="course_start_date"
            name="course_start_date"
            type="date"
            defaultValue={initialData?.course_start_date || ''}
            required
          />
        </div>
        <div>
          <Label htmlFor="course_end_date">과정 종료일 *</Label>
          <Input
            id="course_end_date"
            name="course_end_date"
            type="date"
            defaultValue={initialData?.course_end_date || ''}
            required
          />
        </div>
        <div>
          <Label htmlFor="course_days">과정 일수 *</Label>
          <Input
            id="course_days"
            name="course_days"
            type="number"
            defaultValue={initialData?.course_days || 1}
            required
          />
        </div>
        <div>
          <Label htmlFor="status">상태 *</Label>
          <Select name="status" defaultValue={initialData?.status || '완료'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="enrolled_count">수강 인원 *</Label>
          <Input
            id="enrolled_count"
            name="enrolled_count"
            type="number"
            defaultValue={initialData?.enrolled_count || 0}
            required
          />
        </div>
        <div>
          <Label htmlFor="cumulative_count">누적 인원 *</Label>
          <Input
            id="cumulative_count"
            name="cumulative_count"
            type="number"
            defaultValue={initialData?.cumulative_count || 0}
            required
          />
        </div>
        <div>
          <Label htmlFor="education_days">교육 일수</Label>
          <Input
            id="education_days"
            name="education_days"
            type="number"
            defaultValue={initialData?.education_days || ''}
          />
        </div>
        <div>
          <Label htmlFor="education_hours">교육 시간</Label>
          <Input
            id="education_hours"
            name="education_hours"
            type="number"
            defaultValue={initialData?.education_hours || ''}
          />
        </div>
        <div>
          <Label htmlFor="total_satisfaction">종합 만족도</Label>
          <Input
            id="total_satisfaction"
            name="total_satisfaction"
            type="number"
            step="0.01"
            min="0"
            max="10"
            defaultValue={initialData?.total_satisfaction || ''}
          />
        </div>
        <div>
          <Label htmlFor="course_satisfaction">과목 만족도</Label>
          <Input
            id="course_satisfaction"
            name="course_satisfaction"
            type="number"
            step="0.01"
            min="0"
            max="10"
            defaultValue={initialData?.course_satisfaction || ''}
          />
        </div>
        <div>
          <Label htmlFor="instructor_satisfaction">강사 만족도</Label>
          <Input
            id="instructor_satisfaction"
            name="instructor_satisfaction"
            type="number"
            step="0.01"
            min="0"
            max="10"
            defaultValue={initialData?.instructor_satisfaction || ''}
          />
        </div>
        <div>
          <Label htmlFor="operation_satisfaction">운영 만족도</Label>
          <Input
            id="operation_satisfaction"
            name="operation_satisfaction"
            type="number"
            step="0.01"
            min="0"
            max="10"
            defaultValue={initialData?.operation_satisfaction || ''}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">
          {initialData ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );
};

export default CourseStatisticsManagement;