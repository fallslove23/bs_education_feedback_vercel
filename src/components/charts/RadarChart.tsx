import { ReactNode, useMemo } from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { ChartEmptyState } from './ChartEmptyState';

interface RadarChartProps {
  data: Array<{
    subject: string;
    value: number;
    fullMark?: number;
  }>;
  title?: string;
  colors?: {
    fill?: string;
    stroke?: string;
  };
  emptyState?: ReactNode;
}

export const RadarChart = ({
  data,
  title,
  colors = {
    fill: 'hsl(var(--chart-1) / 0.3)',
    stroke: 'hsl(var(--chart-1))'
  },
  emptyState
}: RadarChartProps) => {
  const hasData = useMemo(
    () => data && data.length > 0 && data.some(item => Number.isFinite(item.value) && item.value !== 0),
    [data]
  );

  return (
    <div className="h-full w-full">
      {title && (
        <h3 className="mb-2 sm:mb-4 text-center text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      )}

      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="hsl(var(--chart-1) / 0.2)" strokeWidth={1} radialLines />
            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fontSize: 10,
                fill: 'hsl(var(--foreground))',
                fontWeight: 500
              }}
              tickLine={false}
              axisLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={{
                fontSize: 9,
                fill: 'hsl(var(--muted-foreground))',
                fontWeight: 400
              }}
              tickLine={false}
              axisLine={false}
            />
            <Radar
              name="점수"
              dataKey="value"
              stroke={colors.stroke}
              fill={colors.fill}
              fillOpacity={0.4}
              strokeWidth={2}
              dot={{ r: 3, fill: colors.stroke, strokeWidth: 2, stroke: 'white' }}
            />
            <Tooltip
              formatter={(value: number) => [`${value}점`, '점수']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '11px'
              }}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-64 w-full items-center justify-center">
          {emptyState ?? (
            <ChartEmptyState description="데이터가 없어 레이더 차트를 표시할 수 없습니다. 응답을 수집하거나 다른 조건을 선택해 주세요." />
          )}
        </div>
      )}
    </div>
  );
};
