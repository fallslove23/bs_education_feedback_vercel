import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RepositoryErrorBoundaryProps {
  children: React.ReactNode;
  repositoryName?: string;
  onRetry?: () => void;
}

interface RepositoryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class RepositoryErrorBoundary extends React.Component<
  RepositoryErrorBoundaryProps,
  RepositoryErrorBoundaryState
> {
  constructor(props: RepositoryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): RepositoryErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    console.error(`[RepositoryErrorBoundary] ${this.props.repositoryName || 'Repository'} error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>데이터 로드 오류</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                {this.props.repositoryName || 'Repository'} 데이터를 불러오는 중 오류가 발생했습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                오류: {this.state.error?.message}
              </p>
              {this.props.onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.handleRetry}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  다시 시도
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