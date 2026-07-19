import type { FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, LockKeyhole, MapPin, Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { PILOT_WARNING } from '@/config/pilot';

type PilotAuthView = 'login' | 'forgot-password';

export function PilotAuthInstitutionalView({
  theme,
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
  theme?: string;
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
    <div className="min-h-screen border-t-4 border-t-[#F2A900] bg-background text-foreground">
      <header className="border-b border-border bg-background/95 shadow-soft backdrop-blur-xl dark:bg-[#002F6C]/95">
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <InstitutionBrand size="header" themeOverride={theme} />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#002F6C] dark:text-white" />
                <h1 className="text-base font-bold text-[#002F6C] dark:text-white sm:text-xl">Campus Safety Forum</h1>
              </div>
              <p className="text-xs font-semibold text-muted-foreground dark:text-white/80 sm:text-sm">CCSF Controlled Pilot Access</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="border-b-4 border-b-[#002F6C] bg-[#F2A900] px-4 py-3 text-center sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#002F6C] sm:text-sm">
          Tshwane University of Technology · Controlled Testing Environment
        </p>
      </section>

      <main className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,47,108,0.10),transparent_36rem)]" />

        <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_32px_90px_-50px_rgba(0,47,108,0.9)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative flex flex-col justify-between overflow-hidden bg-[#002F6C] p-7 text-white sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_48%,rgba(242,169,0,0.10))]" />
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F2A900]/50 bg-[#F2A900]/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]">
                <ShieldCheck className="h-4 w-4" /> Controlled Pilot Mode
              </div>
              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Institutional access for controlled CCSF testing
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                Use your existing CCSF credentials. Your verified role opens the correct student, campus-security or super-admin Pilot workspace.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <AccessPoint icon={ShieldCheck} title="Role verified" description="Existing account permissions remain authoritative." />
                <AccessPoint icon={MapPin} title="Campus scoped" description="Campus teams only see authorised Pilot information." />
                <AccessPoint icon={CheckCircle2} title="Pilot isolated" description="Simulation data remains outside production cases." />
                <AccessPoint icon={LockKeyhole} title="No public signup" description="Only approved existing accounts may enter." />
              </div>
            </div>

            <div className="relative mt-10 rounded-2xl border border-[#F2A900]/45 bg-[#F2A900]/10 p-4 text-sm text-white">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#F2A900]" />
                <div>
                  <p className="font-bold text-[#F2A900]">Simulation only</p>
                  <p className="mt-1 leading-6 text-white/80">{PILOT_WARNING}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card p-7 sm:p-10 lg:p-12">
            <Button variant="ghost" className="mb-6 -ml-3" onClick={onOfficialPortal}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Official portal
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
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="pilot-email">Email address</Label>
                    <Input
                      id="pilot-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => onEmailChange(event.target.value)}
                      placeholder="name@example.com"
                      className="h-12"
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
                      />
                    </div>
                  )}

                  <Button type="submit" className="h-12 w-full bg-gradient-to-r from-[#002F6C] to-[#0055A5] text-base font-bold text-white shadow-lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {view === 'login' ? 'Enter Pilot Mode' : 'Send recovery email'}
                  </Button>
                </form>

                <Button variant="link" className="mt-3 w-full text-[#002F6C] dark:text-[#F2A900]" onClick={onToggleView}>
                  {view === 'login' ? 'Forgot your password?' : 'Back to Pilot sign in'}
                </Button>

                <div className="mt-6 rounded-2xl border border-border bg-muted/45 p-4 text-xs leading-5 text-muted-foreground">
                  Student accounts must be invited to an active Pilot programme. Security accounts require a campus assignment. Admin accounts open the super-admin Pilot console.
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

function AccessPoint({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-[#F2A900]" />
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-white/70">{description}</p>
    </div>
  );
}
