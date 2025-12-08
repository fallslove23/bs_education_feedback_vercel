import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { fetchCourseOptions, CourseOption } from '@/repositories/filterOptionsRepository';
import { useToast } from '@/hooks/use-toast';

interface CourseFilterProps {
  value: string;  // session_id UUID
  onChange: (sessionId: string, label?: string) => void;
  year?: number | null;
  label?: string;
  includeAll?: boolean;
  searchTerm?: string;
}

const CourseFilter: React.FC<CourseFilterProps> = ({
  value,
  onChange,
  year,
  label = '과정',
  includeAll = true,
  searchTerm = null,
}) => {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadCourses = async () => {
      if (!year) {
        setCourses([]);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchCourseOptions({ year, search: searchTerm });
        setCourses(data);
      } catch (error) {
        console.error('Failed to load courses:', error);
        toast({
          title: '오류',
          description: '과정 목록을 불러오지 못했습니다. 네트워크 또는 권한 문제일 수 있어요.',
          variant: 'destructive',
        });
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [year, searchTerm, toast]);

  // Display options from fetched courses (session-based with "연도+차수+과정명" format)
  const displayOptions = courses.map(c => ({ value: c.value, label: c.label }));

  // Determine the current display label
  const currentLabel = value ? 
    (displayOptions.find(opt => opt.value === value)?.label || '과정 선택') : 
    (includeAll ? '전체 과정' : '과정 선택');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select 
        value={value || 'all'} 
        onValueChange={(newValue) => {
          const actualValue = newValue === 'all' ? '' : newValue;
          const selectedOption = displayOptions.find(opt => opt.value === actualValue);
          onChange(actualValue, selectedOption?.label || (newValue === 'all' ? '전체 과정' : undefined));
        }} 
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? '로딩 중...' : currentLabel}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                로딩 중...
              </>
            ) : (
              currentLabel
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-md">
          {includeAll && (
            <SelectItem value="all">전체 과정</SelectItem>
          )}
          {displayOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CourseFilter;
