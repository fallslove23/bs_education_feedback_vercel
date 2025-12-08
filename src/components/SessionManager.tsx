import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2, User, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Subject { id: string; title: string; }
interface Instructor { id: string; name: string; email?: string; photo_url?: string; bio?: string; }
export interface SurveySession {
  id: string;
  survey_id: string;
  subject_id: string | null;
  lecture_id?: string | null;
  instructor_id: string | null;
  session_name: string;
  session_order: number;
  subject?: Subject;
  instructor?: Instructor;
}

interface SessionManagerProps {
  surveyId: string;
  sessions: SurveySession[];
  subjects: Subject[];  // subjects (과목) 목록
  instructors: Instructor[];
  onSessionsChange: (sessions: SurveySession[]) => void;
  onSubjectSearchChange?: (term: string) => void;
}

export const SessionManager = ({
  surveyId, sessions, subjects, instructors, onSessionsChange, onSubjectSearchChange
}: SessionManagerProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SurveySession | null>(null);
  const [instructorSubjects, setInstructorSubjects] = useState<Array<{instructor_id: string, subject_id: string}>>([]);

  // ▽ 사용자가 이름 입력을 직접 수정했는지 추적 (코스 선택 시 자동 채우기 제어)
  const [userEditedName, setUserEditedName] = useState(false);

  const [form, setForm] = useState({
    session_name: "",
    subject_id: "none" as string,
    instructor_id: "none" as string,
  });

  // instructor_subjects 데이터 가져오기 (instructor_lectures → subjects 경로)
  useEffect(() => {
    const fetchInstructorSubjects = async () => {
      try {
        // instructor_lectures → lectures → subjects 경로로 강사-과목 매핑 가져오기
        const { data, error } = await supabase
          .from('instructor_lectures')
          .select('instructor_id, lecture:lectures(subject_id)')
          .not('lecture', 'is', null);
        
        if (error) throw error;
        
        // subject_id로 매핑 변환
        const mappings = (data || [])
          .filter((item: any) => item.lecture?.subject_id)
          .map((item: any) => ({
            instructor_id: item.instructor_id,
            subject_id: item.lecture.subject_id
          }));
        
        // 중복 제거
        const uniqueMappings = Array.from(
          new Map(mappings.map(m => [`${m.instructor_id}_${m.subject_id}`, m])).values()
        );
        
        setInstructorSubjects(uniqueMappings);
      } catch (error) {
        console.error('Error fetching instructor subjects:', error);
      }
    };

    fetchInstructorSubjects();
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      setEditing(null);
      setForm({ session_name: "", subject_id: "none", instructor_id: "none" });
      setUserEditedName(false);
    }
  }, [dialogOpen]);

  const openAdd = () => {
    setEditing(null);
    setForm({ session_name: "", subject_id: "none", instructor_id: "none" });
    setUserEditedName(false);
    setDialogOpen(true);
  };

  const openEdit = (s: SurveySession) => {
    setEditing(s);
    setForm({
      session_name: s.session_name ?? "",
      subject_id: s.subject_id ?? "none",
      instructor_id: s.instructor_id ?? "none",
    });
    // 편집 진입 시엔 사용자가 이미 입력했다고 간주(자동 덮어쓰기 방지)
    setUserEditedName(true);
    setDialogOpen(true);
  };

  // ▽ 과목 변경 시: 사용자가 이름을 아직 직접 손대지 않았다면 자동으로 과목명 입력
  const handleSubjectChange = (value: string) => {
    setForm(prev => {
      const next = { ...prev, subject_id: value, instructor_id: "none" }; // 과목 변경 시 강사 초기화
      if (!userEditedName) {
        if (value === "none") {
          // 과목 관련 평가가 아닐 때: 이름은 비워 둔 상태 유지(사용자가 직접 입력)
          next.session_name = "";
        } else {
          const subjectTitle = subjects.find(s => s.id === value)?.title ?? "";
          next.session_name = subjectTitle;
        }
      }
      return next;
    });
  };

  // 선택된 과목에 연결된 강사들만 필터링
  const getFilteredInstructors = () => {
    if (form.subject_id === "none") {
      return instructors; // 과목 미선택시 모든 강사 표시
    }
    
    // instructor_subjects에서 선택된 과목과 연결된 강사 ID들 가져오기
    const connectedInstructorIds = instructorSubjects
      .filter(is => is.subject_id === form.subject_id)
      .map(is => is.instructor_id);
    
    // 연결된 강사 ID들에 해당하는 강사 정보만 반환
    return instructors.filter(instructor => connectedInstructorIds.includes(instructor.id));
  };

  const handleNameChange = (v: string) => {
    setUserEditedName(true);
    setForm(prev => ({ ...prev, session_name: v }));
  };

  const save = async () => {
    try {
      // 세션 이름 비어 있고 과목을 선택했다면 마지막 안전 자동채움
      let _name = form.session_name.trim();
      if (!_name && form.subject_id !== "none") {
        _name = subjects.find(s => s.id === form.subject_id)?.title ?? "";
      }
      if (!_name) {
        // 과목 미선택(공통 평가)인 경우에도 세션 이름은 필요: 운영평가/일반/공통 등으로 입력 요청
        toast({
          title: "세션 이름이 필요합니다",
          description: "과목을 선택하지 않는 경우에도 세션 이름(예: 운영평가/공통)을 입력해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        survey_id: surveyId,
        session_name: _name,
        subject_id: form.subject_id === "none" ? null : form.subject_id,
        instructor_id: form.instructor_id === "none" ? null : form.instructor_id,
      };

      if (editing) {
        const { error } = await supabase.from('survey_sessions').update(payload).eq('id', editing.id);
        if (error) throw error;

        const next = sessions.map(s => s.id === editing.id
          ? {
              ...s,
              ...payload,
              subject: payload.subject_id ? subjects.find(c => c.id === payload.subject_id) : undefined,
              instructor: payload.instructor_id ? instructors.find(i => i.id === payload.instructor_id) : undefined,
            }
          : s);
        onSessionsChange(next);
        toast({ title: "성공", description: "세션이 수정되었습니다." });
      } else {
        const { data, error } = await supabase
          .from('survey_sessions')
          .insert({ ...payload, session_order: sessions.length })
          .select(`
            *,
            instructor:instructors(id,name,email,photo_url,bio)
          `)
          .single();
        if (error) throw error;
        const subjectObj = payload.subject_id ? subjects.find(c => c.id === payload.subject_id) : undefined;
        onSessionsChange([...(sessions as any[]), { ...(data as any), subject: subjectObj }]);
        toast({ title: "성공", description: "세션이 추가되었습니다." });
      }
      setDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "오류", description: e.message || "세션 저장 중 오류", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('survey_sessions').delete().eq('id', id);
      if (error) throw error;
      const stay = sessions.filter(s => s.id !== id).map((s, idx) => ({ ...s, session_order: idx }));
      onSessionsChange(stay);
      await supabase.from('survey_sessions').upsert(stay.map(s => ({ 
        id: s.id, 
        session_order: s.session_order,
        survey_id: s.survey_id
      })));
      toast({ title: "성공", description: "세션이 삭제되었습니다." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "오류", description: e.message || "세션 삭제 중 오류", variant: "destructive" });
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= sessions.length) return;
    const arr = [...sessions];
    const [a, b] = [arr[idx], arr[to]];
    arr[idx] = { ...b, session_order: idx };
    arr[to] = { ...a, session_order: to };
    onSessionsChange(arr);
    await supabase.from('survey_sessions').upsert([
      { 
        id: arr[idx].id, 
        session_order: arr[idx].session_order,
        survey_id: arr[idx].survey_id
      },
      { 
        id: arr[to].id, 
        session_order: arr[to].session_order,
        survey_id: arr[to].survey_id
      },
    ]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">과목 세션 관리</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              세션 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "세션 수정" : "세션 추가"}</DialogTitle></DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">세션 이름 *</Label>
                <Input
                  id="session-name"
                  placeholder="예: 과목명(자동), 운영평가/공통 등"
                  value={form.session_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  과목을 선택하면 이름이 자동으로 과목명으로 채워집니다. 과목 관련 평가가 아니면 과목을 ‘선택 안함’으로 두고 이름만 입력하세요.
                </p>
              </div>

              <div className="space-y-2">
                <Label>과목</Label>
                <SearchableSelect
                  options={[
                    { value: 'none', label: '선택 안함' },
                    ...subjects.map(s => ({ value: s.id, label: s.title }))
                  ]}
                  value={form.subject_id}
                  onValueChange={handleSubjectChange}
                  placeholder="선택(옵션)"
                  searchPlaceholder="과목명 검색..."
                  emptyText="검색 결과가 없습니다."
                  onSearchChange={onSubjectSearchChange}
                />
              </div>

              <div className="space-y-2">
                <Label>강사</Label>
                <SearchableSelect
                  options={[
                    { value: 'none', label: '선택 안함' },
                    ...getFilteredInstructors().map(i => ({ value: i.id, label: i.name }))
                  ]}
                  value={form.instructor_id}
                  onValueChange={(v) => setForm(p => ({ ...p, instructor_id: v }))}
                  placeholder={form.subject_id === "none" ? "선택(옵션)" : "과목 연결 강사 선택"}
                  searchPlaceholder="강사명 검색..."
                  emptyText="검색 결과가 없습니다."
                  disabled={form.subject_id !== "none" && getFilteredInstructors().length === 0}
                />
                {form.subject_id !== "none" && getFilteredInstructors().length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    선택한 과목에 연결된 강사가 없습니다.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                <Button onClick={save}><Save className="w-4 h-4 mr-1" />{editing ? "수정" : "추가"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            아직 추가된 세션이 없습니다. “세션 추가”로 과목별 또는 공통(운영평가) 세션을 등록하세요.
          </div>
        ) : (
          sessions.map((s, idx) => {
            const subjectTitle =
              s.subject?.title ??
              (s.subject_id ? subjects.find(c => c.id === s.subject_id)?.title : "") ??
              "과목 미선택";
            const instructorName =
              s.instructor?.name ??
              (s.instructor_id ? instructors.find(i => i.id === s.instructor_id)?.name : "") ??
              "강사 미선택";
            return (
              <div key={s.id} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-center w-8 h-8 text-muted-foreground">#{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{s.session_name}</span>
                    <span className="text-xs text-muted-foreground">({s.session_order + 1}위치)</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    <span className="font-medium">{subjectTitle}</span>
                    <span className="mx-1">•</span>
                    <span className="inline-flex items-center gap-1"><User size={12} />{instructorName}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</Button>
                  <Button size="sm" variant="outline" onClick={() => move(idx, +1)} disabled={idx === sessions.length - 1}>↓</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Edit3 size={14} /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 size={14} /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>세션 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          '{s.session_name}' 세션을 삭제하시겠습니까?<br/>이 세션에 속한 질문들은 미분류로 이동됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(s.id)}>삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default SessionManager;
