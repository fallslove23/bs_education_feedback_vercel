import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface YearFilterProps {
  value: number | null;
  onChange: (year: number | null) => void;
  label?: string;
  includeAll?: boolean;
  yearRange?: number; // How many years back to show
}

const YearFilter: React.FC<YearFilterProps> = ({
  value,
  onChange,
  label = '연도',
  includeAll = false,
  yearRange = 5,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearRange }, (_, i) => currentYear - i);

  const handleChange = (yearString: string) => {
    if (yearString === 'all') {
      onChange(null);
    } else {
      onChange(parseInt(yearString));
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select
        value={value?.toString() || (includeAll ? 'all' : '')}
        onValueChange={handleChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="연도 선택" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-md">
          {includeAll && (
            <SelectItem value="all">전체 연도</SelectItem>
          )}
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}년
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default YearFilter;
