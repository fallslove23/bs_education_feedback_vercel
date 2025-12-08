import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Search } from "lucide-react";

interface CourseItem {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

interface CourseNameManagerProps {
  selectedCourse: string;
  onCourseSelect: (courseName: string) => void;
}

export default function CourseNameManager({ selectedCourse, onCourseSelect }: CourseNameManagerProps) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  
  const [form, setForm] = useState({
    title: "",
    description: ""
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('courses')
        .select('id, title, description, created_at')
        .order('title');

      if (error) throw error;
      setCourses((data as CourseItem[]) || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast({
        title: "오류",
        description: "과정명 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      toast({
        title: "오류",
        description: "과정명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (editingCourse) {
        const { error } = await (supabase as any)
          .from('courses')
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast({ title: "성공", description: "과정명이 수정되었습니다." });
      } else {
        const { error } = await (supabase as any)
          .from('courses')
          .insert([{ title: form.title.trim(), description: form.description.trim() || null }]);

        if (error) throw error;
        toast({ title: "성공", description: "과정명이 추가되었습니다." });
      }

      setForm({ title: "", description: "" });
      setEditingCourse(null);
      setIsDialogOpen(false);
      fetchCourses();
    } catch (error: any) {
      console.error('Error saving course name:', error);
      toast({
        title: "오류",
        description: error.message || "과정명 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course: CourseItem) => {
    setEditingCourse(course);
    setForm({ title: course.title, description: course.description || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 과정명을 삭제하시겠습니까? 관련된 세션/데이터에 영향을 줄 수 있습니다.")) return;

    try {
      const { error } = await (supabase as any)
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "성공", description: "과정명이 삭제되었습니다." });
      fetchCourses();
    } catch (error: any) {
      console.error('Error deleting course name:', error);
      toast({
        title: "오류",
        description: error.message || "과정명 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleNewCourse = () => {
    setEditingCourse(null);
    setForm({ title: "", description: "" });
    setIsDialogOpen(true);
  };

  // Filter courses based on search query
  const filteredCourses = courses.filter(course => {
    const searchLower = courseSearchQuery.toLowerCase();
    return course.title.toLowerCase().includes(searchLower) ||
           (course.description && course.description.toLowerCase().includes(searchLower));
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>과정 (프로그램)</Label>
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="과정명으로 검색..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCourse || undefined as unknown as string}
              onValueChange={onCourseSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="과정을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {filteredCourses.map((course) => (
                  <SelectItem key={course.id} value={course.title}>
                    {course.title}
                  </SelectItem>
                ))}
                {filteredCourses.length === 0 && courseSearchQuery && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    검색 결과가 없습니다.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleNewCourse}>
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCourse ? "과정명 수정" : "새 과정명 추가"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>과정명</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="예: BS Advanced, 웹개발 기초 등"
                  />
                </div>
                <div>
                  <Label>설명 (선택사항)</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="과정에 대한 간단한 설명"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 과정명 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">등록된 과정명</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium text-sm">{course.title}</div>
                  {course.description && (
                    <div className="text-xs text-muted-foreground">{course.description}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(course)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(course.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 과정명이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
