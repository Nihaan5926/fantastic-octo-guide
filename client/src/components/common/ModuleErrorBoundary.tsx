import React from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleErrorBoundaryProps {
  children: React.ReactNode;
  moduleName: string;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ModuleErrorBoundary extends React.Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ModuleErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ModuleErrorBoundary] ${this.props.moduleName}:`, error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="card border-accent-danger/30 bg-accent-danger/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-accent-danger/20 text-accent-danger shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                Module Error — {this.props.moduleName}
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                This module encountered an unexpected error. You can try reloading the module below.
              </p>

              {isDev && this.state.error && (
                <div className="mb-4">
                  <button
                    onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Error Details
                  </button>
                  {this.state.showDetails && (
                    <div className="mt-2 bg-bg-tertiary rounded-lg p-3 text-left">
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
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={this.handleReload} className="btn-primary inline-flex items-center gap-2">
                  <RefreshCw size={14} />
                  Reload Module
                </button>
                <button onClick={this.handleRetry} className="btn-secondary inline-flex items-center gap-2">
                  <RefreshCw size={14} />
                  Full Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
