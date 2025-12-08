import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ResponsiveChartWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
  mobileHeight?: number;
  desktopHeight?: number;
  showLegendOnMobile?: boolean;
}

/**
 * 모바일 환경에 최적화된 차트 래퍼 컴포넌트
 * 자동으로 모바일/데스크톱 환경을 감지하여 적절한 높이와 여백을 적용합니다.
 */
export function ResponsiveChartWrapper({
  children,
  title,
  description,
  mobileHeight = 250,
  desktopHeight = 350,
  showLegendOnMobile = false,
}: ResponsiveChartWrapperProps) {
  const isMobile = useIsMobile();

  if (title || description) {
    return (
      <Card>
        {(title || description) && (
          <CardHeader className={isMobile ? 'p-4 pb-2' : undefined}>
            {title && <CardTitle className={isMobile ? 'text-base' : undefined}>{title}</CardTitle>}
            {description && <CardDescription className={isMobile ? 'text-xs' : undefined}>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent 
          className={isMobile ? 'p-2 pt-0' : undefined}
          style={{ height: isMobile ? mobileHeight : desktopHeight }}
        >
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <div style={{ height: isMobile ? mobileHeight : desktopHeight }}>
      {children}
    </div>
  );
}

/**
 * 모바일 환경을 위한 차트 설정 헬퍼
 */
export function getMobileChartMargins(isMobile: boolean) {
  return {
    top: isMobile ? 5 : 10,
    right: isMobile ? 5 : 30,
    left: isMobile ? -15 : 0,
    bottom: isMobile ? 5 : 10,
  };
}

export function getMobileAxisProps(isMobile: boolean) {
  return {
    tick: { 
      fontSize: isMobile ? 10 : 12,
      fill: 'hsl(var(--muted-foreground))'
    },
  };
}

export function getMobileTooltipProps(isMobile: boolean) {
  return {
    contentStyle: {
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '6px',
      fontSize: isMobile ? '11px' : '14px',
      padding: isMobile ? '6px 8px' : '8px 12px',
    },
  };
}
