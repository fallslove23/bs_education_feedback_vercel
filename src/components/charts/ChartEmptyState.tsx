import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartEmptyStateProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string; // Added className prop
}

export const ChartEmptyState = ({
  title = 'No data',
  description = '표시할 데이터가 없습니다.',
  actions,
  className
}: ChartEmptyStateProps) => {
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-3 py-10 text-center", className)}>
      <div className="rounded-full border border-dashed border-border/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {actions && <div className="text-sm text-muted-foreground">{actions}</div>}
    </div>
  );
};
