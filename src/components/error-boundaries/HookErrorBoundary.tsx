import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bug, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HookErrorBoundaryProps {
  children: React.ReactNode;
  hookName?: string;
  fallback?: React.ReactNode;
}

interface HookErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class HookErrorBoundary extends React.Component<
  HookErrorBoundaryProps,
  HookErrorBoundaryState
> {
  constructor(props: HookErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<HookErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[HookErrorBoundary] ${this.props.hookName || 'Hook'} error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined,
      retryCount: prevState.retryCount + 1 
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4">
          <Alert variant="destructive">
            <Bug className="h-4 w-4" />
            <AlertTitle>Hook 실행 오류</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                {this.props.hookName || 'Hook'} 실행 중 오류가 발생했습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                오류: {this.state.error?.message}
              </p>
              <p className="text-xs text-muted-foreground">
                재시도 횟수: {this.state.retryCount}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleRetry}
                className="mt-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}