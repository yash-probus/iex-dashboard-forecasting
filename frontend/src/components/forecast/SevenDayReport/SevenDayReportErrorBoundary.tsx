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

export class SevenDayReportErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SevenDayReportErrorBoundary] Caught error:", error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[360px] bg-card rounded-2xl border border-destructive/20 shadow-sm">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Report Error</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-5">
            An unexpected error occurred while generating the 7-day performance report.
            {this.state.error?.message ? ` (${this.state.error.message})` : ""}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" /> Retry Report
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
