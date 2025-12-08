import { ReactNode, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartEmptyState } from './ChartEmptyState';

interface GaugeChartProps {
  value: number;
  maxValue?: number;
  title?: string;
  subtitle?: string;
  size?: number;
  thickness?: number;
  colors?: {
    background?: string;
    fill?: string;
    text?: string;
  };
  emptyState?: ReactNode;
}

export const GaugeChart = ({
  value,
  maxValue = 100,
  title,
  subtitle,
  size = 200,
  thickness = 20,
  colors = {
    background: 'hsl(var(--muted) / 0.3)',
    fill: 'hsl(var(--chart-1))',
    text: 'hsl(var(--foreground))'
  },
  emptyState
}: GaugeChartProps) => {
  const normalizedValue = useMemo(() => {
    if (!Number.isFinite(value)) return null;
    if (!Number.isFinite(maxValue) || maxValue <= 0) return null;
    return Math.min(Math.max(value, 0), maxValue);
  }, [value, maxValue]);

  if (normalizedValue === null) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {emptyState ?? (
          <ChartEmptyState description="게이지를 표시할 데이터가 없습니다. 측정 가능한 값을 추가한 후 다시 시도해 주세요." />
        )}
      </div>
    );
  }

  const percentage = (normalizedValue / maxValue) * 100;

  const data = [
    { name: 'filled', value: percentage, color: colors.fill },
    { name: 'empty', value: 100 - percentage, color: colors.background }
  ];

  const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h3 className="mb-2 text-sm sm:text-base md:text-lg font-semibold" style={{ color: colors.text }}>
          {title}
        </h3>
      )}

      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="90%"
              startAngle={180}
              endAngle={0}
              innerRadius={size / 2 - thickness}
              outerRadius={size / 2}
              dataKey="value"
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? `url(#${gradientId})` : entry.color}
                  stroke="white"
                  strokeWidth={index === 0 ? 2 : 0}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 transform text-center"
          style={{ color: colors.text }}
        >
          <div className="text-xl sm:text-2xl font-bold">{normalizedValue.toFixed(1)}</div>
          {subtitle && (
            <div className="text-xs sm:text-sm text-muted-foreground">{subtitle}</div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0">
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = 180 - (tick / 100) * 180;
            const radian = (angle * Math.PI) / 180;
            const innerRadius = size / 2 - thickness - 5;
            const outerRadius = size / 2 - thickness;

            const x1 = size / 2 + innerRadius * Math.cos(radian);
            const y1 = size / 2 + innerRadius * Math.sin(radian);
            const x2 = size / 2 + outerRadius * Math.cos(radian);
            const y2 = size / 2 + outerRadius * Math.sin(radian);

            return (
              <div key={tick}>
                <svg className="absolute inset-0" width={size} height={size / 2 + 20}>
                  <line
                    x1={x1}
                    y1={y1 + 10}
                    x2={x2}
                    y2={y2 + 10}
                    stroke={colors.text}
                    strokeWidth="1"
                    opacity="0.5"
                  />
                </svg>

                <div
                  className="absolute text-xs"
                  style={{
                    left: x1 - 8,
                    top: y1 + 5,
                    color: colors.text,
                    opacity: 0.7
                  }}
                >
                  {((tick * maxValue) / 100).toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
