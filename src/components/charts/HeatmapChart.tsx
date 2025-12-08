import { ReactNode, useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import { ChartEmptyState } from './ChartEmptyState';

interface HeatmapData {
  x: string;
  y: string;
  value: number;
  label?: string;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colorScale?: [string, string];
  emptyState?: ReactNode;
}

const parseHSL = (hslString: string) => {
  const match = hslString.match(/hsl\(var\(--(\w+)\)\)/);
  if (match) {
    return { h: 210, s: 50, l: 50 };
  }

  const values = hslString.match(/\d+/g);
  if (values && values.length >= 3) {
    return {
      h: parseInt(values[0]),
      s: parseInt(values[1]),
      l: parseInt(values[2])
    };
  }
  return { h: 210, s: 50, l: 50 };
};

export const HeatmapChart = ({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  colorScale = ['hsl(var(--muted) / 0.3)', 'hsl(var(--chart-1))'],
  emptyState
}: HeatmapChartProps) => {
  const hasData = useMemo(
    () => data && data.length > 0 && data.some(item => item.value !== 0),
    [data]
  );

  const xValues = useMemo(() => [...new Set(data.map(d => d.x))], [data]);
  const yValues = useMemo(() => [...new Set(data.map(d => d.y))], [data]);

  const maxValue = useMemo(() => (data.length > 0 ? Math.max(...data.map(d => d.value)) : 0), [data]);
  const minValue = useMemo(() => (data.length > 0 ? Math.min(...data.map(d => d.value)) : 0), [data]);

  const getColor = (value: number) => {
    if (maxValue === minValue) return colorScale[0];
    const intensity = (value - minValue) / (maxValue - minValue);

    const minHSL = parseHSL(colorScale[0]);
    const maxHSL = parseHSL(colorScale[1]);

    const h = minHSL.h + (maxHSL.h - minHSL.h) * intensity;
    const s = minHSL.s + (maxHSL.s - minHSL.s) * intensity;
    const l = minHSL.l + (maxHSL.l - minHSL.l) * intensity;

    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  const cellWidth = xValues.length > 0 ? 100 / xValues.length : 0;
  const cellHeight = yValues.length > 0 ? 100 / yValues.length : 0;

  return (
    <div className="h-full w-full">
      {title && (
        <h3 className="mb-2 sm:mb-4 text-center text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      )}

      {hasData ? (
        <div className="relative h-full w-full min-h-[300px]">
          {yAxisLabel && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 transform">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{yAxisLabel}</span>
            </div>
          )}

          <div className="ml-6 sm:ml-8 mb-6 sm:mb-8 h-full">
            <div className="relative h-full w-full">
              <div className="absolute left-0 top-0 flex h-full flex-col justify-between pr-1 sm:pr-2">
                {yValues.map(y => (
                  <div key={y} className="flex h-full items-center text-[10px] sm:text-xs text-muted-foreground">
                    {y}
                  </div>
                ))}
              </div>

              <div className="ml-8 sm:ml-12 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <svg viewBox="0 0 100 100" className="h-full w-full rounded border border-border">
                    {data.map((item, index) => {
                      const xIndex = xValues.indexOf(item.x);
                      const yIndex = yValues.indexOf(item.y);

                      return (
                        <g key={index}>
                          <rect
                            x={xIndex * cellWidth}
                            y={yIndex * cellHeight}
                            width={cellWidth}
                            height={cellHeight}
                            fill={getColor(item.value)}
                            stroke="white"
                            strokeWidth="0.5"
                            rx="1"
                            ry="1"
                            className="cursor-pointer transition-all duration-200 hover:stroke-2 hover:opacity-80"
                          />
                          <text
                            x={xIndex * cellWidth + cellWidth / 2}
                            y={yIndex * cellHeight + cellHeight / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="3"
                            fill="white"
                            fontWeight="bold"
                          >
                            {item.label || item.value}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </ResponsiveContainer>

                <div className="mt-1 sm:mt-2 flex justify-between">
                  {xValues.map(x => (
                    <div key={x} className="flex-1 text-center text-[10px] sm:text-xs text-muted-foreground">
                      {x}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {xAxisLabel && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 transform">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{xAxisLabel}</span>
            </div>
          )}

          <div className="absolute right-0 top-0 flex flex-col items-center">
            <div className="mb-1 text-[10px] sm:text-xs text-muted-foreground">값</div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] sm:text-xs text-muted-foreground">{maxValue}</div>
              <div
                className="h-10 sm:h-12 w-3 sm:w-4 rounded"
                style={{ background: `linear-gradient(to top, ${colorScale[0]}, ${colorScale[1]})` }}
              />
              <div className="text-[10px] sm:text-xs text-muted-foreground">{minValue}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 w-full items-center justify-center">
          {emptyState ?? (
            <ChartEmptyState description="히트맵을 표시할 데이터가 없습니다. 필터를 변경하거나 데이터를 수집한 후 다시 확인해 주세요." />
          )}
        </div>
      )}
    </div>
  );
};
