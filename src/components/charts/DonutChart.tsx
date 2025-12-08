import { ReactNode, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartErrorBoundary } from './ChartErrorBoundary';

interface DonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  innerRadius?: number;
  outerRadius?: number;
  emptyState?: ReactNode;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-purple-light))',
  'hsl(var(--chart-purple-dark))'
];

export const DonutChart = ({
  data,
  title,
  innerRadius = 60,
  outerRadius = 100,
  emptyState
}: DonutChartProps) => {
  const dataWithColors = useMemo(
    () => {
      if (!data || !Array.isArray(data)) return [];
      
      return data
        .map((item, index) => {
          const value = typeof item.value === 'number' ? item.value : 0;
          return {
            name: String(item.name ?? '-'),
            value: Number.isFinite(value) && !Number.isNaN(value) && value >= 0 ? value : 0,
            color: item.color || COLORS[index % COLORS.length]
          };
        })
        .filter((d) => Number.isFinite(d.value) && !Number.isNaN(d.value) && d.value > 0);
    },
    [data]
  );

  const hasData = useMemo(
    () => dataWithColors.length > 0 && dataWithColors.some(item => item.value > 0),
    [dataWithColors]
  );

  const renderLabel = ({ cx, cy, midAngle, innerRadius: inner, outerRadius: outer, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = inner + (outer - inner) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent > 0.05) {
      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          className="text-[10px] sm:text-xs"
          fontWeight="bold"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full">
      {title && (
        <h3 className="mb-2 sm:mb-4 text-center text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      )}

      {hasData ? (
        <ChartErrorBoundary fallbackDescription="유효하지 않은 값이 포함되어 차트를 표시할 수 없습니다.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={outerRadius}
                innerRadius={innerRadius}
                fill="#8884d8"
                dataKey="value"
                stroke="white"
                strokeWidth={2}
                cornerRadius={3}
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                  fontSize: '11px'
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  color: 'hsl(var(--foreground))'
                }}
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      ) : (
        <div className="flex h-64 w-full items-center justify-center">
          {emptyState ?? (
            <ChartEmptyState description="데이터가 없어 원형 차트를 표시할 수 없습니다. 다른 조건을 선택하거나 데이터를 수집한 후 다시 확인해 주세요." />
          )}
        </div>
      )}
    </div>
  );
};
