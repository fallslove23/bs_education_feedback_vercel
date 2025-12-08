import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type SurveyEditable = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  education_year: number;
  education_round: number;
  education_day: number | null;
  course_id: string | null;
  course_name: string | null;
  instructor_id: string | null;
  expected_participants: number | null;
  is_combined: boolean | null;
  combined_round_start: number | null;
  combined_round_end: number | null;
  round_label: string | null;
  is_test: boolean | null;
};

interface SurveyInfoEditDialogProps {
  survey: SurveyEditable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SurveyInfoEditDialog({ survey, open, onOpenChange }: SurveyInfoEditDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description || '');
    }
  }, [survey]);

  const handleSave = async () => {
    if (!survey) return;

    try {
      const { error } = await supabase
        .from('surveys')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id);

      if (error) throw error;

      toast({
        title: "성공",
        description: "설문 정보가 수정되었습니다.",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating survey:', error);
      toast({
        title: "오류",
        description: error.message || "설문 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">설문 정보 수정</DialogTitle>
        </DialogHeader>

        {survey && (
          <div className="space-y-4">
            <div>
              <Label>제목</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="설문 제목"
              />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="설문 설명"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>
                저장
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}