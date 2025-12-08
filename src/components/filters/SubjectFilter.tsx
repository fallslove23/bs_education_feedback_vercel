import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { fetchSubjectOptions, SubjectOption } from '@/repositories/filterOptionsRepository';
import { useToast } from '@/hooks/use-toast';

interface SubjectFilterProps {
  value: string;
  onChange: (subjectId: string) => void;
  sessionId: string;  // Changed from courseId - now refers to program session
  label?: string;
  includeAll?: boolean;
  searchTerm?: string;
  disabled?: boolean;
}

const SubjectFilter: React.FC<SubjectFilterProps> = ({
  value,
  onChange,
  sessionId,  // Changed from courseId
  label = '과목',
  includeAll = true,
  searchTerm = null,
  disabled = false,
}) => {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset subjects when session changes or is empty
    if (!sessionId) {
      setSubjects([]);
      return;
    }

    const loadSubjects = async () => {
      setLoading(true);
      try {
        const data = await fetchSubjectOptions({ sessionId, search: searchTerm });
        setSubjects(data);
      } catch (error) {
        console.error('Failed to load subjects:', error);
        toast({
          title: '오류',
          description: '과목 목록을 불러오지 못했습니다. 네트워크 또는 권한 문제일 수 있어요.',
          variant: 'destructive',
        });
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, [sessionId, searchTerm, toast]);

  const isDisabled = disabled || !sessionId || loading;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select 
        value={value || 'all'} 
        onValueChange={(newValue) => onChange(newValue === 'all' ? '' : newValue)} 
        disabled={isDisabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? '로딩 중...' : !sessionId ? '먼저 과정을 선택하세요' : '과목 선택'}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-md">
          {includeAll && (
            <SelectItem value="all">전체 과목</SelectItem>
          )}
          {subjects.map((subject) => (
            <SelectItem key={subject.subject_id} value={subject.subject_id}>
              {subject.subject_title}
              {subject.subject_position !== null && ` (${subject.subject_position})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SubjectFilter;
