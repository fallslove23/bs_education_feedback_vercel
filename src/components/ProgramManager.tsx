import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Program {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface ProgramManagerProps {
  selectedProgram: string;
  onProgramSelect: (programName: string) => void;
}

export default function ProgramManager({ selectedProgram, onProgramSelect }: ProgramManagerProps) {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, description, created_at')
        .order('name');

      if (error) throw error;
      setPrograms((data as Program[]) || []);
    } catch (error: any) {
      console.error('Error fetching programs:', error);
      toast({
        title: "오류",
        description: "과정 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast({
        title: "오류",
        description: "과정명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (editingProgram) {
        const { error } = await supabase
          .from('programs')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null
          })
          .eq('id', editingProgram.id);

        if (error) throw error;
        toast({ title: "성공", description: "과정이 수정되었습니다." });
      } else {
        const { error } = await supabase
          .from('programs')
          .insert([{ name: form.name.trim(), description: form.description.trim() || null }]);

        if (error) throw error;
        toast({ title: "성공", description: "과정이 추가되었습니다." });
      }

      setForm({ name: "", description: "" });
      setEditingProgram(null);
      setIsDialogOpen(false);
      fetchPrograms();
    } catch (error: any) {
      console.error('Error saving program:', error);
      toast({
        title: "오류",
        description: error.message || "과정 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setForm({ name: program.name, description: program.description || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 과정을 삭제하시겠습니까?\n\n주의: 이 과정과 연결된 모든 세션(회차) 데이터가 영구적으로 삭제됩니다.\n삭제 후에는 복구할 수 없습니다.")) return;

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "성공", description: "과정이 삭제되었습니다." });
      fetchPrograms();
    } catch (error: any) {
      console.error('Error deleting program:', error);
      toast({
        title: "오류",
        description: error.message || "과정 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleNewProgram = () => {
    setEditingProgram(null);
    setForm({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>과정 (프로그램)</Label>
        <div className="flex gap-2">
          <SearchableSelect
            options={programs.map((program) => ({ value: program.name, label: program.name }))}
            value={selectedProgram || ""}
            onValueChange={onProgramSelect}
            placeholder="과정을 선택하세요"
            searchPlaceholder="과정명 검색..."
            emptyText="검색 결과가 없습니다."
            className="flex-1"
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleNewProgram}>
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border z-50">
              <DialogHeader>
                <DialogTitle>
                  {editingProgram ? "과정 수정" : "새 과정 추가"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>과정명</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: BS Advanced, SS Basic, 웹개발 등"
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

      {/* 과정 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">등록된 과정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {programs.map((program) => (
              <div key={program.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium text-sm">{program.name}</div>
                  {program.description && (
                    <div className="text-xs text-muted-foreground">{program.description}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(program)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(program.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {programs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 과정이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}