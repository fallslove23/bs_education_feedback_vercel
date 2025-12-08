import { ReactNode, useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ChartEmptyState } from './ChartEmptyState';
import { DataProcessingErrorBoundary } from '@/components/error-boundaries';
import { useIsMobile } from '@/hooks/use-mobile';

interface AreaChartProps {
  data: Array<{
    name: string;
    [key: string]: string | number;
  }>;
  dataKeys: Array<{
    key: string;
    label: string;
    color?: string;
  }>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  stacked?: boolean;
  emptyState?: ReactNode;
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-purple-light))'
];

export const AreaChart = ({
  data,
  dataKeys,
  title,
  xAxisLabel,
  yAxisLabel,
  stacked = false,
  emptyState
}: AreaChartProps) => {
  const isMobile = useIsMobile();
  
  const hasData = useMemo(() => {
    if (!data || data.length === 0) return false;

    return dataKeys.some(item =>
      data.some(row => {
        const value = row[item.key];
        return typeof value === 'number' && !isNaN(value) && value !== 0;
      })
    );
  }, [data, dataKeys]);

  // Sanitize dataset to prevent NaN from reaching Recharts scales
  const safeData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [] as Array<Record<string, string | number>>;
    return data
      .map((row) => {
        const next: Record<string, string | number> = { ...row };
        // Ensure categorical x value is a string
        const nameVal = (row as any)?.name;
        next.name = typeof nameVal === 'string' ? nameVal : String(nameVal ?? '-');
        
        // Force numeric series to finite numbers with comprehensive NaN checking
        dataKeys.forEach(({ key }) => {
          const v = next[key];
          if (typeof v === 'number') {
            // Triple check for NaN and infinite values
            if (Number.isFinite(v) && !Number.isNaN(v)) {
              next[key] = v;
            } else {
              next[key] = 0;
            }
          } else {
            // Try to parse if string, otherwise default to 0
            const parsed = typeof v === 'string' ? parseFloat(v) : 0;
            next[key] = Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : 0;
          }
        });
        return next;
      })
      .filter((row) => {
        // Only include rows where at least one data key has a valid value > 0
        return dataKeys.some(({ key }) => {
          const val = row[key];
          return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val) && val > 0;
        });
      });
  }, [data, dataKeys]);


  return (
    <div className="h-full w-full">
      {title && (
        <h3 className="mb-2 sm:mb-4 text-center text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      )}
      {hasData ? (
        <DataProcessingErrorBoundary dataSource="Area Chart" fallbackData={[]}>
          <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={safeData}
            margin={{
              top: isMobile ? 5 : 10,
              right: isMobile ? 5 : 10,
              left: isMobile ? -15 : 0,
              bottom: isMobile ? 5 : 5
            }}
          >
            <defs>
              {dataKeys.map((item, index) => (
                <linearGradient key={`gradient${index}`} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="100%"
                    stopColor={item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-1) / 0.2)" strokeWidth={1} />
            <XAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: isMobile ? 9 : 10, fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
              label={
                xAxisLabel && !isMobile
                  ? {
                      value: xAxisLabel,
                      position: 'insideBottom',
                      offset: -5,
                      style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                    }
                  : undefined
              }
            />
            <YAxis
              type="number"
              domain={[0, 'dataMax + 1']}
              tick={{ fontSize: isMobile ? 9 : 10, fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              width={isMobile ? 35 : 60}
              label={
                yAxisLabel && !isMobile
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--card-foreground))',
                fontSize: isMobile ? '10px' : '11px'
              }}
            />
            {!isMobile && (
              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  color: 'hsl(var(--foreground))'
                }}
                iconSize={10}
              />
            )}
            {dataKeys.map((item, index) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stackId={stacked ? '1' : undefined}
                stroke={item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fill={`url(#gradient${index})`}
                fillOpacity={0.8}
                strokeWidth={isMobile ? 2 : 3}
                name={item.label}
                dot={{ r: isMobile ? 3 : 4, strokeWidth: 2, stroke: 'white' }}
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
        </DataProcessingErrorBoundary>
      ) : (
        <div className="flex h-64 w-full items-center justify-center">
          {emptyState ?? (
            <ChartEmptyState description="데이터가 없어 영역 차트를 표시할 수 없습니다. 조건을 변경하거나 데이터를 수집한 후 다시 시도하세요." />
          )}
        </div>
      )}
    </div>
  );
};
