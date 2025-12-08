import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, BookOpen, Trash2, Users, Grid3X3, List, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Subject {
  id: string;
  title: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
}

interface Lecture {
  id: string;
  subject_id: string;
  title: string;
}

interface InstructorLecture {
  id: string;
  instructor_id: string;
  lecture_id: string;
}

const CourseManagement = () => {
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorLectures, setInstructorLectures] = useState<InstructorLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [formData, setFormData] = useState({
    title: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsRes, lecturesRes, instructorsRes, instructorLecturesRes] = await Promise.all([
        (supabase as any).from('subjects').select('*').order('title'),
        (supabase as any).from('lectures').select('*'),
        supabase.from('instructors').select('id, name, email').order('name'),
        (supabase as any).from('instructor_lectures').select('*')
      ]);

      if (subjectsRes.error) {
        console.error('Error fetching subjects:', subjectsRes.error);
        throw subjectsRes.error;
      }
      if (lecturesRes.error) {
        console.error('Error fetching lectures:', lecturesRes.error);
      }
      if (instructorsRes.error) throw instructorsRes.error;
      if (instructorLecturesRes.error) {
        console.error('Error fetching instructor_lectures:', instructorLecturesRes.error);
      }

      const fetchedSubjects = subjectsRes.data || [];
      const fetchedLectures = lecturesRes.data || [];

      // 강의가 없는 과목 찾기 및 자동 생성
      const subjectsWithoutLectures = fetchedSubjects.filter((subject: Subject) => 
        !fetchedLectures.some((lecture: Lecture) => lecture.subject_id === subject.id)
      );

      if (subjectsWithoutLectures.length > 0) {
        console.log('강의가 없는 과목 발견:', subjectsWithoutLectures.map((s: Subject) => s.title));
        
        // 각 과목에 대해 기본 강의 생성
        const newLectures = subjectsWithoutLectures.map((subject: Subject) => ({
          subject_id: subject.id,
          title: subject.title,
          position: 1
        }));

        const { data: createdLectures, error: createError } = await (supabase as any)
          .from('lectures')
          .insert(newLectures)
          .select();

        if (createError) {
          console.error('기본 강의 생성 실패:', createError);
        } else {
          console.log('기본 강의 생성 완료:', createdLectures);
          // 생성된 강의를 fetchedLectures에 추가
          fetchedLectures.push(...(createdLectures || []));
          
          toast({
            title: "알림",
            description: `${subjectsWithoutLectures.length}개 과목에 기본 강의가 자동 생성되었습니다.`,
          });
        }
      }

      setSubjects(fetchedSubjects);
      setLectures(fetchedLectures);
      setInstructors(instructorsRes.data || []);
      setInstructorLectures(instructorLecturesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSubject) {
        // Update existing subject
        const { error: subjectError } = await (supabase as any)
          .from('subjects')
          .update(formData)
          .eq('id', editingSubject.id);

        if (subjectError) throw subjectError;
        
        // 과목 수정 시 해당 과목의 강의 제목도 자동 업데이트
        const { error: lectureError } = await (supabase as any)
          .from('lectures')
          .update({ title: formData.title })
          .eq('subject_id', editingSubject.id);
        
        if (lectureError) {
          console.error('Error updating lecture titles:', lectureError);
          // 강의 제목 업데이트 실패해도 과목은 수정되었으므로 계속 진행
        }
        
        toast({
          title: "성공",
          description: "과목 및 강의 정보가 수정되었습니다."
        });
      } else {
        // Create new subject
        const { data: newSubject, error: subjectError } = await (supabase as any)
          .from('subjects')
          .insert([formData])
          .select()
          .single();

        if (subjectError) throw subjectError;
        
        // 과목 추가 시 자동으로 기본 강의 생성
        if (newSubject) {
          const { error: lectureError } = await (supabase as any)
            .from('lectures')
            .insert([{
              subject_id: newSubject.id,
              title: formData.title,
              position: 1
            }]);
          
          if (lectureError) {
            console.error('Error creating default lecture:', lectureError);
            // 강의 생성 실패해도 과목은 생성되었으므로 계속 진행
          }
        }
        
        toast({
          title: "성공",
          description: "새 과목과 기본 강의가 추가되었습니다."
        });
      }

      setIsDialogOpen(false);
      setEditingSubject(null);
      setFormData({ title: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        title: "오류",
        description: "과목 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      title: subject.title
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingSubject(null);
    setFormData({ title: '' });
    setIsDialogOpen(true);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      // 1. 해당 과목의 강의 ID 조회
      const subjectLectures = lectures.filter(l => l.subject_id === subjectId);
      const lectureIds = subjectLectures.map(l => l.id);
      
      // 2. 강사-강의 매핑 삭제 (FK constraint)
      if (lectureIds.length > 0) {
        const { error: instructorLecturesError } = await (supabase as any)
          .from('instructor_lectures')
          .delete()
          .in('lecture_id', lectureIds);
        
        if (instructorLecturesError) {
          console.error('Error deleting instructor_lectures:', instructorLecturesError);
        }
      }
      
      // 3. 강의 삭제
      const { error: lecturesError } = await (supabase as any)
        .from('lectures')
        .delete()
        .eq('subject_id', subjectId);
      
      if (lecturesError) {
        console.error('Error deleting lectures:', lecturesError);
      }
      
      // 4. subject_canonical_map 삭제
      const { error: mapError } = await (supabase as any)
        .from('subject_canonical_map')
        .delete()
        .eq('subject_id', subjectId);

      if (mapError) {
        console.error('Error deleting subject_canonical_map:', mapError);
      }

      // 5. 과목 삭제
      const { error: deleteError } = await (supabase as any)
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (deleteError) {
        console.error('Error deleting subject:', deleteError);
        throw new Error(deleteError.message || '과목 삭제에 실패했습니다.');
      }

      // Update local state immediately
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      
      toast({
        title: "성공",
        description: "과목과 관련 강의가 모두 삭제되었습니다."
      });
      
      // Refresh all data to ensure consistency
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast({
        title: "오류",
        description: error.message || "과목 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const getSubjectInstructors = (subjectId: string) => {
    // Get lectures for this subject
    const subjectLectures = lectures.filter(l => l.subject_id === subjectId);
    const lectureIds = subjectLectures.map(l => l.id);
    
    // Get instructor IDs teaching these lectures
    const instructorIds = new Set(
      instructorLectures
        .filter(il => lectureIds.includes(il.lecture_id))
        .map(il => il.instructor_id)
    );
    
    return instructors.filter(instructor => instructorIds.has(instructor.id));
  };

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(subject => {
    const searchLower = searchQuery.toLowerCase();
    const subjectInstructors = getSubjectInstructors(subject.id);
    const instructorNames = subjectInstructors.map(instructor => instructor.name.toLowerCase()).join(' ');
    
    return subject.title.toLowerCase().includes(searchLower) ||
           instructorNames.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">과목 목록</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">과목 정보를 관리하고 강사를 배정하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddDialog} className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none text-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">새 과목 추가</span>
            <span className="sm:hidden">추가</span>
          </Button>
          
          {/* View Toggle */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewType === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('card')}
              className="h-8 px-2 sm:px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
              className="h-8 px-2 sm:px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="과목명, 배정강사로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">총 과목 수</p>
                <p className="text-xl sm:text-2xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">배정된 강사 수</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {new Set(instructorLectures.map(il => il.instructor_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects Grid/List */}
      {viewType === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredSubjects.map((subject) => {
            const subjectInstructors = getSubjectInstructors(subject.id);
            const subjectLectures = lectures.filter(l => l.subject_id === subject.id);
            
            return (
              <Card key={subject.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{subject.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {subjectLectures.length}개 강의
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-4">
                  {/* Assigned Instructors */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      배정된 강사 ({subjectInstructors.length}명)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {subjectInstructors.length > 0 ? (
                        subjectInstructors.map((instructor) => (
                          <Badge key={instructor.id} variant="secondary" className="text-xs">
                            {instructor.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          배정된 강사 없음
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(subject)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      수정
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>과목 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            정말로 "{subject.title}" 과목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">과목명</th>
                    <th className="text-left p-4 font-medium">강의 수</th>
                    <th className="text-left p-4 font-medium">배정된 강사</th>
                    <th className="text-left p-4 font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((subject) => {
                    const subjectInstructors = getSubjectInstructors(subject.id);
                    const subjectLectures = lectures.filter(l => l.subject_id === subject.id);
                    
                    return (
                      <tr key={subject.id} className="border-b">
                        <td className="p-4">
                          <p className="font-medium">{subject.title}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {subjectLectures.length}개
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {subjectInstructors.length > 0 ? (
                              subjectInstructors.map((instructor) => (
                                <Badge key={instructor.id} variant="secondary" className="text-xs">
                                  {instructor.name}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                배정된 강사 없음
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(subject)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>과목 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    정말로 "{subject.title}" 과목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSubject(subject.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Subject Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? '과목 수정' : '새 과목 추가'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">과목명</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="과목명을 입력하세요"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                취소
              </Button>
              <Button type="submit" className="flex-1">
                {editingSubject ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseManagement;
