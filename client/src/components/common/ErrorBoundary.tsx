import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-surface-background flex items-center justify-center p-6">
          <div className="card max-w-lg w-full text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-accent-danger" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h1>
            <p className="text-text-muted text-sm mb-6">
              An unexpected error occurred. Please try reloading the page.
            </p>

            {isDev && this.state.error && (
              <div className="bg-surface-elevated rounded-md p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-accent-danger mb-1">
                  {this.state.error.name}
                </p>
                <p className="text-xs text-text-muted mb-2">{this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-xs text-text-muted overflow-auto max-h-48 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <button onClick={this.handleReload} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw size={16} />
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
