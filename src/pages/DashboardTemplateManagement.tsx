import React from 'react';
import { DashboardLayout } from '@/components/layouts';
import { FileText, Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Template {
  id: string;
  name: string;
  description?: string;
  is_course_evaluation: boolean;
  created_at: string;
  updated_at: string;
}

const DashboardTemplateManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('survey_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "오류",
        description: "템플릿을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = () => {
    navigate('/template-builder/new');
  };

  const handleEditTemplate = (templateId: string) => {
    navigate(`/template-builder/${templateId}`);
  };

  const handleCopyTemplate = async (template: Template) => {
    try {
      const { data, error } = await supabase
        .from('survey_templates')
        .insert({
          name: `${template.name} (복사본)`,
          description: template.description,
          is_course_evaluation: template.is_course_evaluation
        })
        .select()
        .single();

      if (error) throw error;

      // 템플릿 질문도 복사
      const { data: questions, error: questionsError } = await supabase
        .from('template_questions')
        .select('*')
        .eq('template_id', template.id);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          template_id: data.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          is_required: q.is_required,
          order_index: q.order_index
        }));

        const { error: insertError } = await supabase
          .from('template_questions')
          .insert(newQuestions);

        if (insertError) throw insertError;
      }

      toast({
        title: "성공",
        description: "템플릿이 복사되었습니다.",
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error copying template:', error);
      toast({
        title: "오류",
        description: "템플릿 복사 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (template: Template) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    const templateId = templateToDelete.id;
    try {
      // 먼저 템플릿 질문들을 삭제
      const { error: questionsError } = await supabase
        .from('template_questions')
        .delete()
        .eq('template_id', templateId);

      if (questionsError) throw questionsError;

      // 템플릿 섹션들도 삭제
      const { error: sectionsError } = await supabase
        .from('template_sections')
        .delete()
        .eq('template_id', templateId);

      if (sectionsError) throw sectionsError;

      // 마지막으로 템플릿 삭제
      const { error } = await supabase
        .from('survey_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "성공",
        description: "템플릿이 삭제되었습니다."
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "오류",
        description: "템플릿 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setTemplateToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const actions = (
    <Button onClick={handleCreateTemplate} size="sm">
      <Plus className="h-4 w-4 mr-2" />
      새 템플릿
    </Button>
  );

  return (
    <DashboardLayout
      title="템플릿 관리"
      subtitle="설문 템플릿 생성 및 관리"
      icon={<FileText className="h-5 w-5 text-white" />}
      actions={actions}
      loading={loading}
      totalCount={templates.length}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={template.is_course_evaluation ? "default" : "secondary"}>
                    {template.is_course_evaluation ? "강사 평가" : "일반"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {new Date(template.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyTemplate(template)}
                      title="템플릿 복사"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditTemplate(template.id)}
                      title="템플릿 편집"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDeleteDialog(template)}
                      title="템플릿 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              템플릿이 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              새로운 설문 템플릿을 생성하여 시작하세요.
            </p>
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              첫 번째 템플릿 만들기
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="템플릿 삭제"
        description={`"${templateToDelete?.name}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 템플릿과 관련된 모든 질문이 삭제됩니다.`}
        primaryAction={{
          label: "삭제",
          onClick: handleDeleteTemplate,
          variant: "destructive"
        }}
        secondaryAction={{
          label: "취소"
        }}
      />
    </DashboardLayout>
  );
};

export default DashboardTemplateManagement;
