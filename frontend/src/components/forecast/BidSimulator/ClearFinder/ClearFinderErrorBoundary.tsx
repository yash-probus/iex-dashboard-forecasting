import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ClearFinderErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ClearFinderErrorBoundary] Error caught:", error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-card rounded-2xl border border-destructive/20 shadow-sm">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <AlertTriangle className="size-6" />
          </div>
          <h4 className="text-base font-semibold text-foreground mb-1">Clear Finder Error</h4>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            An unexpected error occurred while analyzing block clearing likelihood.
            {this.state.error?.message ? ` (${this.state.error.message})` : ""}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3" /> Retry Analysis
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
