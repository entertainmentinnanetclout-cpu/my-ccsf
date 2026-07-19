import type { FormEvent } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { InstitutionalAuthFrame } from '@/components/auth/InstitutionalAuthFrame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PilotAuthView = 'login' | 'forgot-password';

export function PilotAuthInstitutionalView({
  view,
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleView,
  onOfficialPortal,
}: {
  view: PilotAuthView;
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleView: () => void;
  onOfficialPortal: () => void;
}) {
  return (
    <InstitutionalAuthFrame
      mode="pilot"
      eyebrow="Controlled Pilot Mode"
      title="Institutional access for controlled CCSF testing"
      description="Use your existing CCSF credentials. Your verified role opens the correct student, campus-security or super-admin Pilot workspace."
    >
      <Button variant="ghost" className="mb-6 -ml-3" onClick={onOfficialPortal}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Official portal
      </Button>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 pt-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#002F6C] dark:text-[#F2A900]">Secure account access</p>
          <CardTitle className="mt-2 text-2xl sm:text-3xl">{view === 'login' ? 'Pilot sign in' : 'Recover your account'}</CardTitle>
          <CardDescription className="text-sm leading-6">
            {view === 'login'
              ? 'Enter the same email and password used for the official CCSF application.'
              : 'Enter the email linked to your existing CCSF account.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0">
          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="pilot-email">Email address</Label>
              <Input
                id="pilot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="name@example.com"
                className="h-12"
                required
              />
            </div>

            {view === 'login' && (
              <div className="space-y-2">
                <Label htmlFor="pilot-password">Password</Label>
                <Input
                  id="pilot-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="h-12"
                  required
                />
              </div>
            )}

            <Button type="submit" className="h-12 w-full bg-gradient-to-r from-[#002F6C] to-[#0055A5] text-base font-bold text-white shadow-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {view === 'login' ? 'Enter Pilot Mode' : 'Send recovery email'}
            </Button>
          </form>

          <Button variant="link" className="mt-3 w-full text-[#002F6C] dark:text-[#F2A900]" onClick={onToggleView}>
            {view === 'login' ? 'Forgot your password?' : 'Back to Pilot sign in'}
          </Button>

          <div className="mt-6 rounded-2xl border border-border bg-muted/45 p-4 text-xs leading-5 text-muted-foreground">
            Student accounts require an active Pilot programme. Security accounts require a verified campus assignment. Admin accounts open the super-admin Pilot console.
          </div>
        </CardContent>
      </Card>
    </InstitutionalAuthFrame>
  );
}
