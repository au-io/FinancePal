import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle size={20} />
              <h3 className="font-medium">Component Error</h3>
            </div>
            <p className="text-sm text-gray-600">
              {this.props.componentName 
                ? `The ${this.props.componentName} couldn't be displayed.` 
                : "This component couldn't be displayed."}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary componentName={componentName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}