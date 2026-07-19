import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

type Props = { children: ReactNode };
type State = { hasError: boolean; reference: string };

function createReference(): string {
  return `CCSF-${Date.now().toString(36).toUpperCase()}`;
}

export class ApplicationErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reference: '' };

  static getDerivedStateFromError(): State {
    return { hasError: true, reference: createReference() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CCSF application render failure', {
      reference: this.state.reference,
      error,
      componentStack: info.componentStack,
    });
  }

  private retry = () => {
    this.setState({ hasError: false, reference: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4" role="main">
        <Card className="w-full max-w-xl border-destructive/30 shadow-large">
          <CardHeader className="items-center text-center">
            <InstitutionBrand size="header" />
            <div className="mt-3 rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
            </div>
            <CardTitle>We could not display this screen</CardTitle>
            <CardDescription>
              Your account data was not changed. Retry the screen, or return to the portal home.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              Support reference: <span className="font-mono font-semibold">{this.state.reference}</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={this.retry} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry screen
              </Button>
              <Button variant="outline" onClick={() => window.location.assign('/')} className="gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                Portal home
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
}
