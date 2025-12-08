import React from 'react';
import { ChartEmptyState } from './ChartEmptyState';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallbackDescription?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): ChartErrorBoundaryState {
    return { hasError: true, message: error?.message || '차트 렌더링 중 오류가 발생했습니다.' };
  }

  componentDidCatch(error: any, info: any) {
    // Log for debugging
    console.error('[ChartErrorBoundary] error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-64 w-full items-center justify-center">
          <ChartEmptyState
            title="Chart error"
            description={this.props.fallbackDescription || '데이터 형식 문제로 차트를 표시할 수 없습니다.'}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
