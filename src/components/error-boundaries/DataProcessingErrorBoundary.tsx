import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataProcessingErrorBoundaryProps {
  children: React.ReactNode;
  dataSource?: string;
  onDataRefresh?: () => void;
  fallbackData?: any;
}

interface DataProcessingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  processingStage?: string;
}

export class DataProcessingErrorBoundary extends React.Component<
  DataProcessingErrorBoundaryProps,
  DataProcessingErrorBoundaryState
> {
  constructor(props: DataProcessingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DataProcessingErrorBoundaryState {
    // Try to identify the processing stage from error message
    let processingStage = '데이터 처리';
    if (error.message.includes('chart') || error.message.includes('Chart')) {
      processingStage = '차트 렌더링';
    } else if (error.message.includes('parse') || error.message.includes('Parse')) {
      processingStage = '데이터 파싱';
    } else if (error.message.includes('transform')) {
      processingStage = '데이터 변환';
    } else if (error.message.includes('NaN') || error.message.includes('Invalid')) {
      processingStage = '데이터 검증';
    }

    return {
      hasError: true,
      error,
      processingStage,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[DataProcessingErrorBoundary] ${this.props.dataSource || 'Data processing'} error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, processingStage: undefined });
    this.props.onDataRefresh?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <Database className="h-4 w-4" />
            <AlertTitle>데이터 처리 오류</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                {this.props.dataSource || '데이터'} {this.state.processingStage} 중 오류가 발생했습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                오류: {this.state.error?.message}
              </p>
              <div className="text-xs text-muted-foreground">
                <p>처리 단계: {this.state.processingStage}</p>
                {this.props.fallbackData && <p>폴백 데이터 사용 가능</p>}
              </div>
              {this.props.onDataRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.handleRetry}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  데이터 새로고침
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}