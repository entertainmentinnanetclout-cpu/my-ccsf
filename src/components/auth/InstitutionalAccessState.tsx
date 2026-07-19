import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND } from '@/brand';

export function InstitutionalLoadingState({ label = 'Verifying your CCSF account…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center border-t-4 border-t-[#F2A900] bg-background px-4" role="status" aria-live="polite">
      <div className="text-center">
        <InstitutionBrand size="auth" className="justify-center" />
        <Loader2 className="mx-auto mt-8 h-8 w-8 animate-spin text-[#002F6C] dark:text-[#F2A900]" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function InstitutionalAccessError({
  title = 'Account verification required',
  description,
  onRetry,
  onSignOut,
  icon: Icon = AlertCircle,
}: {
  title?: string;
  description: string;
  onRetry: () => void;
  onSignOut: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center border-t-4 border-t-[#F2A900] bg-background px-4 py-10">
      <Card className="w-full max-w-xl border-primary/20 shadow-large">
        <CardHeader className="text-center">
          <InstitutionBrand size="auth" className="mb-5 justify-center" />
          <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-3">
            <Icon className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mx-auto max-w-md leading-6">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Retry verification</Button>
            <Button className="flex-1" variant="outline" onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" aria-hidden="true" />Sign out</Button>
          </div>
          <p className="text-center text-xs font-semibold text-muted-foreground">{BRAND.productLongName} · {BRAND.institutionName}</p>
        </CardContent>
      </Card>
    </div>
  );
}
