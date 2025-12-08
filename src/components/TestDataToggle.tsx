import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TestDataOptions } from '@/hooks/useTestDataToggle';

interface TestDataToggleProps {
  testDataOptions?: TestDataOptions; // Make it optional to handle undefined case
  className?: string;
}

export function TestDataToggle({ testDataOptions, className }: TestDataToggleProps) {
  // Add null check to prevent destructuring error
  if (!testDataOptions) {
    return null;
  }
  
  const { includeTestData, setIncludeTestData, canToggleTestData } = testDataOptions;

  if (!canToggleTestData) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      <Switch
        id="include-test-data"
        checked={includeTestData}
        onCheckedChange={setIncludeTestData}
      />
      <div>
        <Label htmlFor="include-test-data" className="text-sm font-medium cursor-pointer">
          테스트 데이터 포함
        </Label>
        <p className="text-xs text-muted-foreground">
          테스트 설문 데이터도 통계에 포함합니다
        </p>
      </div>
    </div>
  );
}