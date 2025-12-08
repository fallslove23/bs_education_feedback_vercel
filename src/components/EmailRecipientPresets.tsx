import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, Save, Trash2 } from 'lucide-react';

interface RecipientPreset {
  id: string;
  preset_name: string;
  recipients: string[];
  description?: string;
  is_default: boolean;
}

interface EmailRecipientPresetsProps {
  onLoadPreset: (recipients: string[]) => void;
  currentRecipients: string[];
}

export const EmailRecipientPresets = ({ onLoadPreset, currentRecipients }: EmailRecipientPresetsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [presets, setPresets] = useState<RecipientPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchPresets();
    }
  }, [user]);

  const fetchPresets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('email_recipient_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets((data || []).map(item => ({
        ...item,
        recipients: Array.isArray(item.recipients) ? item.recipients as string[] : []
      })));
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  };

  const savePreset = async () => {
    if (!user || !presetName.trim()) return;

    try {
      const { error } = await supabase
        .from('email_recipient_presets')
        .insert({
          user_id: user.id,
          preset_name: presetName.trim(),
          recipients: currentRecipients,
          description: description.trim() || null,
          is_default: false
        });

      if (error) throw error;

      toast({
        title: "성공",
        description: "수신자 프리셋이 저장되었습니다."
      });

      setPresetName('');
      setDescription('');
      setSaveDialogOpen(false);
      fetchPresets();
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message.includes('duplicate') 
          ? "같은 이름의 프리셋이 이미 존재합니다."
          : "프리셋 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      onLoadPreset(preset.recipients);
      toast({
        title: "성공",
        description: `"${preset.preset_name}" 수신자 프리셋이 적용되었습니다.`
      });
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!confirm('이 수신자 프리셋을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('email_recipient_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      toast({
        title: "성공",
        description: "수신자 프리셋이 삭제되었습니다."
      });

      fetchPresets();
      if (selectedPreset === presetId) {
        setSelectedPreset('');
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "프리셋 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 기본 프리셋들
  const defaultPresets = [
    {
      id: 'admin-only',
      name: '관리자만',
      recipients: ['admin'],
      description: '관리자에게만 전송'
    },
    {
      id: 'admin-instructor',
      name: '관리자 + 강사',
      recipients: ['admin', 'instructor'],
      description: '관리자와 해당 강사에게 전송'
    },
    {
      id: 'all-staff',
      name: '전체 운영진',
      recipients: ['admin', 'operator', 'director'],
      description: '관리자, 운영자, 감독자에게 전송'
    },
    {
      id: 'all-roles',
      name: '모든 관련자',
      recipients: ['admin', 'operator', 'director', 'instructor'],
      description: '모든 역할의 관련자에게 전송'
    }
  ];

  return (
    <div className="space-y-3">
      {/* 기본 프리셋 버튼들 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">빠른 선택</Label>
        <div className="grid grid-cols-2 gap-2">
          {defaultPresets.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => onLoadPreset(preset.recipients)}
              className="justify-start text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 저장된 프리셋 */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">저장된 프리셋</Label>
          <div className="flex items-center gap-2">
            <Select value={selectedPreset} onValueChange={(value) => {
              setSelectedPreset(value);
              if (value) loadPreset(value);
            }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="저장된 수신자 선택" />
              </SelectTrigger>
              <SelectContent>
                {presets.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <div>
                        <div className="font-medium">{preset.preset_name}</div>
                        {preset.description && (
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          수신자 {preset.recipients.length}명
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPreset && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deletePreset(selectedPreset)}
                className="p-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 현재 설정 저장 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            현재 수신자 설정 저장
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수신자 프리셋 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="preset-name">프리셋 이름</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="예: 특정 강사팀 전송"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 프리셋에 대한 설명을 입력하세요"
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              현재 선택된 수신자: {currentRecipients.length}명
              <div className="mt-1 text-xs">
                {currentRecipients.join(', ') || '없음'}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={savePreset} disabled={!presetName.trim()}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};