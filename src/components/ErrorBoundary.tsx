import React, { Component, ErrorInfo, ReactNode } from 'react';
import { auditService } from '@/services/auditService';
import { runtimeDebugContext } from '@/services/runtimeDebugContext';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Capture memory if available
    const memory = (performance as any).memory;

    // Log to audit system with runtime context snapshot
    auditService.logApiError({
      api_endpoint: 'ui/error',
      error_message: error.message,
      error_details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        route: window.location.pathname,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        memory: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        } : null,
        viewerState: runtimeDebugContext.getSnapshot(),
      },
      response_status: 0,
    }).catch(err => {
      console.error('[ErrorBoundary] Failed to log error:', err);
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. The error has been logged and our team will investigate.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left bg-muted p-4 rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                <pre className="text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} className="mt-4">
              Return to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
