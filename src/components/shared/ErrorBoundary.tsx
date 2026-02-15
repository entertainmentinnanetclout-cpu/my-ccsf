import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw } from 'lucide-react';
import ccsfLogo from '@/assets/ccsf-logo.png';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, hsl(0 72% 51%) 0%, hsl(0 84% 40%) 50%, hsl(0 72% 35%) 100%)' }}>
          <div className="text-center max-w-md">
            <img src={ccsfLogo} alt="CCSF Logo" className="h-20 w-20 mx-auto mb-6 drop-shadow-lg" />
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold text-white">Something Went Wrong</h1>
            </div>
            <p className="text-white/80 mb-6">
              An unexpected error occurred. Please try again or contact support if the issue persists.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                variant="secondary"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
