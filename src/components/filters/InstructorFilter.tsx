import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Instructor {
  id: string;
  name: string;
}

interface InstructorFilterProps {
  value: string;
  onChange: (instructorId: string) => void;
  label?: string;
  includeAll?: boolean;
}

const InstructorFilter: React.FC<InstructorFilterProps> = ({
  value,
  onChange,
  label = '강사',
  includeAll = true,
}) => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadInstructors = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('instructors')
          .select('id, name')
          .order('name');

        if (error) throw error;

        setInstructors(data || []);
      } catch (error) {
        console.error('Failed to load instructors:', error);
        toast({
          title: '오류',
          description: '강사 목록을 불러오지 못했습니다. 네트워크 또는 권한 문제일 수 있어요.',
          variant: 'destructive',
        });
        setInstructors([]);
      } finally {
        setLoading(false);
      }
    };

    loadInstructors();
  }, [toast]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select 
        value={value || 'all'} 
        onValueChange={(newValue) => onChange(newValue === 'all' ? '' : newValue)} 
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? '로딩 중...' : '강사 선택'}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-md">
          {includeAll && (
            <SelectItem value="all">전체 강사</SelectItem>
          )}
          {instructors.map((instructor) => (
            <SelectItem key={instructor.id} value={instructor.id}>
              {instructor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default InstructorFilter;
